# Gateway

```shell
npx hardhat test
```

In this project, copy the .env.example file to a file named .env, and then edit it to fill in the details. Enter your Etherscan API key, and the private key of the account which will send the deployment transaction. With a valid .env file in place, first deploy your contract:

```shell
npx hardhat run ./scripts/deployGateway.ts --network base
```
