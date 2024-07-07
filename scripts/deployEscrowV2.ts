import {deployEscrowV2} from "./deploy"

async function deployEscrowV2Contract() {
    let gateway = "0xc7AdDb3179041F1BD951f6EAbB896fa277910d27"
    let msig = "0x2408E836eBfcF135731Df4Cf357C10a7b65193bF"
    let thresholdAmount = "200000000000000000000"  // 200 TOKEN
    let deployer = "0x2408E836eBfcF135731Df4Cf357C10a7b65193bF"
    let escrow = await deployEscrowV2(gateway, msig, thresholdAmount, deployer)
    console.log("EscrowV2 deployed at:", await escrow.getAddress())
}

deployEscrowV2Contract()
    .then(() => {
        console.log("done")
    })
    .catch(console.log)
