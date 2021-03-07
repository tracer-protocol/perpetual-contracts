import { AddressInfo, Server } from 'net'

export function randomData(n: number, max = (Math.pow(2, 16) - 1)) {
    const data = []
    for (let i = 0; i < n; i++) {
        data.push(Math.ceil(Math.random() * max))
    }

    return data
}

export function gasStats(txList: Truffle.TransactionResponse<any>[]) {
    const total = txList.reduce((acc, v) => acc + v.receipt.gasUsed - 20000, 0)
    const avg = Math.round(total / txList.length)

    return {
        avg,
        total
    }
}

const sleep = (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export const sleepForPort = async (httpServer: Server, ms: number): Promise<number> => {
    return new Promise<number>((resolve, reject) => {
        httpServer.listen(0, async () => {
            try {
                let addr = (httpServer.address() as AddressInfo | null)
                while (!(addr && addr.port)) {
                    await sleep(ms);
                    addr = httpServer.address() as AddressInfo | null
                }
                resolve(addr.port);
            } catch (e) {
                reject(e);
            }
        });
    });
}
