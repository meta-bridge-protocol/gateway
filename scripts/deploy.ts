import hre, { ethers } from "hardhat";
import { AxelarGateway } from "../typechain";

async function deployAxelarGateway(
  admin: string,
  axlToken: string,
  realToken: string,
  deployer: string
): Promise<AxelarGateway> {
  let factory = await ethers.getContractFactory("AxelarGateway", {
    signer: await ethers.getSigner(deployer),
  });
  let axelarGateway = await factory.deploy(admin, axlToken, realToken);
  await axelarGateway.deployTransaction.wait();
  await axelarGateway.deployed();
  try {
    await hre.run("verify:verify", {
      address: axelarGateway.address,
      constructorArguments: [admin, axlToken, realToken],
    });
  } catch {
    console.log("Failed to verify");
  }
  return axelarGateway as AxelarGateway;
}
