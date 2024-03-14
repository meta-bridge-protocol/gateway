import { expect } from "chai";
import { ethers } from "hardhat";

describe("AxelarGateway", () => {
  let axlToken: any;
  let realToken: any;
  let gateway: any;
  let owner: any;
  let user: any;
  let recipient: any;

  beforeEach(async () => {
    [owner, user, recipient] = await ethers.getSigners();

    const TestToken = await ethers.getContractFactory("TestToken");
    axlToken = await TestToken.deploy("AXL Token", "AXL");
    await axlToken.waitForDeployment();

    realToken = await TestToken.deploy("Real Token", "REAL");
    await realToken.waitForDeployment();

    const AxelarGateway = await ethers.getContractFactory("AxelarGateway");
    gateway = await AxelarGateway.deploy(
      await owner.getAddress(),
      await axlToken.getAddress(),
      await realToken.getAddress()
    );
    await gateway.waitForDeployment();

    await axlToken.mint(await user.getAddress(), ethers.parseEther("1000"));
    await axlToken.mint(await gateway.getAddress(), ethers.parseEther("1000"));
    await realToken.mint(await gateway.getAddress(), ethers.parseEther("1000"));
    await realToken.mint(await user.getAddress(), ethers.parseEther("1000"));
  });

  describe("pausing functionality", () => {
    it("should pause and unpause the contract", async () => {
      await gateway
        .connect(owner)
        .grantRole(await gateway.PAUSER_ROLE(), await user.getAddress());
      await gateway.connect(user).pause();
      await expect(gateway.connect(user).swapToReal(1000)).to.be.revertedWith(
        "Pausable: paused"
      );

      await gateway
        .connect(owner)
        .grantRole(await gateway.UNPAUSER_ROLE(), await user.getAddress());
      await gateway.connect(user).unpause();
      await axlToken.mint(await user.getAddress(), 1000);
      await axlToken.connect(user).approve(await gateway.getAddress(), 1000);
      await gateway.connect(user).swapToReal(1000); // Should succeed
    });

    it("should not allow non-pauser to pause or unpause", async () => {
      await expect(gateway.connect(user).pause()).to.be.revertedWith(
        "AccessControl: account " +
          (await user.getAddress()) +
          " is missing role " +
          (await gateway.PAUSER_ROLE())
      );

      await gateway
        .connect(owner)
        .grantRole(await gateway.PAUSER_ROLE(), await user.getAddress());
      await gateway.connect(user).pause();

      await expect(gateway.connect(recipient).unpause()).to.be.revertedWith(
        "AccessControl: account " +
          (await recipient.getAddress().toLowerCase) +
          " is missing role " +
          (await gateway.UNPAUSER_ROLE())
      );
    });
  });

  describe("swap functionality", () => {
    it("should swap AXL to real tokens", async () => {
      const beforeBalance: any = await realToken.balanceOf(
        await user.getAddress()
      );
      const amount: any = ethers.parseEther("100");
      await axlToken.connect(user).approve(await gateway.getAddress(), amount);
      await gateway.connect(user).swapToReal(amount);
      const afterBalance: any = await realToken.balanceOf(
        await user.getAddress()
      );
      expect(afterBalance - beforeBalance).to.equal(amount);
    });

    it("should swap real to AXL tokens", async () => {
      const beforeBalance: any = await axlToken.balanceOf(
        await user.getAddress()
      );
      const amount: any = ethers.parseEther("100");
      await realToken.connect(user).approve(await gateway.getAddress(), amount);
      await gateway.connect(user).swapToAxl(amount);
      const afterBalance: any = await axlToken.balanceOf(
        await user.getAddress()
      );
      expect(afterBalance - beforeBalance).to.equal(amount);
    });

    it("should not allow swapping with zero amount", async () => {
      await expect(gateway.connect(user).swapToReal(0)).to.be.revertedWith(
        "AxelarGateway: AMOUNT_MUST_BE_GREATER_THAN_0"
      );
      await expect(gateway.connect(user).swapToAxl(0)).to.be.revertedWith(
        "AxelarGateway: AMOUNT_MUST_BE_GREATER_THAN_0"
      );
    });

    it("should not allow swapping to a zero address", async () => {
      const amount = ethers.parseEther("100");
      await axlToken.connect(user).approve(await gateway.getAddress(), amount);
      await expect(
        gateway.connect(user).swapToRealTo(amount, ethers.ZeroAddress)
      ).to.be.revertedWith("AxelarGateway: RECIPIENT_ADDRESS_MUST_BE_NON-ZERO");
    });

    it("should not allow swapping to a zero address", async () => {
      const amount = ethers.parseEther("100");
      await realToken.connect(user).approve(await gateway.getAddress(), amount);
      await expect(
        gateway.connect(user).swapToAxlTo(amount, ethers.ZeroAddress)
      ).to.be.revertedWith("AxelarGateway: RECIPIENT_ADDRESS_MUST_BE_NON-ZERO");
    });

    it("should not allow swapping if contract has insufficient balance", async () => {
      const amount = ethers.parseEther("10000");
      await axlToken.connect(user).approve(await gateway.getAddress(), amount);
      await expect(gateway.connect(user).swapToReal(amount)).to.be.revertedWith(
        "ERC20: transfer amount exceeds balance"
      );
    });
  });
  describe("deposit & withdraw functionality", () => {
    it("should deposit and update user balance", async () => {
      const amount = ethers.parseEther("1000");
      await realToken.mint(await user.getAddress(), ethers.parseEther("1000"));
      await realToken
        .connect(user)
        .approve(await gateway.getAddress(), ethers.parseEther("1000"));
      await gateway.connect(user).deposit(ethers.parseEther("1000"), 0);

      expect(await gateway.deposits(await user.getAddress())).to.equal(
        ethers.parseEther("1000")
      );
    });

    it("should not allow depsiting with zero amount", async () => {
      await expect(gateway.connect(user).deposit(0, 0)).to.be.revertedWith(
        "AxelarGateway: TOTAL_DEPOSIT_MUST_BE_GREATER_THAN_0"
      );
    });

    it("should withdraw and update user balance", async () => {
      await realToken
        .connect(user)
        .approve(await gateway.getAddress(), ethers.parseEther("2000"));
      await axlToken
        .connect(user)
        .approve(await gateway.getAddress(), ethers.parseEther("2000"));
      await gateway
        .connect(user)
        .deposit(ethers.parseEther("1000"), ethers.parseEther("500"));
      await gateway
        .connect(user)
        .withdraw(ethers.parseEther("500"), ethers.parseEther("200"));

      expect(await gateway.deposits(await user.getAddress())).to.equal(
        ethers.parseEther("800")
      );
      expect(await realToken.balanceOf(await user.getAddress())).to.equal(
        ethers.parseEther("500")
      );
      expect(await axlToken.balanceOf(await user.getAddress())).to.equal(
        ethers.parseEther("700")
      );

      await gateway
        .connect(user)
        .deposit(ethers.parseEther("0"), ethers.parseEther("100"));
      await gateway
        .connect(user)
        .withdraw(ethers.parseEther("0"), ethers.parseEther("100"));

      expect(await gateway.deposits(await user.getAddress())).to.equal(
        ethers.parseEther("800")
      );
      expect(await realToken.balanceOf(await user.getAddress())).to.equal(
        ethers.parseEther("500")
      );
      expect(await axlToken.balanceOf(await user.getAddress())).to.equal(
        ethers.parseEther("700")
      );

      await gateway
        .connect(user)
        .deposit(ethers.parseEther("100"), ethers.parseEther("0"));
      await gateway
        .connect(user)
        .withdraw(ethers.parseEther("100"), ethers.parseEther("0"));

      expect(await gateway.deposits(await user.getAddress())).to.equal(
        ethers.parseEther("800")
      );
      expect(await realToken.balanceOf(await user.getAddress())).to.equal(
        ethers.parseEther("500")
      );
      expect(await axlToken.balanceOf(await user.getAddress())).to.equal(
        ethers.parseEther("700")
      );
    });
    it("should not allow withdrawing with zero amount", async () => {
      await expect(gateway.connect(user).withdraw(0, 0)).to.be.revertedWith(
        "AxelarGateway: TOTAL_WITHDRAWAL_MUST_BE_GREATER_THAN_0"
      );
    });
    it("should not allow withdrawing with greater amount than user deposited amount", async () => {
      await expect(
        gateway
          .connect(user)
          .withdraw(ethers.parseEther("1500"), ethers.parseEther("1500"))
      ).to.be.revertedWith("AxelarGateway: INSUFFICIENT_USER_BALANCE");
    });
  });
});
