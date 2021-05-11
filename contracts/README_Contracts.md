**<center>Contracts</center>**




**GasOracle.sol**  
**Explanation:** This contract is an implementation of an Oracle that reports a gas price estimate in $USD. The contract handles 1 such Oracle. The constructor requires the address of a $USD price oracle and gas price oracle but has the functionality to change what these oracles are.       
Usage: This contract is used in order to retrieve the current gas price in $USD

**Oracle.sol**  
**Explanation:** This contract is an implementation of an Oracle that reports the market price of the underlying asset that the tracers value is quoted upon. Implementations of these oracles can differ as long as the oracle complies with IOracle.sol and is community approve      
Usage: This contract is used in order to retrieve off chain asset prices (via Chainlink) as well as the Ethereum gas price

**Gov.sol**  
**Explanation:** This contract contains the logic for the governance of the system. It uses an IEC20 token (govToken), these tokens can be staked in order to facilitate voting and proposals. Staked tokens can be delegated.   
Usage: This contract is used to facilitate the management of the entire system. It contains voting/proposal logic. 

**Insurance.sol**     
**Explanation:** An insurance contract handles the Insurance Pool token, withdrawing/staking into a specific tracer’s insurance pool and deploying insurance pools for new tracers.  
Usage: This contract is used to manage the insurance pools of tracers. 

**Account.sol**   
**Explanation:** The account contract handles functionality allowing users to deposit/withdraw from tracer margin accounts, settling of said Tracer accounts, handles liquidation events and updates accounts in accordance of these events.  

**TracerFactory.sol**   
**Explanation:** This contract deploys new Tracers and is used to validate if a tracer is DAO approved. It also sets up new insurance pools (using Insurance.sol), and initialising the Tracer.

**TracerPerpetualSwaps.sol**   
**Explanation:** The tracer contract handles the creation and filling of market orders, settlement of accounts and updating the pricing values of the Tracer (via a pricing contract (e.g. Pricing.sol)). 
The Tracer contract also contains governance functions that allows the contract owner to transfer ownership of a Tracer, change/set the pricing oracles and manipulate the fee system.


**Pricing.sol**  
**Explanation:** A Pricing contract handles all of the updating, storage allocation and retrieval of values related to the value of a Tracer (e.g. funding rate, Tracer price, timeValue/interestRates)  

**Receipt.sol**   
**Explanation:** The receipt contract handles the creation of liquidation receipts and retrieval  of funds entitled to entities who facilitate a complete and successful liquidation (via claiming of one such receipt)   




























    
