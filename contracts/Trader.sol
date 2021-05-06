// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import "./Interfaces/ITracerPerpetualSwaps.sol";
import "./Interfaces/Types.sol";
import "./Interfaces/ITrader.sol";

import "./lib/LibPerpetuals.sol";

/**
 * The Trader contract is used to validate and execute off chain signed and matched orders
 */
contract Trader is ITrader {
    // EIP712 Constants
    // https://eips.ethereum.org/EIPS/eip-712
    string private constant EIP712_DOMAIN_NAME = "Tracer Protocol";
    string private constant EIP712_DOMAIN_VERSION = "1.0";
    bytes32 private constant EIP712_DOMAIN_SEPERATOR =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    // EIP712 Types
    bytes32 private constant ORDER_TYPE =
        keccak256(
            "Order(address maker,uint256 amount,int256 price,uint256 filled,bool side,uint256 expiration,uint256 created,address market)"
        );

    uint256 public override constant chainId = 1337; // Changes per chain
    bytes32 public override immutable EIP712_DOMAIN;

    // Trader => nonce
    mapping(address => uint256) public nonces; // Prevents replay attacks

    // Order hash to memory
    mapping(bytes32 => Perpetuals.Order) public orders;
    mapping(bytes32 => uint256) public filled;

    event Verify(address sig);
    event CheckOrder(uint256 amount, int256 price, bool side, address user, uint256 expiration, address market);

    constructor() {
        // Construct the EIP712 Domain
        EIP712_DOMAIN = keccak256(
            abi.encode(
                EIP712_DOMAIN_SEPERATOR,
                keccak256(bytes(EIP712_DOMAIN_NAME)),
                keccak256(bytes(EIP712_DOMAIN_VERSION)),
                chainId,
                address(this)
            )
        );
    }

    /**
     * @notice Batch executes maker and taker orders against a given market. Currently matching works
     *         by matching orders 1 to 1
     * @param makers An array of signed make orders
     * @param takers An array of signed take orders
     * @param market The market to execute the trade in
     */
    function executeTrade(
        Types.SignedLimitOrder[] memory makers,
        Types.SignedLimitOrder[] memory takers,
        address market
    ) external override {
        require(makers.length == takers.length, "TDR: Lengths differ");

        // safe as we've already bounds checked the array lengths
        uint256 n = makers.length;

        require(n > 0, "TDR: Received empty arrays");

        for (uint256 i = 0; i < n; i++) {
            // retrieve orders and verify their signatures
            // if the order does not exist, it is created here
            Perpetuals.Order storage makeOrder = grabOrder(makers, i, market);
            Perpetuals.Order storage takeOrder = grabOrder(takers, i, market);

            require(makeOrder.market == market, "TDR: makeOrder market != supplied market");
            require(takeOrder.market == market, "TDR: takeOrder market != supplied market");

            address maker = makers[i].order.maker;
            address taker = takers[i].order.maker;

            uint256 makeOrderFilled = filled[Perpetuals.orderId(makeOrder)];
            uint256 takeOrderFilled = filled[Perpetuals.orderId(takeOrder)];

            // calc fill amount
            uint256 makeRemaining = makeOrder.amount - makeOrderFilled;
            uint256 takeRemaining = takeOrder.amount - takeOrderFilled;
            // fill amount is the minimum of order 1 and order 2
            uint256 fillAmount = makeRemaining > takeRemaining ? takeRemaining : makeRemaining;

            // match orders
            ITracerPerpetualSwaps(market).matchOrders(makeOrder, takeOrder, fillAmount);

            // update order state
            filled[Perpetuals.orderId(makeOrder)] = makeOrderFilled + fillAmount;
            filled[Perpetuals.orderId(takeOrder)] = takeOrderFilled + fillAmount;

            // increment nonce if filled
            bool completeMaker = makeOrderFilled == makeOrder.amount;
            bool completeTaker = takeOrderFilled == takeOrder.amount;

            // check if we need to increment maker's nonce
            if (completeMaker) {
                nonces[maker]++;
            }

            // check if we need to increment taker's nonce
            if (completeTaker) {
                nonces[taker]++;
            }
        }
    }

    /**
     * @notice Retrieves and validates an order from an order array
     * @param signedOrders an array of signed orders
     * @param index the index into the array where the desired order is
     * @return the specified order
     * @dev Performs its own bounds check on the array access
     */
    function grabOrder(
        Types.SignedLimitOrder[] memory signedOrders,
        uint256 index,
        address market
    ) internal returns (Perpetuals.Order storage) {
        require(index <= signedOrders.length, "TDR: Out of bounds access");

        Types.SignedLimitOrder memory signedOrder = signedOrders[index];

        // verify signature and nonce
        verify(signedOrder.order.maker, signedOrder);

        bytes32 orderHash = hashOrder(signedOrder.order);
        // check if order exists on chain, if not, create it
        if (orders[orderHash].maker == address(0)) {
            // store this order to keep track of state
            Perpetuals.Order storage newOrder = orders[orderHash];
            newOrder.maker = signedOrder.order.maker;
            newOrder.amount = signedOrder.order.amount;
            newOrder.price = signedOrder.order.price;
            newOrder.side = signedOrder.order.side;
            newOrder.expires = signedOrder.order.expires;
            newOrder.created = block.timestamp;
            newOrder.market = market;
        }

        return orders[orderHash];
    }

    /**
     * @notice hashes a limit order type in order to verify signatures, per EIP712
     * @param order the limit order being hashed
     * @return an EIP712 compliant hash (with headers) of the limit order
     */
    function hashOrder(Perpetuals.Order memory order) public view override returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    EIP712_DOMAIN,
                    keccak256(
                        abi.encode(
                            ORDER_TYPE,
                            order.maker,
                            order.amount,
                            order.price,
                            order.side,
                            order.expires,
                            order.created,
                            order.market
                        )
                    )
                )
            );
    }

    /**
     * @notice Gets the EIP712 domain hash of the contract
     */
    function getDomain() external view override returns (bytes32) {
        return EIP712_DOMAIN;
    }

    /**
     * @notice Verifies a given limit order has been signed by a given signer and has a correct nonce
     * @param signer The signer who is being verified against the order
     * @param signedOrder The signed order to verify the signature of
     * @return true is signer has signed the order as given by the signature components
     *         and if the nonce of the order is correct else false.
     */
    function verify(
        address signer,
        Types.SignedLimitOrder memory signedOrder
    ) public view override returns (bool) {
        require(
            verifySignature(signer, signedOrder.order, signedOrder.sigR, signedOrder.sigS, signedOrder.sigV),
            "TDR: Signature verification failed"
        );
        require(verifyNonce(signedOrder), "TDR: Incorrect nonce");
        return true;
    }

    /**
     * @notice Verifies the signature component of a signed order
     * @param signer The signer who is being verified against the order
     * @param order The unsigned order to verify the signature of
     * @param sigR R component of the signature
     * @param sigS S component of the signature
     * @param sigV V component of the signature
     * @return true is signer has signed the order, else false
     */
    function verifySignature(
        address signer,
        Perpetuals.Order memory order,
        bytes32 sigR,
        bytes32 sigS,
        uint8 sigV
    ) public view override returns (bool) {
        return signer == ecrecover(hashOrder(order), sigV, sigR, sigS);
    }

    /**
     * @notice Verifies that the nonce of a order is the current user nonce
     * @param signedOrder The order being verified
     */
    function verifyNonce(Types.SignedLimitOrder memory signedOrder) public view override returns (bool) {
        return signedOrder.nonce == nonces[signedOrder.order.maker];
    }

    /**
     * @return An order that has been previously created in contract, given a user-supplied order
     * @dev Useful for checking to see if a supplied order has actually been created
     */
    function getOrder(Perpetuals.Order memory order) public view override returns (Perpetuals.Order memory) {
        return orders[hashOrder(order)];
    }
}
