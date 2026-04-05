/**
 * Netra – Smart contract configuration
 *
 * Set VITE_CONTRACT_ADDRESS and VITE_MARKETPLACE_ADDRESS in your .env file
 * after deploying via Remix IDE.
 */

// ── Contract addresses (read from env) ──────────────────────────────────────
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "";
export const MARKETPLACE_ADDRESS = import.meta.env.VITE_MARKETPLACE_ADDRESS || "";

// Rootstock Testnet
export const ROOTSTOCK_TESTNET_CHAIN_ID = "0x1f"; // 31

export const isContractConfigured = (): boolean =>
    !!CONTRACT_ADDRESS &&
    CONTRACT_ADDRESS.startsWith("0x") &&
    CONTRACT_ADDRESS.length === 42;

export const isMarketplaceConfigured = (): boolean =>
    !!MARKETPLACE_ADDRESS &&
    MARKETPLACE_ADDRESS.startsWith("0x") &&
    MARKETPLACE_ADDRESS.length === 42;

// ── NFT Contract ABI (NetraNFT) ─────────────────────────────────────────────
export const CONTRACT_ABI = [
    // mintNFT(string metadataURI, bytes32 contentHash, uint96 royaltyFee)
    {
        inputs: [
            { internalType: "string", name: "metadataURI", type: "string" },
            { internalType: "bytes32", name: "contentHash", type: "bytes32" },
            { internalType: "uint96", name: "royaltyFee", type: "uint96" },
        ],
        name: "mintNFT",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    // tokenURI(uint256 tokenId) → string
    {
        inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
        name: "tokenURI",
        outputs: [{ internalType: "string", name: "", type: "string" }],
        stateMutability: "view",
        type: "function",
    },
    // ownerOf(uint256 tokenId) → address
    {
        inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
        name: "ownerOf",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    // approve(address to, uint256 tokenId)
    {
        inputs: [
            { internalType: "address", name: "to", type: "address" },
            { internalType: "uint256", name: "tokenId", type: "uint256" },
        ],
        name: "approve",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // getApproved(uint256 tokenId) → address
    {
        inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
        name: "getApproved",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    // royaltyInfo(uint256 tokenId, uint256 salePrice) → (address, uint256)
    {
        inputs: [
            { internalType: "uint256", name: "tokenId", type: "uint256" },
            { internalType: "uint256", name: "salePrice", type: "uint256" },
        ],
        name: "royaltyInfo",
        outputs: [
            { internalType: "address", name: "", type: "address" },
            { internalType: "uint256", name: "", type: "uint256" },
        ],
        stateMutability: "view",
        type: "function",
    },
    // contentHash(uint256 tokenId) → bytes32
    {
        inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
        name: "contentHash",
        outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
        stateMutability: "view",
        type: "function",
    },
    // creator(uint256 tokenId) → address
    {
        inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
        name: "creator",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    // NFTMinted event
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" },
            { indexed: true, internalType: "address", name: "creator", type: "address" },
            { indexed: false, internalType: "string", name: "metadataURI", type: "string" },
            { indexed: false, internalType: "bytes32", name: "contentHash", type: "bytes32" },
            { indexed: false, internalType: "uint96", name: "royaltyFee", type: "uint96" },
        ],
        name: "NFTMinted",
        type: "event",
    },
    // Transfer event (ERC-721)
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "address", name: "from", type: "address" },
            { indexed: true, internalType: "address", name: "to", type: "address" },
            { indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" },
        ],
        name: "Transfer",
        type: "event",
    },
] as const;

// ── Marketplace Contract ABI (NetraMarketplace) ─────────────────────────────
export const MARKETPLACE_ABI = [
    // listNFT(uint256 tokenId, uint256 price)
    {
        inputs: [
            { internalType: "uint256", name: "tokenId", type: "uint256" },
            { internalType: "uint256", name: "price", type: "uint256" },
        ],
        name: "listNFT",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // buyNFT(uint256 tokenId)
    {
        inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
        name: "buyNFT",
        outputs: [],
        stateMutability: "payable",
        type: "function",
    },
    // cancelListing(uint256 tokenId)
    {
        inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
        name: "cancelListing",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // listings(uint256 tokenId) → (address seller, uint256 price, bool active)
    {
        inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
        name: "listings",
        outputs: [
            { internalType: "address", name: "seller", type: "address" },
            { internalType: "uint256", name: "price", type: "uint256" },
            { internalType: "bool", name: "active", type: "bool" },
        ],
        stateMutability: "view",
        type: "function",
    },
    // netraNFT() → address
    {
        inputs: [],
        name: "netraNFT",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    // NFTListed event
    {
        anonymous: false,
        inputs: [
            { indexed: false, internalType: "uint256", name: "tokenId", type: "uint256" },
            { indexed: false, internalType: "address", name: "seller", type: "address" },
            { indexed: false, internalType: "uint256", name: "price", type: "uint256" },
        ],
        name: "NFTListed",
        type: "event",
    },
    // NFTSold event
    {
        anonymous: false,
        inputs: [
            { indexed: false, internalType: "uint256", name: "tokenId", type: "uint256" },
            { indexed: false, internalType: "address", name: "buyer", type: "address" },
            { indexed: false, internalType: "uint256", name: "price", type: "uint256" },
        ],
        name: "NFTSold",
        type: "event",
    },
    // ListingCancelled event
    {
        anonymous: false,
        inputs: [
            { indexed: false, internalType: "uint256", name: "tokenId", type: "uint256" },
        ],
        name: "ListingCancelled",
        type: "event",
    },
] as const;
