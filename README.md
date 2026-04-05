# NETRA — Decentralized AI Content Ownership Registry

> A blockchain-powered platform to mint, verify, and trade digital content as NFTs with AI fingerprinting, watermarking, and provenance tracking — built on Ethereum (Sepolia Testnet).

---

## 📌 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Frontend Setup](#frontend-setup)
  - [Backend Setup](#backend-setup-python-server)
  - [Smart Contract Deployment](#smart-contract-deployment)
- [Environment Variables](#environment-variables)
- [Usage](#usage)
- [Smart Contract](#smart-contract)
- [API Reference](#api-reference)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**NETRA** (Network for Transparent Rights Attribution) is a decentralized application (dApp) that allows digital content creators to:

- **Register** their work on the Ethereum blockchain as an ERC-721 NFT
- **Embed AI fingerprints and watermarks** into their content metadata
- **Prove ownership** with an immutable, on-chain content hash
- **Trade NFTs** on a built-in decentralized marketplace
- **Track provenance** — the full ownership history of any registered asset

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎨 **NFT Minting** | Mint any digital content as an ERC-721 NFT with an on-chain content hash |
| 🤖 **AI Fingerprinting** | Embed AI-generated fingerprints into NFT metadata for content authenticity |
| 🔏 **Watermarking** | Attach watermark metadata (type, algorithm) to content ownership records |
| 🪙 **Royalties (ERC-2981)** | Set creator royalties (up to 10%) that persist on every future resale |
| 🛒 **NFT Marketplace** | List, browse, and buy NFTs directly within the platform |
| 🔍 **Ownership Verification** | Verify authenticity and content hash of any registered asset on-chain |
| 📜 **Provenance Tracking** | View the complete chain of custody for any NFT |
| 📦 **IPFS Storage** | Metadata and images stored on IPFS via Pinata for decentralized permanence |

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** + **Vite** | UI framework and build tooling |
| **TypeScript** | Type-safe development |
| **Tailwind CSS** + **shadcn/ui** | Styling and accessible UI components |
| **Ethers.js v6** | Ethereum wallet and smart contract interaction |
| **React Query** | Async data and server-state management |
| **React Router v6** | Client-side routing |

### Backend (Python)
| Technology | Purpose |
|---|---|
| **Flask** | Lightweight REST API server |
| **Flask-CORS** | Cross-origin request handling |
| **Pinata API** | IPFS metadata pinning service |
| **python-dotenv** | Environment variable management |

### Blockchain
| Technology | Purpose |
|---|---|
| **Solidity ^0.8.20** | Smart contract language |
| **ERC-721** | NFT standard |
| **ERC-2981** | On-chain royalty standard |
| **OpenZeppelin v5** | Audited, battle-tested contract libraries |
| **Ethereum Sepolia** | Testnet deployment network |

---

## 📁 Project Structure

```
netra-digital-ownership/
├── contracts/
│   ├── NetraOwnership.sol      # ERC-721 + ERC-2981 smart contract
│   └── DEPLOY.md               # Contract deployment guide (Remix IDE)
│
├── server/                     # Python Flask backend
│   ├── app.py                  # API routes: metadata generation + IPFS upload
│   ├── requirements.txt        # Python dependencies
│   └── .env                    # Server secrets (not committed — see .env.example)
│
├── src/                        # React frontend source
│   ├── components/             # Reusable UI components
│   ├── config/                 # Contract ABI + deployed address config
│   ├── hooks/                  # Custom React hooks (wallet, marketplace)
│   ├── pages/
│   │   ├── Mint.tsx            # NFT minting flow
│   │   ├── NFTMarketplace.tsx  # Browse and buy NFTs
│   │   ├── NFTDetail.tsx       # Single NFT detail view
│   │   ├── Provenance.tsx      # Ownership history explorer
│   │   ├── Verify.tsx          # Content verification tool
│   │   └── IPFS.tsx            # IPFS upload interface
│   └── utils/                  # Watermark algorithms and helper utilities
│
├── public/                     # Static assets
├── .env.example                # Environment variable template (safe to commit)
├── .gitignore
├── package.json
└── vite.config.ts
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed and set up before proceeding:

- **Node.js** v18+ and **npm** — [Download](https://nodejs.org/)
- **Python** 3.9+ — [Download](https://python.org/)
- **MetaMask** browser extension — [Install](https://metamask.io/)
- **Sepolia testnet ETH** — [Sepolia Faucet](https://sepoliafaucet.com/)
- **Pinata account** (free tier is enough) — [Sign up](https://app.pinata.cloud/)

---

### Frontend Setup

```bash
# 1. Clone the repository
git clone https://github.com/Madmax729/NETRA-Decentralized-AI-Content-Ownership-Registry.git
cd NETRA-Decentralized-AI-Content-Ownership-Registry

# 2. Install dependencies
npm install

# 3. Set up your environment variables
cp .env.example .env
# Open .env and fill in your values (contract addresses + Pinata JWT)

# 4. Start the development server
npm run dev
```

The frontend will be available at **http://localhost:5173**

---

### Backend Setup (Python Server)

The Flask server handles IPFS metadata generation and uploading via Pinata.

```bash
# 1. Navigate to the server directory
cd server

# 2. Create a Python virtual environment
python -m venv venv

# 3. Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# 4. Install Python dependencies
pip install -r requirements.txt

# 5. Create the server environment file
# Create a file at server/.env with the following:
# PINATA_JWT=your_pinata_jwt_here

# 6. Start the Flask server
python app.py
```

The backend API will be available at **http://localhost:5000**

---

### Smart Contract Deployment

The `NetraNFT` contract is deployed on **Ethereum Sepolia** testnet using Remix IDE.

Refer to [`contracts/DEPLOY.md`](contracts/DEPLOY.md) for the complete step-by-step deployment guide.

After deploying, copy the contract address and update your `.env` file:

```env
VITE_CONTRACT_ADDRESS=0xYourDeployedContractAddress
```

---

## 🔐 Environment Variables

Copy `.env.example` to `.env` in the **project root** and fill in your values:

```env
# Deployed smart contract addresses (from Remix after deployment)
VITE_CONTRACT_ADDRESS=0xYourNetworkContractAddressHere
VITE_MARKETPLACE_ADDRESS=0xYourMarketplaceContractAddressHere

# Pinata IPFS JWT token (from https://app.pinata.cloud/keys)
VITE_PINATA_JWT=your_pinata_jwt_here
```

Also create `server/.env` for the Python backend:

```env
# Pinata JWT for server-side IPFS metadata uploads
PINATA_JWT=your_pinata_jwt_here
```

> ⚠️ **Never commit your `.env` files.** They are already excluded via `.gitignore`.

---

## 💡 Usage

### 1. Connect Your Wallet
Open the app and connect your MetaMask wallet. Switch to the **Sepolia** testnet.

### 2. Mint an NFT
- Navigate to the **Mint** page
- Upload your digital content (image or file)
- Fill in name, description, watermark type, and royalty percentage
- The app will automatically:
  1. Upload the image to IPFS via Pinata
  2. Generate ERC-721-compatible metadata with AI fingerprint and content hash
  3. Upload the metadata JSON to IPFS
  4. Call `mintNFT()` on the deployed smart contract
  5. Prompt you to confirm the transaction in MetaMask

### 3. Browse & Buy NFTs
- Visit the **Marketplace** page to see all listed NFTs
- Click any NFT to view full details and purchase it

### 4. Verify Ownership
- Go to the **Verify** page
- Enter a token ID or content hash to verify authenticity directly on-chain

### 5. Track Provenance
- Visit the **Provenance** page
- View the complete ownership history for any registered NFT

---

## 📄 Smart Contract

**Contract:** `NetraNFT`  
**Network:** Ethereum Sepolia Testnet  
**Standards:** ERC-721 (NFT) + ERC-2981 (On-chain Royalties)  
**Libraries:** OpenZeppelin v5

### Key Functions

| Function | Description |
|---|---|
| `mintNFT(metadataURI, contentHash, royaltyFee)` | Mint a new NFT with an IPFS metadata URI, content hash, and royalty basis points |
| `contentHash(tokenId)` | Returns the on-chain content hash for a given token ID |
| `creator(tokenId)` | Returns the original creator's wallet address |
| `setDefaultRoyalty(receiver, feeNumerator)` | Set a global default royalty (contract owner only) |
| `royaltyInfo(tokenId, salePrice)` | ERC-2981: returns the royalty amount for a given sale price |

### Constraints
- Royalty fee capped at **10%** (1000 basis points)
- Content hash must be non-zero bytes32
- Metadata URI must not be empty
- ReentrancyGuard protects all state-changing functions

---

## 🌐 API Reference

The Python Flask backend exposes the following endpoints:

### `GET /api/health`
Health check — returns service status.
```json
{ "status": "ok", "service": "netra-backend" }
```

---

### `POST /api/metadata/generate`
Generates ERC-721 compatible metadata JSON.

**Request Body:**
```json
{
  "name": "My Artwork",
  "description": "A digital painting",
  "imageCID": "bafybeig...",
  "contentHash": "0xabc123...",
  "aiFingerprint": "fp-xyz...",
  "watermarkType": "invisible",
  "royaltyPercent": 5
}
```

**Response:**
```json
{
  "metadata": {
    "name": "My Artwork",
    "image": "ipfs://bafybeig...",
    "attributes": [...]
  }
}
```

---

### `POST /api/metadata/upload`
Pins the provided metadata JSON to IPFS via Pinata.

**Request Body:**
```json
{ "metadata": { ... } }
```

**Response:**
```json
{
  "metadataCID": "bafybeig...",
  "metadataURI": "ipfs://bafybeig...",
  "gatewayUrl": "https://gateway.pinata.cloud/ipfs/bafybeig..."
}
```

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: describe your change'`
4. Push to your fork: `git push origin feature/your-feature`
5. Open a Pull Request

> Please make sure you **never commit `.env` files or any secrets**.

---

## 📃 License

This project is licensed under the **MIT License**.

---

<p align="center">
  Built with ❤️ for decentralized content ownership.
</p>
