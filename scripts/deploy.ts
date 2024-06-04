import hre, {ethers, upgrades} from "hardhat"

async function deployGateway(
    admin: string,
    operator: string,
    deployer: string,
    verify: boolean = true
) {
    let factory = await ethers.getContractFactory("Gateway", {
        signer: await ethers.getSigner(deployer)
    })
    let gateway = await factory.deploy(admin, operator)
    await gateway.waitForDeployment()
    if (verify)
        try {
            await hre.run("verify:verify", {
                address: await gateway.getAddress(),
                constructorArguments: [admin, operator]
            })
        } catch {
            console.log("Failed to verify")
        }
    return gateway
}

async function deployEscrow(
    gateway: string,
    deus: string,
    msig: string,
    thresholdAmount: string,
    deployer: string,
    verify: boolean = true
) {
    const factory = await ethers.getContractFactory("Escrow", {
        signer: await ethers.getSigner(deployer)
    })
    const escrow = await upgrades.deployProxy(factory, [gateway, deus, msig, thresholdAmount])
    await escrow.waitForDeployment()
    if (verify)
        try {
            await hre.run("verify:verify", {
                address: await escrow.getAddress(),
                constructorArguments: [gateway, deus, msig, thresholdAmount]
            })
        } catch {
            console.log("Failed to verify")
        }
    return escrow
}

export {deployGateway, deployEscrow}
