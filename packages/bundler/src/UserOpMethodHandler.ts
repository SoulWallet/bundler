import { BigNumber, BigNumberish, Signer } from 'ethers'
import { Log, Provider } from '@ethersproject/providers'

import { BundlerConfig } from './BundlerConfig'
import { resolveProperties } from 'ethers/lib/utils'
import { deepHexlify, erc4337RuntimeVersion } from '@account-abstraction/utils'
import { UserOperationStruct, EntryPoint } from '@account-abstraction/contracts'
import { UserOperationEventEvent } from '@account-abstraction/contracts/dist/types/EntryPoint'
import { calcPreVerificationGas } from '@account-abstraction/sdk'
import { requireCond, RpcError, tostr } from './utils'
import { ExecutionManager } from './modules/ExecutionManager'
import { getAddr, getArbCallGasLimits, getArbL1GasLimit } from './modules/moduleUtils'
import { UserOperationByHashResponse, UserOperationReceipt } from './RpcTypes'
import { ExecutionErrors, UserOperation, ValidationErrors } from './modules/Types'

import Debug from 'debug'

const debugGas = Debug('aa.gas')
const HEX_REGEX = /^0x[a-fA-F\d]*$/i

/**
 * return value from estimateUserOpGas
 */
export interface EstimateUserOpGasResult {
  /**
   * the preVerification gas used by this UserOperation.
   */
  preVerificationGas: BigNumberish
  /**
   * gas used for validation of this UserOperation, including account creation
   */
  verificationGasLimit: BigNumberish

  /**
   * (possibly future timestamp) after which this UserOperation is valid
   */
  validAfter?: BigNumberish

  /**
   * the deadline after which this UserOperation is invalid (not a gas estimation parameter, but returned by validation
   */
  validUntil?: BigNumberish
  /**
   * estimated cost of calling the account with the given callData
   */
  callGasLimit: BigNumberish
}

export class UserOpMethodHandler {
  constructor (
    readonly execManager: ExecutionManager,
    readonly provider: Provider,
    readonly signer: Signer,
    readonly config: BundlerConfig,
    readonly entryPoint: EntryPoint
  ) {
  }

  async getSupportedEntryPoints (): Promise<string[]> {
    return [this.config.entryPoint]
  }

  async selectBeneficiary (): Promise<string> {
    const currentBalance = await this.provider.getBalance(this.signer.getAddress())
    let beneficiary = this.config.beneficiary
    // below min-balance redeem to the signer, to keep it active.
    if (currentBalance.lte(this.config.minBalance)) {
      beneficiary = await this.signer.getAddress()
      console.log('low balance. using ', beneficiary, 'as beneficiary instead of ', this.config.beneficiary)
    }
    return beneficiary
  }

  async _validateParameters (userOp1: UserOperationStruct, entryPointInput: string, requireSignature = true, requireGasParams = true): Promise<void> {
    requireCond(entryPointInput != null, 'No entryPoint param', -32602)

    if (entryPointInput?.toString().toLowerCase() !== this.config.entryPoint.toLowerCase()) {
      throw new Error(`The EntryPoint at "${entryPointInput}" is not supported. This bundler uses ${this.config.entryPoint}`)
    }
    // minimal sanity check: userOp exists, and all members are hex
    requireCond(userOp1 != null, 'No UserOperation param')
    const userOp = await resolveProperties(userOp1) as any

    const fields = ['sender', 'nonce', 'initCode', 'callData', 'paymasterAndData']
    if (requireSignature) {
      fields.push('signature')
    }
    if (requireGasParams) {
      fields.push('preVerificationGas', 'verificationGasLimit', 'callGasLimit', 'maxFeePerGas', 'maxPriorityFeePerGas')
    }
    fields.forEach(key => {
      requireCond(userOp[key] != null, 'Missing userOp field: ' + key + JSON.stringify(userOp), -32602)
      const value: string = userOp[key].toString()
      requireCond(value.match(HEX_REGEX) != null, `Invalid hex value for property ${key}:${value} in UserOp`, -32602)
    })
  }

  /**
   * eth_estimateUserOperationGas RPC api.
   * @param userOp1
   * @param entryPointInput
   */
  async estimateUserOperationGas (userOp1: UserOperationStruct, entryPointInput: string): Promise<EstimateUserOpGasResult> {
    const userOp = {
      ...await resolveProperties(userOp1),
      // default values for missing fields.
      paymasterAndData: '0x',
      maxFeePerGas: 0,
      maxPriorityFeePerGas: 0,
      preVerificationGas: 0,
      verificationGasLimit: 10e6
    }

    // todo: checks the existence of parameters, but since we hexlify the inputs, it fails to validate
    await this._validateParameters(deepHexlify(userOp), entryPointInput)
    // todo: validation manager duplicate?
    const errorResult = await this.entryPoint.callStatic.simulateValidation(userOp).catch(e => e)
    if (errorResult.errorName === 'FailedOp') {
      throw new RpcError(errorResult.errorArgs.at(-1), ValidationErrors.SimulateValidation)
    }
    // todo throw valid rpc error
    if (errorResult.errorName !== 'ValidationResult') {
      throw errorResult
    }

    const { returnInfo } = errorResult.errorArgs
    let {
      preOpGas,
      validAfter,
      validUntil
    } = returnInfo

    let callGasLimit: number = 0
    if (userOp.callData !== '0x') {
      callGasLimit = await this.provider.estimateGas({
        from: this.entryPoint.address,
        to: userOp.sender,
        data: userOp.callData
      }).then(b => b.toNumber()).catch(err => {
        const message = err.message.match(/reason="(.*?)"/)?.at(1) ?? 'execution reverted'
        throw new RpcError(message, ExecutionErrors.UserOperationReverted)
      })
    }
    validAfter = BigNumber.from(validAfter)
    validUntil = BigNumber.from(validUntil)
    if (validUntil === BigNumber.from(0)) {
      validUntil = undefined
    }
    if (validAfter === BigNumber.from(0)) {
      validAfter = undefined
    }

    // Gas adjustment in L2 (Arbitrum) network
    //
    // For a transactions in layer 2 network, the Gas estimation is less
    // straightforward than in L1, and the calculation may vary in networks.
    // However, conceptual wise we can view the total Gas consumption as
    // two parts: (1) L2 Gas + (2) L1 Gas. The L2 Gas account for executing
    // the transaction in L2 network, the L1 Gas account for syncing this
    // transaction's data to L1.
    //
    // We can only estimate the gas consumtion in L2, we have to rely on
    // tools provided by L2 network to esitmate the corresponding L1 cost
    // for a transaction.

    // In this method, we use a `L1GasLimit` concept to compensate bundler
    // with the Gas this transaction would consume when going to L1, and
    // add it to `preVerificationGas` such that the User of this method can
    // simiply use the returned `preVerificationGas` in their
    // UserOperation without further calculation.
    const arbCallGasLimits = await getArbCallGasLimits(this.provider, this.entryPoint.address, userOp.sender, userOp.callData)
    debugGas(`callGasLimit: ${JSON.stringify(arbCallGasLimits)}`)
    const L1CallGasLimit: number = arbCallGasLimits.l1GasLimit?.toNumber() ?? 0
    const L2CallGasLimit: number = arbCallGasLimits.l2GasLimit?.toNumber() ?? 0
    let preVerificationGas = calcPreVerificationGas(userOp)
    const L1GasLimit = await (await getArbL1GasLimit(this.provider, userOp)).toNumber()

    debugGas(`callGasLimit: ${callGasLimit}`)
    debugGas(`ArbCallGasLimits: ${L1CallGasLimit + L2CallGasLimit}`)
    debugGas(`L1GasLimit: ${L1GasLimit}`)
    debugGas(`L1CallGasLimit: ${L1CallGasLimit}`)
    debugGas(`L2CallGasLimit: ${L2CallGasLimit}`)
    debugGas(`calculatedPreVerificationGas: ${preVerificationGas}`)
    const expectedPreVerificationGas = preVerificationGas + L1GasLimit
    debugGas(`expectedPreVerificationGas: ${expectedPreVerificationGas}`)
    debugGas(`Total Estimated Gas: ${preVerificationGas + L2CallGasLimit + L1GasLimit}`)

    preVerificationGas += BigNumber.from(L1GasLimit).mul(14).div(10).toNumber()
    debugGas(`Requested PreVerificationGas: ${preVerificationGas}`)

    const verificationGasLimit = BigNumber.from(preOpGas).toNumber()
    if (arbCallGasLimits.l2GasLimit !== undefined) {
      callGasLimit = L2CallGasLimit
    }
    return {
      preVerificationGas,
      verificationGasLimit,
      validAfter,
      validUntil,
      callGasLimit
    }
  }

  async sendUserOperation (userOp1: UserOperationStruct, entryPointInput: string): Promise<string> {
    await this._validateParameters(userOp1, entryPointInput)

    const userOp = await resolveProperties(userOp1)

    console.log(`UserOperation: Sender=${userOp.sender}  Nonce=${tostr(userOp.nonce)} EntryPoint=${entryPointInput} Paymaster=${getAddr(
      userOp.paymasterAndData)}`)
    await this.execManager.sendUserOperation(userOp, entryPointInput)
    return await this.entryPoint.getUserOpHash(userOp)
  }

  async _getUserOperationEvent (userOpHash: string): Promise<UserOperationEventEvent> {
    // TODO: eth_getLogs is throttled. must be acceptable for finding a UserOperation by hash
    const event = await this.entryPoint.queryFilter(this.entryPoint.filters.UserOperationEvent(userOpHash))
    return event[0]
  }

  // filter full bundle logs, and leave only logs for the given userOpHash
  // @param userOpEvent - the event of our UserOp (known to exist in the logs)
  // @param logs - full bundle logs. after each group of logs there is a single UserOperationEvent with unique hash.
  _filterLogs (userOpEvent: UserOperationEventEvent, logs: Log[]): Log[] {
    let startIndex = -1
    let endIndex = -1
    const events = Object.values(this.entryPoint.interface.events)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const beforeExecutionTopic = this.entryPoint.interface.getEventTopic(events.find(e => e.name === 'BeforeExecution')!)
    logs.forEach((log, index) => {
      if (log?.topics[0] === beforeExecutionTopic) {
        // all UserOp execution events start after the "BeforeExecution" event.
        startIndex = endIndex = index
      } else if (log?.topics[0] === userOpEvent.topics[0]) {
        // process UserOperationEvent
        if (log.topics[1] === userOpEvent.topics[1]) {
          // it's our userOpHash. save as end of logs array
          endIndex = index
        } else {
          // it's a different hash. remember it as beginning index, but only if we didn't find our end index yet.
          if (endIndex === -1) {
            startIndex = index
          }
        }
      }
    })
    if (endIndex === -1) {
      throw new Error('fatal: no UserOperationEvent in logs')
    }
    return logs.slice(startIndex + 1, endIndex)
  }

  async getUserOperationByHash (userOpHash: string): Promise<UserOperationByHashResponse | null> {
    requireCond(userOpHash?.toString()?.match(HEX_REGEX) != null, 'Missing/invalid userOpHash', -32601)
    const event = await this._getUserOperationEvent(userOpHash)
    if (event == null) {
      return null
    }
    const tx = await event.getTransaction()
    if (tx.to !== this.entryPoint.address) {
      throw new Error('unable to parse transaction')
    }
    const parsed = this.entryPoint.interface.parseTransaction(tx)
    const ops: UserOperation[] = parsed?.args.ops
    if (ops == null) {
      throw new Error('failed to parse transaction')
    }
    const op = ops.find(op =>
      op.sender === event.args.sender &&
      BigNumber.from(op.nonce).eq(event.args.nonce)
    )
    if (op == null) {
      throw new Error('unable to find userOp in transaction')
    }

    const {
      sender,
      nonce,
      initCode,
      callData,
      callGasLimit,
      verificationGasLimit,
      preVerificationGas,
      maxFeePerGas,
      maxPriorityFeePerGas,
      paymasterAndData,
      signature
    } = op

    return deepHexlify({
      userOperation: {
        sender,
        nonce,
        initCode,
        callData,
        callGasLimit,
        verificationGasLimit,
        preVerificationGas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        paymasterAndData,
        signature
      },
      entryPoint: this.entryPoint.address,
      transactionHash: tx.hash,
      blockHash: tx.blockHash ?? '',
      blockNumber: tx.blockNumber ?? 0
    })
  }

  async getUserOperationReceipt (userOpHash: string): Promise<UserOperationReceipt | null> {
    requireCond(userOpHash?.toString()?.match(HEX_REGEX) != null, 'Missing/invalid userOpHash', -32601)
    const event = await this._getUserOperationEvent(userOpHash)
    if (event == null) {
      return null
    }
    const receipt = await event.getTransactionReceipt()
    const logs = this._filterLogs(event, receipt.logs)
    return deepHexlify({
      userOpHash,
      sender: event.args.sender,
      nonce: event.args.nonce,
      actualGasCost: event.args.actualGasCost,
      actualGasUsed: event.args.actualGasUsed,
      success: event.args.success,
      logs,
      receipt
    })
  }

  clientVersion (): string {
    // eslint-disable-next-line
    const tag = process.env.IMAGE_TAG ? '@' + process.env.IMAGE_TAG : ''
    return 'aa-bundler/' + erc4337RuntimeVersion + (this.config.unsafe ? '/unsafe' : '') + tag
  }
}
