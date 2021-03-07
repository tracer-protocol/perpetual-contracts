**<center>Contracts</center>**

### DEX Contracts
The Tracer contract is designed to be agnostic of the underlying DEX and is responsible for the necessary checks and balances to ensure traders have proper collateral to back their positions. The Tracer contract is also responsible for the settlement of orders by updating account balances. The DEXes on the other hand, are used to enable the exchange of the perpetual swap contracts. The DEX contracts are product agnostic and could be used to trade any product (eg. an ERC20). They only serve as order matching engines and are not responsible for the settlement of these orders.

The following DEX contracts are possible implementations:
- SimpleDex (aka MapDex)

#### SimpleDex
SimpleDex (aka MapDex) uses a mapping to store orders by unique incremental id. Orders consist of a struct with `maker,amount,price,side,expiration,creation` fields.

Advantages
- Simple structure, easy cancellation
- O(1) insert
- O(1) read
- O(1) delete

Disadvantage
- Expensive for matching even smallest order (~150k gas)
- Requires offchain engine for matching orders
- No guarantees on best price execution
- Execution might fail when two take orders wish to fill the same limit order
- Inefficient Order struct uses uint256, takes 5-6 storage slots minimum
- Tracks order takers, increasing order matching costs
- Orders are matched 1:1, a large order needs to be batched as smaller orders by another periphery contract