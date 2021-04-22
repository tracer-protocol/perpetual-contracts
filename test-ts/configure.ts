import Web3 from 'web3'
import { HttpProvider, WebsocketProvider } from 'web3-core'
import ganache from 'ganache-core'
import dotenv from 'dotenv'
import { isEqual } from 'lodash'

import { sleepForPort } from "./utils"
import { contracts } from "./artifacts"

dotenv.config()

export let web3: Web3;

interface GanacheConfig {
    server?: boolean,
    fork?: string,
    networkId?: number
}
interface GanacheEnvironment {
    provider: ganache.Provider;
    server: ganache.Server | undefined
    web3: Web3
    web3HttpUrl: string | undefined
    web3HttpProvider: HttpProvider | undefined
    web3WebsocketUrl: string | undefined
    web3WebsocketProvider: WebsocketProvider | undefined
}
async function configureGanache(config?: GanacheConfig): Promise<GanacheEnvironment> {
    let provider: ganache.Provider;
    let server: ganache.Server | undefined
    let web3: Web3
    let web3HttpUrl: string | undefined
    let web3HttpProvider: HttpProvider | undefined
    let web3WebsocketUrl: string | undefined
    let web3WebsocketProvider: WebsocketProvider | undefined
    let fork = config?.fork
    let networkId = config?.networkId ?? 1337
    if (config?.server) {
        //@ts-ignore
        server = ganache.server({ port: 0, fork, networkId, _chainIdRpc: networkId, _chainId: networkId }); //Used by RelayProvider
        provider = server.provider
        //Wait on port
        const port = await sleepForPort(server, 1000)
        console.debug(`Ganache running on port ${port}`)

        web3HttpUrl = `http://localhost:${port}`
        web3HttpProvider = new Web3.providers.HttpProvider(web3HttpUrl)
        web3WebsocketUrl = `ws://localhost:${port}`
        web3WebsocketProvider = new Web3.providers.WebsocketProvider(web3WebsocketUrl)

    } else {
        //@ts-ignore
        provider = ganache.provider({ fork, networkId, _chainIdRpc: networkId, _chainId: networkId })
    }

    //@ts-ignore
    provider.setMaxListeners(200)
    //@ts-ignore
    web3 = new Web3(provider)

    //Configure OZ test-helpers
    require('@openzeppelin/test-helpers/configure')({
        provider
    });

    for (let k in contracts) {
        //@ts-ignore
        contracts[k].setProvider(provider)
    }

    return {
        provider,
        server,
        web3,
        web3HttpUrl,
        web3HttpProvider,
        web3WebsocketUrl,
        web3WebsocketProvider
    }
}

export let accounts: string[]
async function configureAccounts(web3: Web3) {
    const accounts = await web3.eth.getAccounts()
    web3.eth.defaultAccount = accounts[0]
    for (let k in contracts) {
        //@ts-ignore
        contracts[k].web3.eth.defaultAccount = accounts[0]
    }

    return accounts
}

export interface FullTestConfig {
    ganacheConfig?: GanacheConfig
}

let initialConfig = false
let lastConfig: FullTestConfig | undefined
let ganacheEnv: GanacheEnvironment;
export async function configure(config?: FullTestConfig) {
    //deep equal
    if (!isEqual(lastConfig, config) || !initialConfig) {
        initialConfig = true
        lastConfig = config

        ganacheEnv = await configureGanache(config?.ganacheConfig)
        accounts = await configureAccounts(ganacheEnv.web3)

        web3 = ganacheEnv.web3
    }

    return { ganache: ganacheEnv, accounts };
}
