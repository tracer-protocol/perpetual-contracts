import {
    TestTokenContract,
    AccountContract,
    GasOracleContract,
    GovContract,
    InsuranceContract,
    OracleContract,
    ReceiptContract,
    TracerPerpetualSwapsContract,
    TracerPerpetualsFactoryContract,
    DeployerV1Contract,
    PricingContract,
    MockTracerPerpetualSwapsContract,
    InsurancePoolTokenContract,
    TraderContract,
} from "../types/truffle-contracts"

import TracerPerpetualSwapsArtifact from "../build/contracts/TracerPerpetualSwaps.json"
import TracerPerpetualsFactoryArtifact from "../build/contracts/TracerPerpetualsFactory.json"
import TestTokenArtifact from "../build/contracts/TestToken.json"
import OracleArtifact from "../build/contracts/Oracle.json"
import GasOracleArtifact from "../build/contracts/GasOracle.json"
import InsuranceArtifact from "../build/contracts/Insurance.json"
import InsurancePoolTokenArtifact from "../build/contracts/InsurancePoolToken.json"
import AccountArtifact from "../build/contracts/Account.json"
import PricingArtifact from "../build/contracts/Pricing.json"
import DeployerV1Artifact from "../build/contracts/DeployerV1.json"
import ReceiptArtifact from "../build/contracts/Receipt.json"
import GovArtifact from "../build/contracts/Gov.json"
import TraderArtifact from "../build/contracts/Trader.json"
import MockTracerPerpetualSwapsArtifact from "../build/contracts/MockTracerPerpetualSwaps.json"

const Contract = require("@truffle/contract");


export const TracerPerpetualSwaps = Contract(TracerPerpetualSwapsArtifact) as TracerPerpetualSwapsContract
export const TracerPerpetualsFactory = Contract(TracerPerpetualsFactoryArtifact) as TracerPerpetualsFactoryContract
export const TestToken = Contract(TestTokenArtifact) as TestTokenContract
export const Oracle = Contract(OracleArtifact) as OracleContract
export const GasOracle = Contract(GasOracleArtifact) as GasOracleContract
export const Insurance = Contract(InsuranceArtifact) as InsuranceContract
export const Account = Contract(AccountArtifact) as AccountContract
export const Pricing = Contract(PricingArtifact) as PricingContract
export const DeployerV1 = Contract(DeployerV1Artifact) as DeployerV1Contract
export const Receipt = Contract(ReceiptArtifact) as ReceiptContract
export const Gov = Contract(GovArtifact) as GovContract
export const InsurancePoolToken = Contract(InsurancePoolTokenArtifact) as InsurancePoolTokenContract
export const Trader = Contract(TraderArtifact) as TraderContract
export const MockTracerPerpetualSwaps = Contract(MockTracerPerpetualSwapsArtifact) as MockTracerPerpetualSwapsContract

const otherContracts = {
    "Tracer": TracerPerpetualSwaps,
    "TracerPerpetualsFactory": TracerPerpetualsFactory,
    "TestToken": TestToken,
    "Oracle": Oracle,
    "GasOracle": GasOracle,
    "Insurance": Insurance,
    "Account": Account,
    "Pricing": Pricing,
    "DeployerV1": DeployerV1,
    "Receipt": Receipt,
    "Gov": Gov,
    "InsurancePoolToken": InsurancePoolToken,
    "Trader": Trader,
    "MockTracerPerpetualSwaps": MockTracerPerpetualSwaps,
}

export const contracts = {
    ...otherContracts
}
export type ContractName = keyof (typeof contracts)

//patch mock artifacts object for backwards-compatibility
export const artifacts = {
    require(name: ContractName) {
        return contracts[name]
    }
}
