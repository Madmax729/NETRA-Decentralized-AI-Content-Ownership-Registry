/**
 * localStorage-based storage for minted NFT metadata.
 * Stores metadata (name, description, CIDs) locally after minting.
 * Listing status is now primarily read from on-chain contract,
 * but we keep local cache fields for UI convenience.
 */

export interface OwnershipEvent {
    type: 'creation' | 'transfer' | 'listing' | 'unlisting' | 'sale';
    from: string;
    to?: string;
    timestamp: string;   // ISO
    txHash?: string;
    price?: string;      // tRBTC formatted
}

export interface MintedNFT {
    tokenId: string;
    txHash: string;
    name: string;
    description: string;
    imageCID: string;
    metadataCID: string;
    contentHash: string;
    aiFingerprint: string;
    watermarkType: string;
    royaltyPercent: number;
    owner: string;
    mintedAt: string; // ISO timestamp

    // Local listing cache (secondary source — contract is primary)
    isListed?: boolean;
    price?: string;          // tRBTC amount as string e.g. "0.05"
    currency?: string;       // "tRBTC"
    listedAt?: string;       // ISO timestamp

    // Ownership chain (locally augmented; on-chain Transfer events are primary)
    ownershipHistory?: OwnershipEvent[];
}

const STORAGE_KEY = "netra_minted_nfts";

/* ── Core CRUD ────────────────────────────────────────────────────── */

export function getMintedNFTs(): MintedNFT[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveAll(nfts: MintedNFT[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nfts));
}

export function saveMintedNFT(nft: MintedNFT): void {
    const existing = getMintedNFTs();
    // Avoid duplicates by tokenId
    const filtered = existing.filter((n) => n.tokenId !== nft.tokenId);
    // Auto-create creation event if no history exists
    if (!nft.ownershipHistory || nft.ownershipHistory.length === 0) {
        nft.ownershipHistory = [{
            type: 'creation',
            from: nft.owner,
            timestamp: nft.mintedAt,
            txHash: nft.txHash,
        }];
    }
    filtered.unshift(nft); // newest first
    saveAll(filtered);
}

/* ── Owner queries ────────────────────────────────────────────────── */

export function getMintedNFTsByOwner(ownerAddress: string): MintedNFT[] {
    return getMintedNFTs().filter(
        (n) => n.owner.toLowerCase() === ownerAddress.toLowerCase()
    );
}

/* ── Listing helpers (local cache – for UI before contract confirms) ─ */

/** Mark NFT as listed locally (after on-chain tx succeeds) */
export function markListed(
    tokenId: string,
    price: string,
    txHash?: string
): void {
    const all = getMintedNFTs();
    const idx = all.findIndex((n) => n.tokenId === tokenId);
    if (idx === -1) return;

    const now = new Date().toISOString();
    const prev = all[idx];
    const event: OwnershipEvent = {
        type: 'listing',
        from: prev.owner,
        timestamp: now,
        txHash,
        price,
    };

    all[idx] = {
        ...prev,
        isListed: true,
        price,
        currency: "tRBTC",
        listedAt: now,
        ownershipHistory: [...(prev.ownershipHistory ?? []), event],
    };
    saveAll(all);
}

/** Mark NFT as unlisted locally (after on-chain cancel succeeds) */
export function markUnlisted(tokenId: string, txHash?: string): void {
    const all = getMintedNFTs();
    const idx = all.findIndex((n) => n.tokenId === tokenId);
    if (idx === -1) return;

    const prev = all[idx];
    const event: OwnershipEvent = {
        type: 'unlisting',
        from: prev.owner,
        timestamp: new Date().toISOString(),
        txHash,
    };

    all[idx] = {
        ...prev,
        isListed: false,
        price: undefined,
        listedAt: undefined,
        ownershipHistory: [...(prev.ownershipHistory ?? []), event],
    };
    saveAll(all);
}

/** Update NFT owner after a sale/transfer (after on-chain tx) */
export function updateNFTOwner(
    tokenId: string,
    newOwner: string,
    price?: string,
    txHash?: string
): void {
    const all = getMintedNFTs();
    const idx = all.findIndex((n) => n.tokenId === tokenId);
    if (idx === -1) return;

    const prev = all[idx];
    const event: OwnershipEvent = {
        type: price ? 'sale' : 'transfer',
        from: prev.owner,
        to: newOwner,
        timestamp: new Date().toISOString(),
        txHash,
        price,
    };

    all[idx] = {
        ...prev,
        owner: newOwner,
        isListed: false,
        price: undefined,
        listedAt: undefined,
        ownershipHistory: [...(prev.ownershipHistory ?? []), event],
    };
    saveAll(all);
}

/** Get all locally stored NFTs that are marked as listed */
export function getListedNFTs(): MintedNFT[] {
    return getMintedNFTs().filter((n) => n.isListed);
}

/** Get listed NFTs by a specific owner */
export function getListedNFTsByOwner(ownerAddress: string): MintedNFT[] {
    return getMintedNFTs().filter(
        (n) =>
            n.isListed &&
            n.owner.toLowerCase() === ownerAddress.toLowerCase()
    );
}

/** Get unlisted NFTs by a specific owner (for "New Listing" picker) */
export function getUnlistedNFTsByOwner(ownerAddress: string): MintedNFT[] {
    return getMintedNFTs().filter(
        (n) =>
            !n.isListed &&
            n.owner.toLowerCase() === ownerAddress.toLowerCase()
    );
}

/** Get a single NFT by tokenId */
export function getNFTByTokenId(tokenId: string): MintedNFT | undefined {
    return getMintedNFTs().find((n) => n.tokenId === tokenId);
}

/** Get a single NFT by content hash (for provenance tracking) */
export function getNFTByContentHash(hash: string): MintedNFT | undefined {
    const normalised = hash.toLowerCase();
    return getMintedNFTs().find(
        (n) => n.contentHash.toLowerCase() === normalised
    );
}

// Legacy alias kept for backward compat
export const listNFT = markListed;
export const unlistNFT = markUnlisted;
export const transferNFT = updateNFTOwner;
