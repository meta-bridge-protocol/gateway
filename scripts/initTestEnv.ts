import {deployAxelarGateway} from "./deploy"
import {deployEscrow} from "./deploy"
import {ethers} from "hardhat";
import {Signer} from "ethers"

async function init() {
    let botAddress = process.env.ESCROW_BOT_WALLET!
    let deployer: Signer
    [deployer] = await ethers.getSigners()
    let admin = await deployer.getAddress()
    console.log(`deployer:      ${admin}`)
    console.log(`bot wallet:    ${botAddress}`)
    const TestToken = await ethers.getContractFactory("TestToken")
    let axlToken = await TestToken.deploy("AXL Token", "AXL")
    await axlToken.waitForDeployment()
    let realToken = await TestToken.deploy("Real Token", "REAL")
    await realToken.waitForDeployment()
    let axlAddress = await axlToken.getAddress()
    let realAddress = await realToken.getAddress()
    let axelarGateway = await deployAxelarGateway(admin, axlAddress, realAddress, admin, false)
    let gatewayAddress = await axelarGateway.getAddress()
    let escrow = await deployEscrow(
        gatewayAddress, realAddress, admin, "1000000000000000000000", admin, false)
    let escrowAddress = await escrow.getAddress()
    await axlToken.mint(gatewayAddress, "1000000000000000000000")
    await realToken.mint(gatewayAddress, "1000000000000000000000")
    await realToken.mint(escrowAddress, "1000000000000000000000")
    await escrow.grantRole(await escrow.DEPOSITOR_ROLE(), botAddress)
    await escrow.grantRole(await escrow.WITHDRAWER_ROLE(), botAddress)
    await axlToken.mint(botAddress, "1000000000000000000000")
    await realToken.mint(botAddress, "1000000000000000000000")
    console.log(`AxelarGateway: ${gatewayAddress}`)
    console.log(`Escrow:        ${escrowAddress}`)
    console.log(`\nBalances:`)
    console.log(`\tAG:  ${await realToken.balanceOf(gatewayAddress)} REAL`)
    console.log(`\tES:  ${await realToken.balanceOf(escrowAddress)} REAL`)
    console.log(`\tBOT: ${await realToken.balanceOf(botAddress)} REAL`)
}

init().then(() => {
    console.log("done")
})
    .catch(console.log)