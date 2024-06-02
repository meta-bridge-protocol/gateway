import hre, {ethers, upgrades} from "hardhat"

async function deployAxelarGateway(
    admin: string,
    operator: string,
    deployer: string,
    verify: boolean = true
) {
    let factory = await ethers.getContractFactory("AxelarGateway", {
        signer: await ethers.getSigner(deployer)
    })
    let axelarGateway = await factory.deploy(admin, operator)
    await axelarGateway.waitForDeployment()
    if (verify)
        try {
            await hre.run("verify:verify", {
                address: await axelarGateway.getAddress(),
                constructorArguments: [admin, operator]
            })
        } catch {
            console.log("Failed to verify")
        }
    return axelarGateway
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

export {deployAxelarGateway, deployEscrow}
