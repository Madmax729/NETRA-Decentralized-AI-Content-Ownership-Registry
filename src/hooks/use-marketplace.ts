/**
 * use-marketplace – hook for interacting with the NetraMarketplace contract.
 *
 * ARCHITECTURE: Uses DIRECT contract reads (listings mapping) for reliability.
 * Event queries (queryFilter) are avoided for primary listing display because
 * Rootstock Testnet RPC indexing can lag behind transaction confirmation.
 *
 * Flow:
 *   1. Local NFTs → directly poll `listings(tokenId)` for each known tokenId
 *   2. Cross-account NFTs → try event scan limited to last 5000 blocks
 *   3. Merge both into a single list
 */

import { useCallback, useState } from "react";
import { ethers } from "ethers";
import {
    CONTRACT_ADDRESS,
    CONTRACT_ABI,
    MARKETPLACE_ADDRESS,
    MARKETPLACE_ABI,
    isContractConfigured,
    isMarketplaceConfigured,
} from "@/config/contract";
import { useWallet } from "./use-wallet";

/* ── Types ──────────────────────────────────────────────────────────── */

export interface OnChainListing {
    tokenId: string;
    seller: string;
    price: bigint;
    priceFormatted: string;
    active: boolean;
    // Metadata (may be populated from localStorage or IPFS)
    name?: string;
    description?: string;
    imageCID?: string;
    metadataCID?: string;
}

export interface TransferEvent {
    from: string;
    to: string;
    tokenId: string;
    txHash: string;
    blockNumber: number;
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

function getSigner() {
    const eth = (window as any).ethereum;
    if (!eth) throw new Error("MetaMask not found");
    const provider = new ethers.BrowserProvider(eth);
    return provider.getSigner();
}

function getProvider() {
    const eth = (window as any).ethereum;
    if (!eth) throw new Error("MetaMask not found");
    return new ethers.BrowserProvider(eth);
}

function getNFTContract(signerOrProvider: ethers.Signer | ethers.Provider) {
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerOrProvider);
}

function getMarketplaceContract(signerOrProvider: ethers.Signer | ethers.Provider) {
    return new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signerOrProvider);
}

/** Fetch NFT metadata from IPFS */
async function fetchNFTMetadata(tokenURI: string) {
    try {
        let url = tokenURI;
        let metadataCID = "";
        if (tokenURI.startsWith("ipfs://")) {
            metadataCID = tokenURI.slice(7);
            url = `https://gateway.pinata.cloud/ipfs/${metadataCID}`;
        }
        const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
        if (!res.ok) return null;
        const data = await res.json();
        let imageCID = "";
        if (data.image?.startsWith("ipfs://")) imageCID = data.image.slice(7);
        return { name: data.name || `NFT`, description: data.description || "", imageCID, metadataCID };
    } catch {
        return null;
    }
}

/* ── Hook ────────────────────────────────────────────────────────────── */

export function useMarketplace() {
    const { address } = useWallet();

    const [isApproving, setIsApproving] = useState(false);
    const [isListing, setIsListing] = useState(false);
    const [isBuying, setIsBuying] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    /* ── List an NFT ────────────────────────────────────── */
    const listNFT = useCallback(async (tokenId: string, priceInTRBTC: string) => {
        if (!isContractConfigured() || !isMarketplaceConfigured()) {
            throw new Error("Contract addresses not configured");
        }
        const signer = await getSigner();
        const nftContract = getNFTContract(signer);
        const marketplace = getMarketplaceContract(signer);
        const tokenIdBN = BigInt(tokenId);
        const priceWei = ethers.parseEther(priceInTRBTC);

        // Step 1: Approve marketplace if not already
        const approved = await nftContract.getApproved(tokenIdBN);
        if (approved.toLowerCase() !== MARKETPLACE_ADDRESS.toLowerCase()) {
            setIsApproving(true);
            try {
                const approveTx = await nftContract.approve(MARKETPLACE_ADDRESS, tokenIdBN);
                await approveTx.wait();
            } finally {
                setIsApproving(false);
            }
        }

        // Step 2: List on marketplace
        setIsListing(true);
        try {
            const listTx = await marketplace.listNFT(tokenIdBN, priceWei);
            const txHash = listTx.hash;
            await listTx.wait();
            return { txHash, success: true };
        } finally {
            setIsListing(false);
        }
    }, []);

    /* ── Buy an NFT ─────────────────────────────────────── */
    const buyNFT = useCallback(async (tokenId: string, priceWei: bigint) => {
        if (!isMarketplaceConfigured()) throw new Error("Marketplace address not configured");
        setIsBuying(true);
        try {
            const signer = await getSigner();
            const marketplace = getMarketplaceContract(signer);
            const tx = await marketplace.buyNFT(BigInt(tokenId), { value: priceWei });
            const txHash = tx.hash;
            await tx.wait();

            // Save purchased NFT to buyer's localStorage
            const buyerAddress = await signer.getAddress();
            await _savePurchasedNFT(tokenId, buyerAddress, priceWei, txHash);

            return { txHash, success: true };
        } finally {
            setIsBuying(false);
        }
    }, []);

    /* ── Cancel a listing ───────────────────────────────── */
    const cancelListing = useCallback(async (tokenId: string) => {
        if (!isMarketplaceConfigured()) throw new Error("Marketplace address not configured");
        setIsCancelling(true);
        try {
            const signer = await getSigner();
            const marketplace = getMarketplaceContract(signer);
            const tx = await marketplace.cancelListing(BigInt(tokenId));
            const txHash = tx.hash;
            await tx.wait();
            return { txHash, success: true };
        } finally {
            setIsCancelling(false);
        }
    }, []);

    /* ── Read a single listing (direct contract read) ────── */
    const getListing = useCallback(async (tokenId: string): Promise<OnChainListing | null> => {
        if (!isMarketplaceConfigured()) return null;
        try {
            const provider = getProvider();
            const marketplace = getMarketplaceContract(provider);
            const [seller, price, active] = await marketplace.listings(BigInt(tokenId));
            if (!active) return null;
            return { tokenId, seller, price, priceFormatted: ethers.formatEther(price), active };
        } catch {
            return null;
        }
    }, []);

    /**
     * getActiveListings – RELIABLE approach:
     * 1. Direct-read all locally known tokenIds from `marketplace.listings()`
     * 2. Try event scan for cross-account NFTs (best-effort, limited range)
     * 3. Merge, dedup, return all active listings with metadata
     */
    const getActiveListings = useCallback(async (): Promise<OnChainListing[]> => {
        if (!isMarketplaceConfigured()) return [];

        const provider = getProvider();
        const marketplace = getMarketplaceContract(provider);
        const nftContract = getNFTContract(provider);

        const listingsMap = new Map<string, OnChainListing>();

        // ── Step 1: Check all locally known NFTs directly ──────────────────
        try {
            const { getMintedNFTs, getNFTByTokenId } = await import("@/utils/mintedNFTs");
            const localNFTs = getMintedNFTs();

            await Promise.all(
                localNFTs.map(async (nft) => {
                    try {
                        const [seller, price, active] = await marketplace.listings(BigInt(nft.tokenId));
                        if (active) {
                            const local = getNFTByTokenId(nft.tokenId);
                            listingsMap.set(nft.tokenId, {
                                tokenId: nft.tokenId,
                                seller,
                                price,
                                priceFormatted: ethers.formatEther(price),
                                active,
                                name: local?.name ?? nft.name,
                                description: local?.description ?? nft.description,
                                imageCID: local?.imageCID ?? nft.imageCID,
                                metadataCID: local?.metadataCID ?? nft.metadataCID,
                            });
                        }
                    } catch {
                        // ignore per-token errors
                    }
                })
            );
        } catch (e) {
            console.warn("Local NFT direct-read failed:", e);
        }

        // ── Step 2: Event scan for cross-account NFTs (limited range, best-effort) ──
        try {
            const latest = await provider.getBlockNumber();
            const fromBlock = Math.max(0, latest - 5000); // only last 5000 blocks
            const listedFilter = marketplace.filters.NFTListed();
            const events = await marketplace.queryFilter(listedFilter, fromBlock, latest);

            const crossAccountTokenIds = new Set<string>();
            for (const ev of events) {
                const parsed = marketplace.interface.parseLog({
                    topics: ev.topics as string[],
                    data: ev.data,
                });
                if (parsed) {
                    const tid = parsed.args.tokenId.toString();
                    if (!listingsMap.has(tid)) crossAccountTokenIds.add(tid);
                }
            }

            await Promise.all(
                Array.from(crossAccountTokenIds).map(async (tokenId) => {
                    try {
                        const [seller, price, active] = await marketplace.listings(BigInt(tokenId));
                        if (!active) return;

                        // Fetch metadata from IPFS
                        let meta: { name?: string; description?: string; imageCID?: string; metadataCID?: string } | null = null;
                        try {
                            const tokenURI: string = await nftContract.tokenURI(BigInt(tokenId));
                            meta = await fetchNFTMetadata(tokenURI);
                        } catch { /* no metadata */ }

                        listingsMap.set(tokenId, {
                            tokenId,
                            seller,
                            price,
                            priceFormatted: ethers.formatEther(price),
                            active,
                            name: meta?.name ?? `NFT #${tokenId}`,
                            description: meta?.description ?? "",
                            imageCID: meta?.imageCID ?? "",
                            metadataCID: meta?.metadataCID ?? "",
                        });
                    } catch { /* ignore */ }
                })
            );
        } catch {
            // Event scan failed — that's OK, we already have local results
        }

        return Array.from(listingsMap.values());
    }, []);

    /* ── Transfer history (limited block range) ─────────── */
    const getTransferHistory = useCallback(async (tokenId: string): Promise<TransferEvent[]> => {
        if (!isContractConfigured()) return [];
        try {
            const provider = getProvider();
            const nft = getNFTContract(provider);
            const latest = await provider.getBlockNumber();
            const fromBlock = Math.max(0, latest - 200000);

            const filter = nft.filters.Transfer(null, null, BigInt(tokenId));
            const events = await nft.queryFilter(filter, fromBlock, latest);

            return events
                .map((ev) => {
                    const parsed = nft.interface.parseLog({
                        topics: ev.topics as string[],
                        data: ev.data,
                    });
                    if (!parsed) return null;
                    return {
                        from: parsed.args.from,
                        to: parsed.args.to,
                        tokenId: parsed.args.tokenId.toString(),
                        txHash: ev.transactionHash,
                        blockNumber: ev.blockNumber,
                    };
                })
                .filter(Boolean) as TransferEvent[];
        } catch (err) {
            console.error("Failed to fetch transfer history:", err);
            return [];
        }
    }, []);

    /* ── On-chain owner ─────────────────────────────────── */
    const getOnChainOwner = useCallback(async (tokenId: string): Promise<string | null> => {
        if (!isContractConfigured()) return null;
        try {
            const provider = getProvider();
            const nft = getNFTContract(provider);
            return await nft.ownerOf(BigInt(tokenId));
        } catch {
            return null;
        }
    }, []);

    return {
        listNFT,
        buyNFT,
        cancelListing,
        getListing,
        getActiveListings,
        getTransferHistory,
        getOnChainOwner,
        isApproving,
        isListing,
        isBuying,
        isCancelling,
        isConfigured: isContractConfigured() && isMarketplaceConfigured(),
    };
}

/* ── Internal: save purchased NFT to buyer's localStorage ─────────── */

async function _savePurchasedNFT(
    tokenId: string,
    buyerAddress: string,
    priceWei: bigint,
    txHash: string
): Promise<void> {
    const { getMintedNFTs, getNFTByTokenId, saveMintedNFT } = await import("@/utils/mintedNFTs");
    const priceStr = ethers.formatEther(priceWei);
    const existing = getNFTByTokenId(tokenId);

    if (existing) {
        // Update owner in existing record
        const all = getMintedNFTs();
        const idx = all.findIndex((n) => n.tokenId === tokenId);
        if (idx !== -1) {
            all[idx] = {
                ...all[idx],
                owner: buyerAddress,
                isListed: false,
                price: undefined,
                listedAt: undefined,
                ownershipHistory: [
                    ...(all[idx].ownershipHistory ?? []),
                    {
                        type: "sale" as const,
                        from: all[idx].owner,
                        to: buyerAddress,
                        timestamp: new Date().toISOString(),
                        txHash,
                        price: priceStr,
                    },
                ],
            };
            localStorage.setItem("netra_minted_nfts", JSON.stringify(all));
        }
    } else {
        // New record for buyer — try to fetch metadata from chain
        try {
            const eth = (window as any).ethereum;
            if (!eth) return;
            const provider = new ethers.BrowserProvider(eth);
            const nftContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
            const tokenURI: string = await nftContract.tokenURI(BigInt(tokenId));
            const meta = await fetchNFTMetadata(tokenURI);

            saveMintedNFT({
                tokenId,
                txHash,
                name: meta?.name ?? `NFT #${tokenId}`,
                description: meta?.description ?? "",
                imageCID: meta?.imageCID ?? "",
                metadataCID: meta?.metadataCID ?? "",
                contentHash: tokenId,
                aiFingerprint: buyerAddress,
                watermarkType: "Unknown",
                royaltyPercent: 0,
                owner: buyerAddress,
                mintedAt: new Date().toISOString(),
                isListed: false,
                ownershipHistory: [
                    {
                        type: "sale" as const,
                        from: "marketplace",
                        to: buyerAddress,
                        timestamp: new Date().toISOString(),
                        txHash,
                        price: priceStr,
                    },
                ],
            });
        } catch (e) {
            console.warn("Could not save purchased NFT metadata:", e);
        }
    }
}
