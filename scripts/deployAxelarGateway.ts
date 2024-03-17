import { deployAxelarGateway } from "./deploy"

async function deployAxelarGatewayContract() {
	/**
	 * axlDEUS addresses on chains:
	 * Avalanche: 0xf9617c66cD8a4193A4DE0a101e16D73B71828810
	 * BNB chain: 0x912922e25ac79D524734d8eC0C882B035c5b356f
	 * Ethereum:  0x69e557b926F4eEf6d9400e36DBBFEb9600Af2880
	 * Kava:      0xebD4A18034C78A415088DF8508f102421eD693b1
	 * Polygon:   0x12A80A285DfaBd23FC1DFe6c515F034A22d9cdCE
	 * Base:      0xebD4A18034C78A415088DF8508f102421eD693b1
	 */
	/**
	 * gnosis safe (admin):
	 * Avalanche: 0x1D293D21c84987d8041a9B3642589d1Dc7a165bd
	 * BNB chain: 0x7F5Ae1dC8D2B5d599409C57978D21Cf596D37996
	 * Ethereum:  0x7F5Ae1dC8D2B5d599409C57978D21Cf596D37996
	 * Kava:      0xE5227F141575DcE74721f4A9bE2D7D636F923044
	 * Polygon:   0x7F5Ae1dC8D2B5d599409C57978D21Cf596D37996
	 * Base:      0x3FAa9dD2781080a39B1955b16Fd24367A57F6531
	 */
	let admin = "0x3FAa9dD2781080a39B1955b16Fd24367A57F6531"
	let axlToken = "0xebD4A18034C78A415088DF8508f102421eD693b1"
	let realToken = "0xDE5ed76E7c05eC5e4572CfC88d1ACEA165109E44"
	let deployer = "0x1779cE3216D30642b677C419025f5cFb8521d340"
	let axelarGateway = await deployAxelarGateway(admin, axlToken, realToken, deployer)
	console.log("AxelarGateway deployed at:", axelarGateway.address)
}

deployAxelarGatewayContract()
	.then(() => {
		console.log("done")
	})
	.catch(console.log)
