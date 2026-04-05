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
  - [Backend Setup (Python Server)](#backend-setup-python-server)
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
- **Trade NFTs** on the built-in marketplace
- **Track provenance** — the full ownership history of any registered asset

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎨 **NFT Minting** | Mint any digital content as an ERC-721 NFT with on-chain content hash |
| 🤖 **AI Fingerprinting** | Embed AI-generated fingerprints into NFT metadata |
| 🔏 **Watermarking** | Attach watermark metadata (type, algorithm) to content ownership records |
| 🪙 **Royalties (ERC-2981)** | Set creator royalties (up to 10%) that persist on every resale |
| 🛒 **NFT Marketplace** | List, browse, and buy NFTs directly in the platform |
| 🔍 **Ownership Verification** | Verify authenticity and content hash of any registered asset |
| 📜 **Provenance Tracking** | View the complete chain of custody for any NFT |
| 📦 **IPFS Storage** | Metadata and images stored on IPFS via Pinata for decentralised permanence |

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** + **Vite** | UI framework and build tooling |
| **TypeScript** | Type-safe development |
| **Tailwind CSS** + **shadcn/ui** | Styling and accessible UI components |
| **Ethers.js v6** | Ethereum wallet and contract interaction |
| **React Query** | Server-state and async data management |
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
| **OpenZeppelin v5** | Audited contract libraries |
| **Ethereum Sepolia** | Testnet deployment |

---

## 📁 Project Structure

```
netra-digital-ownership/
├── contracts/
│   ├── NetraOwnership.sol      # ERC-721 + ERC-2981 smart contract
│   └── DEPLOY.md               # Contract deployment guide (Remix IDE)
│
├── server/                     # Python Flask backend
│   ├── app.py                  # API routes (metadata generation + IPFS upload)
│   ├── requirements.txt        # Python dependencies
│   └── .env                    # Server secrets (not committed)
│
├── src/                        # React frontend source
│   ├── components/             # Reusable UI components
│   ├── config/                 # Contract ABI + address config
│   ├── hooks/                  # Custom React hooks (wallet, marketplace)
│   ├── pages/                  # Route-level pages
│   │   ├── Mint.tsx            # NFT minting flow
│   │   ├── NFTMarketplace.tsx  # Browse and buy NFTs
│   │   ├── NFTDetail.tsx       # Single NFT detail view
│   │   ├── Provenance.tsx      # Ownership history
│   │   ├── Verify.tsx          # Content verification
│   │   └── IPFS.tsx            # IPFS upload interface
│   └── utils/                  # Watermark algorithms, helpers
│
├── public/                     # Static assets
├── .env.example                # Environment variable template
├── .gitignore
├── package.json
└── vite.config.ts
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ and **npm** — [Download](https://nodejs.org/)
- **Python** 3.9+ — [Download](https://python.org/)
- **MetaMask** browser extension — [Install](https://metamask.io/)
- **Sepolia testnet ETH** — [Sepolia Faucet](https://sepoliafaucet.com/)
- **Pinata account** (free) — [Sign up](https://app.pinata.cloud/)

---

### Frontend Setup

```bash
# 1. Clone the repository
git clone https://github.com/Madmax729/NETRA-Decentralized-AI-Content-Ownership-Registry.git
cd NETRA-Decentralized-AI-Content-Ownership-Registry

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env
# Fill in your values in .env (see Environment Variables section below)

# 4. Start the development server
npm run dev
```

The frontend will be available at **http://localhost:5173**

---

### Backend Setup (Python Server)

The Flask server handles IPFS metadata generation and uploading.

```bash
# Navigate to server directory
cd server

# Create a virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create server environment file
# Create server/.env with:
# PINATA_JWT=your_pinata_jwt_here

# Start the server
python app.py
```

The backend API will be available at **http://localhost:5000**

---

### Smart Contract Deployment

The `NetraNFT` contract is deployed on **Ethereum Sepolia** testnet via Remix IDE.

See [`contracts/DEPLOY.md`](contracts/DEPLOY.md) for the step-by-step guide.

After deploying, update your `.env` file with the contract addresses.

---

## 🔐 Environment Variables

Copy `.env.example` to `.env` in the **project root** and fill in your values:

```env
# Deployed contract addresses (from Remix after deployment)
VITE_CONTRACT_ADDRESS=0xYourNetworkContractAddressHere
VITE_MARKETPLACE_ADDRESS=0xYourMarketplaceContractAddressHere

# Pinata IPFS JWT (from https://app.pinata.cloud/keys)
VITE_PINATA_JWT=your_pinata_jwt_here
```

Also create `server/.env` for the Python backend:

```env
# Pinata JWT for server-side IPFS metadata uploads
PINATA_JWT=your_pinata_jwt_here
```

> ⚠️ **Never commit your `.env` files.** They are included in `.gitignore`.

---

## 💡 Usage

### 1. Connect Wallet
Open the app and connect your MetaMask wallet. Make sure you're on the **Sepolia** testnet.

### 2. Mint an NFT
- Go to the **Mint** page
- Upload your digital content (image, file)
- Fill in name, description, and watermark settings
- The app will:
  1. Upload the image to IPFS via Pinata
  2. Generate ERC-721-compatible metadata with AI fingerprint + content hash
  3. Upload metadata JSON to IPFS
  4. Call `mintNFT()` on the smart contract
  5. Confirm the MetaMask transaction

### 3. Browse & Buy NFTs
- Visit the **Marketplace** page to see all listed NFTs
- Click any NFT to view its details and purchase it

### 4. Verify Ownership
- Go to the **Verify** page
- Enter a token ID or content hash to verify authenticity on-chain

### 5. Track Provenance
- Go to the **Provenance** page to see the complete ownership history of any NFT

---

## 📄 Smart Contract

**Contract Name:** `NetraNFT`  
**Network:** Ethereum Sepolia Testnet  
**Standards:** ERC-721 (NFT) + ERC-2981 (Royalties)

### Key Functions

| Function | Description |
|---|---|
| `mintNFT(metadataURI, contentHash, royaltyFee)` | Mint a new NFT with IPFS metadata URI, content hash, and royalty % |
| `contentHash(tokenId)` | Get the on-chain content hash for a token |
| `creator(tokenId)` | Get the original creator address of a token |
| `setDefaultRoyalty(receiver, feeNumerator)` | Set a global default royalty (owner only) |
| `royaltyInfo(tokenId, salePrice)` | ERC-2981: get royalty amount for a given sale price |

### Constraints
- Royalty fee is capped at **10%** (1000 basis points)
- Content hash must be non-zero
- Metadata URI must be non-empty
- Protected against reentrancy attacks

---

## 🌐 API Reference

The Flask backend exposes two endpoints:

### `GET /api/health`
Returns server status.
```json
{ "status": "ok", "service": "netra-backend" }
```

### `POST /api/metadata/generate`
Generates ERC-721 compatible metadata JSON from supplied fields.

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

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Make your changes and commit: `git commit -m 'feat: add your feature'`
4. Push to your fork: `git push origin feature/your-feature-name`
5. Open a Pull Request

Please make sure you **never commit `.env` files or any secrets**.

---

## 📃 License

This project is licensed under the **MIT License**.

---

<p align="center">
  Built with ❤️ for decentralized content ownership.
</p>
