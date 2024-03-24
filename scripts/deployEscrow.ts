import { deployEscrow } from "./deploy"

async function deployEscrowContract() {
	/**
	 * gnosis safe (admin):
	 * fantom: 0x7F5Ae1dC8D2B5d599409C57978D21Cf596D37996
	 */
	/**
	 * Axelar Gateway address:
	 * avax: 0x44Fa47B1787Db408803ED688c5dC7Eb88199050a
	 * bsc: 0x38A0b1cf61581f290D14016b2D37807d28CfF57b
	 * eth: 0x714bCAF508c6e2e405EAA379BA54804EeD401add
	 * kava: 0xC8c1073Bb5b83f28778E5844469604BD0c4E293d
	 * polygon: 0x8878Eb7F44f969D0ed72c6010932791397628546
	 * base: 0x0013efdA0FE688894b85707B89d7F0fb1a39f354
	 * fantom: 0x33257c271cD2414B444a00346dDaE6f2BB757372
	 */
	let gateway = "0x33257c271cD2414B444a00346dDaE6f2BB757372"
	let deus = "0xDE55B113A27Cc0c5893CAa6Ee1C020b6B46650C0"
	let msig = "0x7F5Ae1dC8D2B5d599409C57978D21Cf596D37996"
	let thresholdAmount = "5000000000000000000000"
	let deployer = "0x1779cE3216D30642b677C419025f5cFb8521d340"
	let escrow = await deployEscrow(gateway, deus, msig, thresholdAmount, deployer)
	console.log("Escrow deployed at:", await escrow.getAddress())
}

deployEscrowContract()
	.then(() => {
		console.log("done")
	})
	.catch(console.log)
