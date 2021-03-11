// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.0;
pragma experimental ABIEncoderV2;

import './Interfaces/ITracer.sol';
import './Interfaces/Types.sol';

/**
 * The Trader contract is used to validate and execute off chain signed and matched orders
 */
contract Trader {
    // EIP712 Constants
    // https://eips.ethereum.org/EIPS/eip-712
    string private constant EIP712_DOMAIN_NAME = 'Tracer Protocol';
    string private constant EIP712_DOMAIN_VERSION = '1.0';
    bytes32 private constant EIP712_DOMAIN_SEPERATOR =
        keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)');

    // EIP712 Types
    bytes32 private constant LIMIT_ORDER_TYPE =
        keccak256(
            'LimitOrder(uint256 amount,int256 price,bool side,address user,uint256 expiration,address targetTracer,uint256 nonce)'
        );

    uint256 constant chainId = 1337; // Changes per chain
    bytes32 public immutable EIP712_DOMAIN;
    // Trader => nonce
    mapping(address => uint256) public nonces; // Prevents replay attacks

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
     *         by matching orders 1 to 1
     * @param makers An array of signed make orders
     * @param takers An array of signed take orders
     * @param market The market to execute the trade in
     */
    function executeTrade(
        Types.SignedLimitOrder[] memory makers,
        Types.SignedLimitOrder[] memory takers,
        address market
    ) external {
        require(makers.length == takers.length, 'TDR: Lengths differ');

        /* safe as we've already bounds checked the array lengths */
        uint256 n = makers.length;

        require(n > 0, 'TDR: Received empty arrays');

        for (uint256 i = 0; i < n; i++) {
            /* retrieve orders and verify their signatures */
            Types.LimitOrder memory currMaker = grabOrder(makers, i);
            Types.LimitOrder memory currTaker = grabOrder(takers, i);

            /* check that prices match */
            require(currMaker.price == currTaker.price, 'TDR: Price mismatch');

            /* TODO: make order if it doesn't already exist on-chain */
        }
    }

    /**
     * @notice Retrieves and validates an order from an order array
     * @param orders an array of orders
     * @param index the index into the array where the desired order is
     * @return the specified order
     * @dev Performs its own bounds check on the array access
     */
    function grabOrder(Types.SignedLimitOrder[] memory orders, uint256 index)
        internal
        returns (Types.LimitOrder memory)
    {
        require(index <= orders.length, 'TDR: Out of bounds access');

        Types.SignedLimitOrder memory currentSigned = orders[index];

        /* verify signature and nonce */
        verify(
            currentSigned.order.user,
            currentSigned.order,
            currentSigned.sigR,
            currentSigned.sigS,
            currentSigned.sigV
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
                    '\x19\x01',
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
        require(verifySignature(signer, order, sigR, sigS, sigV), 'TDR: Signature verification failed');
        require(verifyNonce(order), 'TDR: Incorrect nonce');
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
        return order.nonce == nonces[order.user];
    }
}
