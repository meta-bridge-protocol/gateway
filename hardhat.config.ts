import * as dotenv from "dotenv"

import { HardhatUserConfig, task } from "hardhat/config"
import "@nomicfoundation/hardhat-chai-matchers"
import "@nomicfoundation/hardhat-verify"
import "@openzeppelin/hardhat-upgrades"
import "@typechain/hardhat"
import "hardhat-gas-reporter"
import "solidity-coverage"

dotenv.config()

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
		base: {
			url: `https://endpoints.omniatech.io/v1/base/mainnet/public	`,
			accounts: [process.env.NEW_MAIN_DEPLOYER!]
		}
	},
	gasReporter: {
		enabled: process.env.REPORT_GAS !== undefined,
		currency: "USD"
	},
	etherscan: {
		apiKey: process.env.ETHERSCAN_API_KEY
	}
}

export default config