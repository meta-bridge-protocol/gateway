import hre, {ethers} from "hardhat"

async function deployGatewayContract() {
    let params = [
        "0xb57490CDAABEDb450df33EfCdd93079A24ac5Ce5",
        "0x438Bec7eF8e19dD3291836418d9F10cA448dd5fA",
        "0xdEb08AebaccCFb20731505b1E6F6498a2B2Bd689"
    ]

    let factory = await ethers.getContractFactory("GatewayV2")
    let gateway = await factory.deploy(...params)
    
    await gateway.waitForDeployment()

    console.log("Gateway deployed at:", await gateway.getAddress())

    try {
        await hre.run("verify:verify", {
            address: await gateway.getAddress(),
            constructorArguments: params
        })
    } catch {
        console.log("Failed to verify")
    }
}

deployGatewayContract()
    .then(() => {
        console.log("done")
    })
    .catch(console.log)
