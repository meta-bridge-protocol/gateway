# Gateway

## Overview
The gateway contracts provide a mechanism for users to create multiple pairs of real and bridged tokens, allowing them to swap bridged tokens for real tokens and vice versa.

## Project Structure
**contracts**: Contains Solidity smart contracts. \
**scripts**: Scripts for deploying and interacting with the contracts. \
**test**: Unit tests for the smart contracts.

## Getting Started
### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- A private key (for deploying on the chain)
- Etherscan API Key (for verifying contracts on the explorer)

### Installation
Clone the repository and install the dependencies:
```bash
git clone https://github.com/meta-bridge-protocol/gateway.git
cd gateway
npm install
```

### Configuration
Copy the .env.example file to .env and fill in the required details:
```bash
cp .env.example .env
```
`ETHERSCAN_API_KEY`: Your Etherscan API key. \
`NEW_MAIN_DEPLOYER`: The private key of the account for deploying contracts.

### Compile Contracts
Compile the smart contracts using Hardhat:
```bash
npx hardhat compile
```

### Deployment
Deploy the Gateway contract on a chain (e.g., Base):
```bash
npx hardhat run ./scripts/deployGateway.ts --network base
```

### Running Tests
Run the unit tests to ensure everything is working correctly:
```bash
npx hardhat test
```

### Verifying Contracts
By default, the contracts will be verified on the explorer after deployment. However, if there is an issue with verification, you can verify the deployed contracts manually:
```bash
npx hardhat verify --network <network-name> <contract-address> <constructor-arguments>
```

## License
This project is licensed under the MIT License.
