import { expect } from "chai"
import { ethers, upgrades } from "hardhat"
import { Signer } from "ethers"

describe("Escrow", () => {
	let escrow: any
	let axlToken: any
	let realToken: any
	let gateway: any
	let user1: Signer, user2: Signer, owner: Signer
	const thresholdAmount = 1500

	beforeEach(async () => {
		;[owner, user1, user2] = await ethers.getSigners()

		const TestToken = await ethers.getContractFactory("TestToken")
		axlToken = await TestToken.deploy("AXL Token", "AXL")
		await axlToken.waitForDeployment()

		realToken = await TestToken.deploy("Real Token", "REAL")
		await realToken.waitForDeployment()

		const AxelarGateway = await ethers.getContractFactory("AxelarGateway")
		gateway = await AxelarGateway.deploy(
			await owner.getAddress(),
			await axlToken.getAddress(),
			await realToken.getAddress()
		)
		await gateway.waitForDeployment()

		await axlToken.mint(await user1.getAddress(), 1000)
		await realToken.mint(await user1.getAddress(), 1000)

		await axlToken.mint(await gateway.getAddress(), 1000)
		await realToken.mint(await gateway.getAddress(), 1000)

		const Escrow = await ethers.getContractFactory("Escrow")
		escrow = await upgrades.deployProxy(Escrow, [
			await gateway.getAddress(),
			await realToken.getAddress(),
			await owner.getAddress(),
			thresholdAmount
		])
		await escrow.waitForDeployment()

		await axlToken.mint(await escrow.getAddress(), 1000)
		await realToken.mint(await escrow.getAddress(), 1000)

		await escrow.grantRole(await escrow.DEPOSITOR_ROLE(), await user1.getAddress())
		await escrow.grantRole(await escrow.WITHDRAWER_ROLE(), await user1.getAddress())
		await escrow.grantRole(await escrow.ASSET_MANAGER_ROLE(), await user2.getAddress())
	})

	describe("depositToPortal function", () => {
		it("should successfully deposit to the portal if the balance is under threshold", async () => {
			await escrow.connect(user1).depositToPortal()
		})

		it("should fail to deposit if the portal balance exceeds the threshold", async () => {
			await escrow.connect(user1).depositToPortal()
			await expect(escrow.connect(user1).depositToPortal()).to.be.revertedWith(
				"Escrow: Portal balance exceeds the threshold"
			)
		})

		it("should deposit as much as possible if the escrow balance is under the required amount", async () => {
			await escrow.setThresholdAmount(3000)
			await expect(escrow.connect(user1).depositToPortal())
				.to.emit(escrow, "DepositToPortal")
				.withArgs(1000, 3000)
		})

		it("should fail if the caller does not have DEPOSIT_ROLE", async () => {
			await expect(escrow.connect(user2).depositToPortal()).to.be.reverted
		})
	})

	describe("withdrawFromPortal function", () => {
		it("should successfully withdraw from the portal if the balance is above threshold", async () => {
			await escrow.connect(user1).depositToPortal()
			await realToken.mint(await gateway.getAddress(), 500)
			await escrow.connect(user1).withdrawFromPortal()
		})

		it("should fail to withdraw if the portal balance is below the threshold", async () => {
			await expect(escrow.connect(user1).withdrawFromPortal()).to.be.revertedWith(
				"Escrow: Portal balance is below the threshold"
			)
		})

		it("should fail if the caller does not have WITHDRAW_ROLE", async () => {
			await expect(escrow.connect(user2).withdrawFromPortal()).to.be.revertedWith
		})
	})

	describe("setThresholdAmount function", () => {
		it("should allow DEFAULT_ADMIN_ROLE to set a new threshold amount", async () => {
			const newThreshold = 2000
			await escrow.connect(owner).setThresholdAmount(newThreshold)
			expect(await escrow.thresholdAmount()).to.equal(newThreshold)
		})

		it("should fail if the caller is not DEFAULT_ADMIN_ROLE", async () => {
			const newThreshold = 2000
			await expect(escrow.connect(user1).setThresholdAmount(newThreshold)).to.be.reverted
		})
	})

	describe("withdraw function", () => {
		it("should allow DEFAULT_ADMIN_ROLE to withdraw tokens", async () => {
			const amount = 1000
			const beforeBalance = await realToken.balanceOf(await owner.getAddress())
			await escrow.connect(user2).withdrawERC20(await realToken.getAddress(), amount)
			const afterBalance = await realToken.balanceOf(await owner.getAddress())
			expect(afterBalance - beforeBalance).equal(amount)
		})

		it("should fail if the caller is not ASSET_MANAGER_ROLE", async () => {
			const amount = 1000
			await expect(
				escrow.connect(user1).withdrawERC20(await realToken.getAddress(), amount)
			).to.be.reverted
		})
	})
})
