import { SQS } from 'aws-sdk'
import { UserOperation } from './modules/Types'
import { getAwsSSMParameter } from './Config'
import Debug from 'debug'

const debug = Debug('aa.metric')

export interface IBundlerGasMetric {
  chainId: number
  userOp: UserOperation
  rtL1GasLimit: number
  rtL2GasLimit: number
  rtPreVerificationGas: number
  actualGas: number
  txHash: string
}

export class MetricRecorder {
  sqs: SQS | undefined
  queueUrl: string | undefined

  // Publish a message to an SNS topic
  async publish (metric: Partial<IBundlerGasMetric>): Promise<void> {
    const queueUrl = await this.getQueueUrl()
    if (queueUrl === undefined) {
      console.warn('Failed to get the QueueUrl to publish metric to, skipping this record')
      return
    }

    if (this.sqs === undefined) {
      const config: SQS.Types.ClientConfiguration = { region: 'us-west-2' }
      this.sqs = new SQS(config)
    }

    const messageParams = {
      MessageBody: JSON.stringify(metric),
      QueueUrl: queueUrl
    }

    this.sqs.sendMessage(messageParams, (err, data) => {
      if (err !== null) {
        console.error('Error publishing to SQS:', err)
      } else {
        debug('Message published to SQS:', data)
      }
    })
  }

  private async getQueueUrl (): Promise<string | undefined> {
    if (this.queueUrl === undefined) {
      try {
        this.queueUrl = await getAwsSSMParameter('/bundler/metric/stdQueue')
      } catch (e) {
        console.error(e)
      }
    }

    return this.queueUrl
  }
}
