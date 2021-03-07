import {
    TestTokenContract,
    AccountContract,
    GasOracleContract,
    GovContract,
    InsuranceContract,
    OracleContract,
    ReceiptContract,
    TracerContract,
    TracerFactoryContract,
    DeployerV1Contract,
    PricingContract,
    MockTracerContract,
    InsurancePoolTokenContract,
    TraderContract,
} from "../types/truffle-contracts"

import TracerArtifact from "../build/contracts/Tracer.json"
import TracerFactoryArtifact from "../build/contracts/TracerFactory.json"
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
import MockTracerArtifact from "../build/contracts/MockTracer.json"

const Contract = require("@truffle/contract");


export const Tracer = Contract(TracerArtifact) as TracerContract
export const TracerFactory = Contract(TracerFactoryArtifact) as TracerFactoryContract
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
export const MockTracer = Contract(MockTracerArtifact) as MockTracerContract

const otherContracts = {
    "Tracer": Tracer,
    "TracerFactory": TracerFactory,
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
    "MockTracer": MockTracer,
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
