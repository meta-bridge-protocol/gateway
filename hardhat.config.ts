import * as dotenv from "dotenv"

import {HardhatUserConfig, task} from "hardhat/config"
import "@nomicfoundation/hardhat-chai-matchers"
import "@nomicfoundation/hardhat-verify"
import "@openzeppelin/hardhat-upgrades"
import "@typechain/hardhat"
import "hardhat-gas-reporter"
import "solidity-coverage"

dotenv.config()
const accounts = [process.env.NEW_MAIN_DEPLOYER!, process.env.USER_PRIVATE!, process.env.RECIPIENT_PRIVATE!]

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners()
    for (const account of accounts) {
        console.log(account.address)
    }
})

const config: HardhatUserConfig = {
    solidity: {
        compilers: [
            {
                version: "0.8.19",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 100000
                    }
                }
            }
        ]
    },
    networks: {
        localhost: {
            accounts: accounts
        },
        blast: {
            url: "https://rpc.blast.io",
            accounts: accounts
        },
        fantom: {
            url: "https://rpc.ftm.tools",
            accounts: accounts
        },
        fantom_test: {
            url: "https://rpc.testnet.fantom.network/",
            accounts: accounts
        },
        goerli: {
            url: `https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161`,
            accounts: accounts
        },
        mainnet: {
            url: `https://ethereum.publicnode.com`,
            accounts: accounts
        },
        bnb: {
            url: `https://bsc.rpc.blxrbdn.com`,
            accounts: accounts
        },
        polygon: {
            url: `https://polygon-rpc.com/`,
            accounts: accounts
        },
        arbitrum: {
            url: `https://arb1.arbitrum.io/rpc`,
            accounts: accounts
        },
        avax: {
            url: `https://ava-mainnet.public.blastapi.io/ext/bc/C/rpc`,
            accounts: accounts
        },
        kava: {
            url: `https://evm.kava.io`,
            accounts: accounts
        },
        zkevm: {
            url: `https://zkevm-rpc.com`,
            accounts: accounts
        },
        op: {
            url: `https://optimism.llamarpc.com	`,
            accounts: accounts
        },
        base: {
            url: `https://base.llamarpc.com`,
            accounts: accounts
        },
        bnb_test: {
            url: `https://bsc-testnet-rpc.publicnode.com`,
            accounts: accounts
        }
    },
    sourcify: {
        enabled: false
    },
    gasReporter: {
        enabled: process.env.REPORT_GAS !== undefined,
        currency: "USD"
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY,
        customChains: [
            {
                network: "blast",
                chainId: 81457,
                urls: {
                    apiURL: `https://api.blastscan.io/api?module=contract&action=verifysourcecode&apikey=${process.env.ETHERSCAN_API_KEY}`,
                    browserURL: "https://blastscan.io"
                }
            }
        ]
    }
}

export default config
