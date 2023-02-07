import ow from 'ow'
import fs from 'fs'

import { SSM } from 'aws-sdk'
import { BundlerConfig, bundlerConfigDefault, BundlerConfigShape } from './BundlerConfig'
import { ethers, Wallet } from 'ethers'
import { BaseProvider } from '@ethersproject/providers'

function getCommandLineParams (programOpts: any): Partial<BundlerConfig> {
  const params: any = {}
  for (const bundlerConfigShapeKey in BundlerConfigShape) {
    const optionValue = programOpts[bundlerConfigShapeKey]
    if (optionValue != null) {
      params[bundlerConfigShapeKey] = optionValue
    }
  }
  return params as BundlerConfig
}

export function isProd (): boolean {
  return process.env.STAGE === 'PROD'
}

export async function getAwsSSMParameter (name: string, region: string = 'us-west-2'): Promise<string> {
  const config: SSM.Types.ClientConfiguration = { region }
  const ssm = new SSM(config)
  const params: SSM.GetParameterRequest = {
    Name: name,
    WithDecryption: false
  }
  const { Parameter } = await ssm.getParameter(params).promise()
  if (Parameter?.Value == null) {
    throw new Error(`Error reading ${name} from AWS SSM Parameter Store`)
  }
  return Parameter.Value
}

export async function getParamFromEnv (envName: string): Promise<string> {
  if (envName in process.env) {
    return await getAwsSSMParameter(process.env[envName] ?? '')
  } else {
    throw new Error(`Missing required env parameter: ${envName}`)
  }
}

export async function getAwsSSMParams (): Promise<Partial<BundlerConfig>> {
  const params: any = {}
  if (isProd()) {
    // TODO(skypigr): We can query multiple parameters in one batch.
    params.beneficiary = await getParamFromEnv('BUNDLER_PARAM_BENEFICIARY')
    params.entryPoint = await getParamFromEnv('BUNDLER_PARAM_ENTRYPOINT')
    params.network = await getParamFromEnv('BUNDLER_PARAM_NETWORK')
    console.log('Received Prod Params:', params)
  }
  return params as BundlerConfig
}

function mergeConfigs (...sources: Array<Partial<BundlerConfig>>): BundlerConfig {
  const mergedConfig = Object.assign({}, ...sources)
  ow(mergedConfig, ow.object.exactShape(BundlerConfigShape))
  return mergedConfig
}

export async function resolveConfiguration (programOpts: any): Promise<{ config: BundlerConfig, provider: BaseProvider, wallet: Wallet }> {
  console.log(`Resolving bundler config in ${process.env.STAGE} stage`)

  const commandLineParams = getCommandLineParams(programOpts)
  let fileConfig: Partial<BundlerConfig> = {}
  const configFileName = programOpts.config
  if (fs.existsSync(configFileName)) {
    fileConfig = JSON.parse(fs.readFileSync(configFileName, 'ascii'))
  }

  const prodOverwrites = await getAwsSSMParams()
  const config = mergeConfigs(bundlerConfigDefault, fileConfig, prodOverwrites, commandLineParams)
  console.log('Merged configuration:', JSON.stringify(config))

  const provider: BaseProvider = config.network === 'hardhat'
    // eslint-disable-next-line
    ? require('hardhat').ethers.provider
    : ethers.getDefaultProvider(config.network)

  let mnemonic: string
  let wallet: Wallet
  try {
    mnemonic = isProd()
      ? await getParamFromEnv('BUNDLER_PARAM_MNEMONIC_PHRASE')
      : fs.readFileSync(config.mnemonic, 'ascii').trim()
    wallet = Wallet.fromMnemonic(mnemonic).connect(provider)
  } catch (e: any) {
    throw new Error(`Unable to read --mnemonic ${config.mnemonic}: ${e.message as string}`)
  }

  return { config, provider, wallet }
}
