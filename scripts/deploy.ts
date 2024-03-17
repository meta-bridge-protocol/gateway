import hre, { ethers } from "hardhat"

async function deployAxelarGateway(admin: string, axlToken: string, realToken: string, deployer: string) {
	let factory = await ethers.getContractFactory("AxelarGateway", {
		signer: await ethers.getSigner(deployer)
	})
	let axelarGateway = await factory.deploy(admin, axlToken, realToken)
	await axelarGateway.waitForDeployment()
	try {
		await hre.run("verify:verify", {
			address: await axelarGateway.getAddress(),
			constructorArguments: [admin, axlToken, realToken]
		})
	} catch {
		console.log("Failed to verify")
	}
	return axelarGateway
}

export { deployAxelarGateway }
