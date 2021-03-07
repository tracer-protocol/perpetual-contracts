// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >= 0.6.0;
pragma experimental ABIEncoderV2;

import "./Interfaces/ITracer.sol";
import "./Interfaces/Types.sol";

/**
 * The Trader contract is used to validate and execute off chain signed and matched orders
 */
contract Trader {
    // EIP712 Constants
    // https://eips.ethereum.org/EIPS/eip-712
    string private constant EIP712_DOMAIN_NAME = "Tracer Protocol";
    string private constant EIP712_DOMAIN_VERSION = "1.0";
    bytes32 private constant EIP712_DOMAIN_SEPERATOR = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    // EIP712 Types
    bytes32 private constant LIMIT_ORDER_TYPE = keccak256(
        "LimitOrder(uint256 amount,int256 price,bool side,address user,uint256 expiration,address targetTracer,uint256 nonce)"
    );

    uint256 constant chainId = 1337; // Changes per chain
    bytes32 public immutable EIP712_DOMAIN;
    // Trader => nonce
    mapping(address => uint256) public nonce; // Prevents replay attacks

    event Verify(address sig);
    event CheckOrder(uint256 amount, int256 price, bool side, address user, uint256 expiration, address targetTracer);

    constructor() public {
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
     *         by fully matching a single take order with N make orders, and then moving to the next take
     *         order.
     * @param makerOrders An array of signed make orders
     * @param takerOrders An array of signed take orders
     * @param market The market to execute the trade in
     */
    function executeTrade(
        Types.SignedLimitOrder[] memory makerOrders,
        Types.SignedLimitOrder[] memory takerOrders,
        address market
    ) external {
        /* bounds check the size of each order array */
        require(makerOrders.length == takerOrders.length,
            "TDR: Mismatched sides");

        ITracer tracer = ITracer(market);
        // Take from make and match with take until fully matched
        uint256 latestTake = 0;

        /* we can do this due to our earlier bounds check on lengths */
        uint256 numOrders = makerOrders.length;        

        /* iterate through BOTH order arrays, matching pairwise */
        for (uint256 i = 0; i < numOrders; i++) {
            /* get current make order */
            Types.LimitOrder memory currentMake = grabOrder(makerOrders, i);

            uint256 filled = 0;
            uint256 orderId = tracer.permissionedMakeOrder(
                currentMake.amount,
                currentMake.price,
                currentMake.side,
                currentMake.expiration,
                currentMake.user
            );

            // Increment nonce
            nonce[currentMake.user]++;
            
            /* get current take order */    
            Types.LimitOrder memory currentTake = grabOrder(takerOrders, i);

            //Order matching validation
            require(currentTake.price == currentMake.price,
                "TDR: price mismatch");

            if (currentTake.amount + filled > currentMake.amount) {
                //Dont bother taking order, order already over filled.
                latestTake = i;
                break;
            } else {
                tracer.permissionedTakeOrder(orderId, currentTake.amount,
                    currentTake.user);
                filled += currentTake.amount;
                //Increment nonce
                nonce[currentTake.user]++;
            }
        }
    }

    /**
     * @notice Retrieves and validates an order from an order array
     * @param orders an array of orders
     * @param index the index into the array where the desired order is
     * @return the specified order
     * @dev Performs its own bounds check on the array access
     */
    function grabOrder(
        Types.SignedLimitOrder[] memory orders,
        uint256 index
    ) internal view returns (Types.LimitOrder memory) {
            require(index <= orders.length, "TDR: Out of bounds access");

            Types.SignedLimitOrder memory currentSigned = orders[index];
            
            /* verify signature and nonce */
            require(
                verify(
                    currentSigned.order.user,
                    currentSigned.order,
                    currentSigned.sigR,
                    currentSigned.sigS,
                    currentSigned.sigV
                ),
                "TDR: incorrect order sig or nonce"
            );

            return currentSigned.order;
    }

    /**
    * @notice hashes a limit order type in order to verify signatures
    * @param order the limit order being hashed
    * @return an EIP712 compliant hash (with headers) of the limit order
    */
    function hashOrder(Types.LimitOrder memory order) public view returns (bytes32) {
        return
        keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    EIP712_DOMAIN,
                    keccak256(
                        abi.encode(
                            LIMIT_ORDER_TYPE,
                            order.amount,
                            order.price,
                            order.side,
                            order.user,
                            order.expiration,
                            order.targetTracer,
                            order.nonce
                        )
                    )
            )
        );
    }

    /**
     * @notice Gets the EIP712 domain hash of the contract
     */
    function getDomain() external view returns (bytes32) {
        return EIP712_DOMAIN;
    }

    /**
    * @notice Verifies a given limit order has been signed by a given signer and has a correct nonce
    * @param signer The signer who is being verified against the order
    * @param order The unsigned order to verify the signature of
    * @param sigR R component of the signature
    * @param sigS S component of the signature
    * @param sigV V component of the signature
    * @return true is signer has signed the order as given by the signature components
    *         and if the nonce of the order is correct else false.
    */
    function verify(
        address signer,
        Types.LimitOrder memory order,
        bytes32 sigR,
        bytes32 sigS,
        uint8 sigV
    ) public view returns (bool) {
        return verifySignature(signer, order, sigR, sigS, sigV) && verifyNonce(order);
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
        Types.LimitOrder memory order,
        bytes32 sigR,
        bytes32 sigS,
        uint8 sigV
    ) public view returns (bool) {
        return signer == ecrecover(hashOrder(order), sigV, sigR, sigS);
    }

    /**
     * @notice Verifies that the nonce of a order is the current user nonce
     * @param order The order being verified 
     */
    function verifyNonce(Types.LimitOrder memory order) public view returns (bool) {
        return order.nonce == nonce[order.user];
    }
}
