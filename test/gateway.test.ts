import {expect} from "chai"
import {ethers} from "hardhat"
import {Signer} from "ethers"

describe("Gateway", () => {
    let bridgedToken: any
    let realToken: any
    let gateway: any
    let recipient: Signer, user: Signer, owner: Signer
    let tokenId: any

    beforeEach(async () => {
        ;[owner, user, recipient] = await ethers.getSigners()

        const TestToken = await ethers.getContractFactory("TestToken")
        bridgedToken = await TestToken.deploy("Bridged Token", "BRG")
        await bridgedToken.waitForDeployment()

        realToken = await TestToken.deploy("Real Token", "REAL")
        await realToken.waitForDeployment()

        const Gateway = await ethers.getContractFactory("Gateway")
        gateway = await Gateway.deploy(
            await owner.getAddress(),
            await owner.getAddress()
        )
        await gateway.waitForDeployment()
        await gateway.addToken(
            await realToken.getAddress(),
            await bridgedToken.getAddress()
        )
        tokenId = await gateway.tokensFromReal(await realToken.getAddress())

        await bridgedToken.mint(await user.getAddress(), 1000)
        await bridgedToken.mint(await gateway.getAddress(), 1000)
        await realToken.mint(await gateway.getAddress(), 1000)
        await realToken.mint(await user.getAddress(), 1000)
    })

    describe("pausing functionality", () => {
        it("should pause and unpause the contract", async () => {
            await gateway.connect(owner).grantRole(await gateway.PAUSER_ROLE(), await user.getAddress())
            await gateway.connect(user).pause()
            await expect(gateway.connect(user).swapToReal(tokenId, 1000)).to.be.reverted

            await gateway.connect(owner).grantRole(await gateway.UNPAUSER_ROLE(), await user.getAddress())
            await gateway.connect(user).unpause()
            await bridgedToken.mint(await user.getAddress(), 1000)
            await bridgedToken.connect(user).approve(await gateway.getAddress(), 1000)
            await gateway.connect(user).swapToReal(tokenId, 1000) // Should succeed
        })

        it("should not allow non-pauser to pause or unpause", async () => {
            await expect(gateway.connect(user).pause()).to.be.reverted
            await gateway.connect(owner).grantRole(await gateway.PAUSER_ROLE(), await user.getAddress())
            await gateway.connect(user).pause()

            await expect(gateway.connect(recipient).unpause()).to.be.reverted
        })
    })

    describe("swap functionality", () => {
        it("should swap bridged to real tokens", async () => {
            const beforeBalance: any = await realToken.balanceOf(await user.getAddress())
            const amount: any = 100
            await bridgedToken.connect(user).approve(await gateway.getAddress(), amount)
            await gateway.connect(user).swapToReal(tokenId, amount)
            const afterBalance: any = await realToken.balanceOf(await user.getAddress())
            expect(afterBalance - beforeBalance).to.equal(amount)
        })

        it("should swap real to bridged tokens", async () => {
            const beforeBalance: any = await bridgedToken.balanceOf(await user.getAddress())
            const amount: any = 100
            await realToken.connect(user).approve(await gateway.getAddress(), amount)
            await gateway.connect(user).swapToBridged(tokenId, amount)
            const afterBalance: any = await bridgedToken.balanceOf(await user.getAddress())
            expect(afterBalance - beforeBalance).to.equal(amount)
        })

        it("should not allow swapping with zero amount", async () => {
            await expect(gateway.connect(user).swapToReal(tokenId, 0)).to.be.revertedWith(
                "Gateway: AMOUNT_MUST_BE_GREATER_THAN_0"
            )
            await expect(gateway.connect(user).swapToBridged(tokenId, 0)).to.be.revertedWith(
                "Gateway: AMOUNT_MUST_BE_GREATER_THAN_0"
            )
        })

        it("should not allow swapping to a zero address", async () => {
            const amount = 100
            await bridgedToken.connect(user).approve(await gateway.getAddress(), amount)
            await expect(gateway.connect(user).swapToRealTo(tokenId, amount, ethers.ZeroAddress)).to.be.revertedWith(
                "Gateway: RECIPIENT_ADDRESS_MUST_BE_NON-ZERO"
            )
        })

        it("should not allow swapping to a zero address", async () => {
            const amount = 100
            await realToken.connect(user).approve(await gateway.getAddress(), amount)
            await expect(gateway.connect(user).swapToBridgedTo(tokenId, amount, ethers.ZeroAddress)).to.be.revertedWith(
                "Gateway: RECIPIENT_ADDRESS_MUST_BE_NON-ZERO"
            )
        })

        it("should not allow swapping if contract has insufficient balance", async () => {
            const amount = 10000
            await bridgedToken.connect(user).approve(await gateway.getAddress(), amount)
            await expect(gateway.connect(user).swapToReal(tokenId, amount)).to.be.reverted
        })
    })
    describe("deposit & withdraw functionality", () => {
        it("should deposit and update user balance", async () => {
            await realToken.mint(await user.getAddress(), 1000)
            await realToken.connect(user).approve(await gateway.getAddress(), 1000)
            await gateway.connect(user).deposit(tokenId, 1000, 0)

            expect(await gateway.deposits(tokenId, await user.getAddress())).to.equal(1000)
        })

        it("should not allow depsiting with zero amount", async () => {
            await expect(gateway.connect(user).deposit(tokenId, 0, 0)).to.be.revertedWith(
                "Gateway: TOTAL_DEPOSIT_MUST_BE_GREATER_THAN_0"
            )
        })

        it("should withdraw and update user balance", async () => {
            const userAddress = await user.getAddress()
            await realToken.connect(user).approve(await gateway.getAddress(), 2000)
            await bridgedToken.connect(user).approve(await gateway.getAddress(), 2000)
            await gateway.connect(user).deposit(tokenId, 1000, 500)
            await gateway.connect(user).withdraw(tokenId, 500, 200)

            expect(await gateway.deposits(tokenId, userAddress)).to.equal(800)
            expect(await realToken.balanceOf(userAddress)).to.equal(500)
            expect(await bridgedToken.balanceOf(userAddress)).to.equal(700)

            await gateway.connect(user).deposit(tokenId, 0, 100)
            await gateway.connect(user).withdraw(tokenId, 0, 100)

            expect(await gateway.deposits(tokenId, userAddress)).to.equal(800)
            expect(await realToken.balanceOf(userAddress)).to.equal(500)
            expect(await bridgedToken.balanceOf(userAddress)).to.equal(700)

            await gateway.connect(user).deposit(tokenId, 100, 0)
            await gateway.connect(user).withdraw(tokenId, 100, 0)

            expect(await gateway.deposits(tokenId, userAddress)).to.equal(800)
            expect(await realToken.balanceOf(userAddress)).to.equal(500)
            expect(await bridgedToken.balanceOf(userAddress)).to.equal(700)
        })
        it("should not allow withdrawing with zero amount", async () => {
            await expect(gateway.connect(user).withdraw(tokenId, 0, 0)).to.be.revertedWith(
                "Gateway: TOTAL_WITHDRAWAL_MUST_BE_GREATER_THAN_0"
            )
        })
        it("should not allow withdrawing with greater amount than user deposited amount", async () => {
            await expect(gateway.connect(user).withdraw(tokenId, 1500, 1500)).to.be.revertedWith(
                "Gateway: INSUFFICIENT_USER_BALANCE"
            )
        })
    })
})
