import { JsonRpcProvider, FeeData } from '@ethersproject/providers'
import { BigNumberish } from 'ethers/lib/ethers'
import { BigNumber, ethers } from 'ethers'
import axios from 'axios'

export class RpcError extends Error {
  // error codes from: https://eips.ethereum.org/EIPS/eip-1474
  constructor (msg: string, readonly code?: number, readonly data: any = undefined) {
    super(msg)
  }
}

export function tostr (s: BigNumberish): string {
  return BigNumber.from(s).toString()
}

export function requireCond (cond: boolean, msg: string, code?: number, data: any = undefined): void {
  if (!cond) {
    throw new RpcError(msg, code, data)
  }
}

/**
 * create a dictionary object with given keys
 * @param keys the property names of the returned object
 * @param mapper mapper from key to property value
 * @param filter if exists, must return true to add keys
 */
export function mapOf<T> (keys: Iterable<string>, mapper: (key: string) => T, filter?: (key: string) => boolean): { [key: string]: T } {
  const ret: { [key: string]: T } = {}
  for (const key of keys) {
    if (filter == null || filter(key)) {
      ret[key] = mapper(key)
    }
  }
  return ret
}

export async function sleep (sleepTime: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, sleepTime))
}

export async function waitFor<T> (func: () => T | undefined, timeout = 10000, interval = 500): Promise<T> {
  const endTime = Date.now() + timeout
  while (true) {
    const ret = await func()
    if (ret != null) {
      return ret
    }
    if (Date.now() > endTime) {
      throw new Error(`Timed out waiting for ${func as unknown as string}`)
    }
    await sleep(interval)
  }
}

export async function supportsRpcMethod (provider: JsonRpcProvider, method: string): Promise<boolean> {
  const ret = await provider.send(method, []).catch(e => e)
  const code = ret.error?.code ?? ret.code
  return code === -32602 // wrong params (meaning, method exists)
}

export async function isGeth (provider: JsonRpcProvider): Promise<boolean> {
  const p = provider.send as any
  if (p._clientVersion == null) {
    p._clientVersion = await provider.send('web3_clientVersion', [])
  }

  // check if we have traceCall
  // its GETH if it has debug_traceCall method.
  return await supportsRpcMethod(provider, 'debug_traceCall')
  // debug('client version', p._clientVersion)
  // return p._clientVersion?.match('go1') != null
}

export async function getFeeData (provider: JsonRpcProvider): Promise<FeeData> {
  if (provider._network.chainId === 137) {
    // Polygon Mainnet
    //
    // The default getFeeData() method on the provider doesn't work for Polygon Mainnet
    // We need to use the Polygon Gas Station API to get the latest gas prices.
    // Reference: https://wiki.polygon.technology/docs/develop/tools/polygon-gas-station/
    let maxFeePerGas = BigNumber.from(40000000000) // default to 40 gwei
    let maxPriorityFeePerGas = BigNumber.from(40000000000) // default to 40 gwei
    try {
      const { data } = await axios({
        method: 'get',
        url: 'https://gasstation-mainnet.matic.network/v2'
      })

      maxFeePerGas = ethers.utils.parseUnits(
        Math.ceil(data.fast.maxFee).toString(),
        'gwei'
      )
      maxPriorityFeePerGas = ethers.utils.parseUnits(
        Math.ceil(data.fast.maxPriorityFee).toString(),
        'gwei'
      )
      return {
        lastBaseFeePerGas: null,
        gasPrice: null,
        maxFeePerGas,
        maxPriorityFeePerGas
      }
    } catch {
      // ignore
    }
  }

  return await provider.getFeeData()
}
