# Deploying NetraOwnership on Ethereum Sepolia

## Prerequisites
- MetaMask with Sepolia ETH (get from [Sepolia Faucet](https://sepoliafaucet.com/))
- [Remix IDE](https://remix.ethereum.org)

## Steps

### 1. Open Remix IDE
Go to https://remix.ethereum.org

### 2. Create Contract File
- In the File Explorer, create `NetraOwnership.sol`
- Paste the contents of `contracts/NetraOwnership.sol`

### 3. Install OpenZeppelin
In Remix, the `@openzeppelin/contracts` imports resolve automatically.
If they don't, add the NPM package via the Plugin Manager or use flattened source.

### 4. Compile
- Go to **Solidity Compiler** tab
- Select compiler `0.8.20` (or higher `0.8.x`)
- Enable **optimization** (200 runs)
- Click **Compile NetraOwnership.sol**

### 5. Deploy
- Go to **Deploy & Run Transactions** tab
- **Environment**: `Injected Provider - MetaMask`
- Ensure MetaMask is on **Sepolia** network
- Select `NetraOwnership` contract
- Click **Deploy** → confirm the MetaMask transaction
- Copy the deployed **contract address**

### 6. Update Frontend
Open `src/config/contract.ts` and replace the placeholder:

```ts
export const CONTRACT_ADDRESS = "0xYOUR_DEPLOYED_ADDRESS_HERE";
```

### 7. Verify (Optional)
- Go to [Sepolia Etherscan](https://sepolia.etherscan.io/)
- Find your contract → **Verify & Publish**
- Use "Solidity (Single file)" or "Solidity (Standard JSON)"
- Paste source, select compiler `0.8.20`, optimization 200 runs

## ABI Export
After compilation in Remix:
1. Go to Compiler tab → click ABI copy icon
2. The ABI is already embedded in `src/config/contract.ts`
