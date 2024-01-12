import { BigNumber, ethers, BytesLike } from 'ethers'
import { UserOperationStruct } from '@account-abstraction/contracts'
import { Provider } from '@ethersproject/providers'

export const ArbitrumEstimateGasHelperAddress = '0xf29afD09D63Cb38a23861e552D77a2E9bb15bE41'

export const ArbitrumNodeInterfaceABI = [
    {
        inputs: [
            {
                internalType: 'uint64',
                name: 'size',
                type: 'uint64'
            },
            {
                internalType: 'uint64',
                name: 'leaf',
                type: 'uint64'
            }
        ],
        name: 'constructOutboxProof',
        outputs: [
            {
                internalType: 'bytes32',
                name: 'send',
                type: 'bytes32'
            },
            {
                internalType: 'bytes32',
                name: 'root',
                type: 'bytes32'
            },
            {
                internalType: 'bytes32[]',
                name: 'proof',
                type: 'bytes32[]'
            }
        ],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'sender',
                type: 'address'
            },
            {
                internalType: 'uint256',
                name: 'deposit',
                type: 'uint256'
            },
            {
                internalType: 'address',
                name: 'to',
                type: 'address'
            },
            {
                internalType: 'uint256',
                name: 'l2CallValue',
                type: 'uint256'
            },
            {
                internalType: 'address',
                name: 'excessFeeRefundAddress',
                type: 'address'
            },
            {
                internalType: 'address',
                name: 'callValueRefundAddress',
                type: 'address'
            },
            {
                internalType: 'bytes',
                name: 'data',
                type: 'bytes'
            }
        ],
        name: 'estimateRetryableTicket',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function'
    },
    {
        inputs: [
            {
                internalType: 'uint64',
                name: 'blockNum',
                type: 'uint64'
            }
        ],
        name: 'findBatchContainingBlock',
        outputs: [
            {
                internalType: 'uint64',
                name: 'batch',
                type: 'uint64'
            }
        ],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'to',
                type: 'address'
            },
            {
                internalType: 'bool',
                name: 'contractCreation',
                type: 'bool'
            },
            {
                internalType: 'bytes',
                name: 'data',
                type: 'bytes'
            }
        ],
        name: 'gasEstimateComponents',
        outputs: [
            {
                internalType: 'uint64',
                name: 'gasEstimate',
                type: 'uint64'
            },
            {
                internalType: 'uint64',
                name: 'gasEstimateForL1',
                type: 'uint64'
            },
            {
                internalType: 'uint256',
                name: 'baseFee',
                type: 'uint256'
            },
            {
                internalType: 'uint256',
                name: 'l1BaseFeeEstimate',
                type: 'uint256'
            }
        ],
        stateMutability: 'payable',
        type: 'function'
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'to',
                type: 'address'
            },
            {
                internalType: 'bool',
                name: 'contractCreation',
                type: 'bool'
            },
            {
                internalType: 'bytes',
                name: 'data',
                type: 'bytes'
            }
        ],
        name: 'gasEstimateL1Component',
        outputs: [
            {
                internalType: 'uint64',
                name: 'gasEstimateForL1',
                type: 'uint64'
            },
            {
                internalType: 'uint256',
                name: 'baseFee',
                type: 'uint256'
            },
            {
                internalType: 'uint256',
                name: 'l1BaseFeeEstimate',
                type: 'uint256'
            }
        ],
        stateMutability: 'payable',
        type: 'function'
    },
    {
        inputs: [
            {
                internalType: 'bytes32',
                name: 'blockHash',
                type: 'bytes32'
            }
        ],
        name: 'getL1Confirmations',
        outputs: [
            {
                internalType: 'uint64',
                name: 'confirmations',
                type: 'uint64'
            }
        ],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'batchNum',
                type: 'uint256'
            },
            {
                internalType: 'uint64',
                name: 'index',
                type: 'uint64'
            }
        ],
        name: 'legacyLookupMessageBatchProof',
        outputs: [
            {
                internalType: 'bytes32[]',
                name: 'proof',
                type: 'bytes32[]'
            },
            {
                internalType: 'uint256',
                name: 'path',
                type: 'uint256'
            },
            {
                internalType: 'address',
                name: 'l2Sender',
                type: 'address'
            },
            {
                internalType: 'address',
                name: 'l1Dest',
                type: 'address'
            },
            {
                internalType: 'uint256',
                name: 'l2Block',
                type: 'uint256'
            },
            {
                internalType: 'uint256',
                name: 'l1Block',
                type: 'uint256'
            },
            {
                internalType: 'uint256',
                name: 'timestamp',
                type: 'uint256'
            },
            {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256'
            },
            {
                internalType: 'bytes',
                name: 'calldataForL1',
                type: 'bytes'
            }
        ],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [],
        name: 'nitroGenesisBlock',
        outputs: [
            {
                internalType: 'uint256',
                name: 'number',
                type: 'uint256'
            }
        ],
        stateMutability: 'pure',
        type: 'function'
    }
]

const EstimateGasHelperABI: any =
    [
        {
            inputs: [
                {
                    components: [
                        {
                            internalType: 'addr   ess',
                            name: 'sender',
                            type: 'address'
                        },
                        {
                            internalType: 'uint256',
                            name: 'nonce',
                            type: 'uint256'
                        },
                        {
                            internalType: 'bytes',
                            name: 'initCode',
                            type: 'bytes'
                        },
                        {
                            internalType: 'bytes',
                            name: 'callData',
                            type: 'bytes'
                        },
                        {
                            internalType: 'uint256',
                            name: 'callGasLimit',
                            type: 'uint256'
                        },
                        {
                            internalType: 'uint256',
                            name: 'verificationGasLimit',
                            type: 'uint256'
                        },
                        {
                            internalType: 'uint256',
                            name: 'preVerificationGas',
                            type: 'uint256'
                        },
                        {
                            internalType: 'uint256',
                            name: 'maxFeePerGas',
                            type: 'uint256'
                        },
                        {
                            internalType: 'uint256',
                            name: 'maxPriorityFeePerGas',
                            type: 'uint256'
                        },
                        {
                            internalType: 'bytes',
                            name: 'paymasterAndData',
                            type: 'bytes'
                        },
                        {
                            internalType: 'bytes',
                            name: 'signature',
                            type: 'bytes'
                        }
                    ],
                    internalType: 'struct UserOperation',
                    name: 'op',
                    type: 'tuple'
                }
            ],
            name: 'userOpCalldataTest',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function'
        }
    ]

export interface IEstimateComponents {
    baseFee: BigNumber
    gasEstimate: BigNumber
    gasEstimateForL1: BigNumber
    l1BaseFeeEstimate: BigNumber
}

export class ArbitrumNodeInterface {
    static arbitrumNodeInterface = '0x00000000000000000000000000000000000000C8'

    public static async gasEstimateComponents (
        etherProvider: Provider,
        from: string | undefined,
        to: string,
        calldata: BytesLike, contractCreation = false
    ): Promise<IEstimateComponents> {
        const encodeABI = new ethers.utils.Interface(ArbitrumNodeInterfaceABI).encodeFunctionData('gasEstimateComponents', [
            to,
            contractCreation,
            calldata
        ])
        const gasLimit = await etherProvider.call({
            to: ArbitrumNodeInterface.arbitrumNodeInterface,
            data: encodeABI,
            from
        })
        const decodeABI = new ethers.utils.Interface(ArbitrumNodeInterfaceABI).decodeFunctionResult('gasEstimateComponents', gasLimit)

        return {
            baseFee: decodeABI.baseFee,
            gasEstimate: decodeABI.gasEstimate,
            gasEstimateForL1: decodeABI.gasEstimateForL1,
            l1BaseFeeEstimate: decodeABI.l1BaseFeeEstimate
        }
    }
}

export interface IArbGas {
    l1GasLimit: BigNumber | undefined
    l2GasLimit: BigNumber | undefined
}

export class Arbitrum {
    /**
       * @static
       * @param {Provider} provider
       * @param {UserOperationStruct} op
       * @return {IArbGas}
       * @memberof Arbitrum
       */
    public static async EstimateGas (
        provider: Provider,
        op: UserOperationStruct
    ): Promise<IArbGas> {

        let l1GasLimit: BigNumber | undefined
        let l2GasLimit: BigNumber | undefined

        const chainId = await provider.getNetwork().then((network) => network.chainId);
        if (chainId === 421613 || chainId === 42161 || chainId === 421614) {
            const data = new ethers.utils.Interface(EstimateGasHelperABI).encodeFunctionData('userOpCalldataTest', [op])
            const gasLimit = await ArbitrumNodeInterface.gasEstimateComponents(
                provider,
                undefined,
                ArbitrumEstimateGasHelperAddress,
                data)
            l1GasLimit = gasLimit.gasEstimateForL1
            l2GasLimit = gasLimit.gasEstimate.sub(l1GasLimit)
        }
        return { l1GasLimit, l2GasLimit }
    }

    public static async CallGasLimits (provider: Provider, from: string, to: string, data: BytesLike): Promise<IArbGas> {
        let l1GasLimit: BigNumber | undefined
        let l2GasLimit: BigNumber | undefined

        const chainId = await provider.getNetwork().then((network) => network.chainId);
        if (chainId === 421613 || chainId === 42161 || chainId === 421614) {
            const gasEstimates = await ArbitrumNodeInterface.gasEstimateComponents(provider, from, to, data)
            l1GasLimit = gasEstimates.gasEstimateForL1
            l2GasLimit = gasEstimates.gasEstimate.sub(l1GasLimit)
        }
        return { l1GasLimit, l2GasLimit }
    }

    public static async L1GasLimit (provider: Provider, op: UserOperationStruct): Promise<BigNumber | undefined> {
        let l1GasLimit: BigNumber | undefined
        const chainId = await provider.getNetwork().then((network) => network.chainId);
        if (chainId === 421613 || chainId === 42161 || chainId === 421614) {
            const data = new ethers.utils.Interface(EstimateGasHelperABI).encodeFunctionData('userOpCalldataTest', [op])
            const gasLimit = await ArbitrumNodeInterface.gasEstimateComponents(
                provider,
                undefined,
                ArbitrumEstimateGasHelperAddress,
                data)
            l1GasLimit = gasLimit.gasEstimateForL1
        }
        return l1GasLimit
    }
}
