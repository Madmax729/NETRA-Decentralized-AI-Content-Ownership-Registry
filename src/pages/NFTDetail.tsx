import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useWallet } from '@/hooks/use-wallet';
import { useToast } from '@/hooks/use-toast';
import { useMarketplace, type OnChainListing } from '@/hooks/use-marketplace';
import { ethers } from 'ethers';
import {
    getNFTByTokenId,
    markListed,
    markUnlisted,
    updateNFTOwner,
    type MintedNFT,
} from '@/utils/mintedNFTs';
import { CONTRACT_ADDRESS } from '@/config/contract';
import {
    ArrowLeft,
    ExternalLink,
    Copy,
    Heart,
    Share2,
    Eye,
    Clock,
    Tag,
    FileText,
    Activity,
    ChevronDown,
    ChevronUp,
    Shield,
    Coins,
    Hash,
    Globe,
    Layers,
    RefreshCw,
    ShoppingCart,
    X,
} from 'lucide-react';

/* ── helpers ──────────────────────────────────────────────────────── */

const short = (s: string, n = 6) =>
    s.length > n * 2 + 2 ? `${s.slice(0, n)}...${s.slice(-n)}` : s;

const copyText = (text: string) => navigator.clipboard.writeText(text);

const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
};

const timeRemaining = (iso: string) => {
    const diff = new Date(iso).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / 86400000);
    if (days > 30) return `${Math.floor(days / 30)} months`;
    if (days > 0) return `${days} days`;
    const hrs = Math.floor(diff / 3600000);
    return `${hrs} hours`;
};

/* ── Collapsible section ──────────────────────────────────────────── */

function Section({
    title,
    icon: Icon,
    defaultOpen = true,
    children,
}: {
    title: string;
    icon: React.ElementType;
    defaultOpen?: boolean;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-border rounded-xl overflow-hidden bg-background">
            <button
                onClick={() => setOpen((o) => !o)}
                className="w-full flex items-center justify-between px-5 py-4 bg-background hover:bg-muted/80 transition-colors"
            >
                <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    {title}
                </div>
                {open ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
            </button>
            {open && <div className="px-5 pb-5 bg-background">{children}</div>}
        </div>
    );
}

/* ── List-for-sale inline form  ───────────────────────────────────── */

function ListForSaleForm({
    onList,
    onCancel,
}: {
    onList: (price: string, days: number) => void;
    onCancel: () => void;
}) {
    const [price, setPrice] = useState('');
    const [duration, setDuration] = useState(7);

    const durations = [
        { label: '1 Day', days: 1 },
        { label: '3 Days', days: 3 },
        { label: '7 Days', days: 7 },
        { label: '1 Month', days: 30 },
        { label: '3 Months', days: 90 },
        { label: '6 Months', days: 180 },
    ];

    return (
        <div className="space-y-4 p-4 rounded-xl bg-muted border border-border">
            <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm text-foreground">List for Sale</h4>
                <button onClick={onCancel} className="p-1 rounded hover:bg-muted">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                    Price (tRBTC)
                </label>
                <input
                    type="number"
                    step="0.001"
                    min="0.0001"
                    placeholder="0.05"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
            </div>

            <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                    Duration
                </label>
                <div className="grid grid-cols-3 gap-2">
                    {durations.map((d) => (
                        <button
                            key={d.days}
                            onClick={() => setDuration(d.days)}
                            className={`p-2 rounded-lg text-xs font-medium border transition-all ${duration === d.days
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background border-border hover:bg-muted'
                                }`}
                        >
                            {d.label}
                        </button>
                    ))}
                </div>
            </div>

            <Button
                onClick={() => price && onList(price, duration)}
                disabled={!price || parseFloat(price) <= 0}
                className="w-full btn-primary"
            >
                <Tag className="w-4 h-4 mr-2" />
                List for {price || '—'} tRBTC
            </Button>
        </div>
    );
}

/* ── Main component ───────────────────────────────────────────────── */

const NFTDetail = () => {
    const { tokenId } = useParams<{ tokenId: string }>();
    const navigate = useNavigate();
    const { address } = useWallet();
    const { toast } = useToast();
    const marketplace = useMarketplace();

    const [nft, setNft] = useState<MintedNFT | null>(null);
    const [loading, setLoading] = useState(true);
    const [liked, setLiked] = useState(false);
    const [showListForm, setShowListForm] = useState(false);
    const [refreshingMeta, setRefreshingMeta] = useState(false);
    const [fetchedMeta, setFetchedMeta] = useState<Record<string, any> | null>(null);
    const [onChainListing, setOnChainListing] = useState<OnChainListing | null>(null);
    const [isTxPending, setIsTxPending] = useState(false);

    // Determine ownership: check on-chain listing seller or local owner
    const actualOwner = onChainListing ? onChainListing.seller : nft?.owner;
    const isOwner =
        actualOwner && address
            ? actualOwner.toLowerCase() === address.toLowerCase()
            : false;
    const isListed = onChainListing?.active || nft?.isListed;
    const listedPrice = onChainListing?.priceFormatted || nft?.price;

    /* load NFT */
    const loadNFT = useCallback(async () => {
        if (!tokenId) return;
        setLoading(true);
        const found = getNFTByTokenId(tokenId);
        setNft(found ?? null);

        // Check on-chain listing status
        if (marketplace.isConfigured) {
            const listing = await marketplace.getListing(tokenId);
            setOnChainListing(listing);

            // Also check on-chain owner
            const onChainOwner = await marketplace.getOnChainOwner(tokenId);
            if (found && onChainOwner && onChainOwner.toLowerCase() !== found.owner.toLowerCase()) {
                // Owner changed on-chain — update local record
                updateNFTOwner(found.tokenId, onChainOwner);
                found.owner = onChainOwner;
            }
        }

        setLoading(false);
    }, [tokenId, marketplace.isConfigured]);

    useEffect(() => {
        loadNFT();
    }, [loadNFT, address]);

    /* refresh metadata from IPFS */
    const handleRefreshMeta = async () => {
        if (!nft) return;
        setRefreshingMeta(true);
        try {
            const url = `https://gateway.pinata.cloud/ipfs/${nft.metadataCID}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setFetchedMeta(data);
            toast({ title: 'Metadata refreshed from IPFS' });
        } catch {
            toast({
                title: 'Refresh failed',
                description: 'Could not fetch metadata from IPFS',
                variant: 'destructive',
            });
        } finally {
            setRefreshingMeta(false);
        }
    };

    /* list on-chain */
    const handleList = async (price: string, _days: number) => {
        if (!nft) return;

        if (!marketplace.isConfigured) {
            markListed(nft.tokenId, price);
            setShowListForm(false);
            loadNFT();
            toast({ title: 'NFT listed for sale', description: `${price} tRBTC` });
            return;
        }

        try {
            setIsTxPending(true);
            toast({ title: 'Approving NFT...', description: 'Please confirm in MetaMask' });

            const result = await marketplace.listNFT(nft.tokenId, price);
            markListed(nft.tokenId, price, result.txHash);
            setShowListForm(false);
            await loadNFT();

            toast({
                title: 'Listed on-chain! ✅',
                description: `${price} tRBTC — TX: ${result.txHash.slice(0, 10)}...`,
            });
        } catch (err: any) {
            toast({
                title: 'Listing failed',
                description: err?.reason || err?.message || 'Transaction rejected',
                variant: 'destructive',
            });
        } finally {
            setIsTxPending(false);
        }
    };

    /* cancel listing on-chain */
    const handleUnlist = async () => {
        if (!nft) return;

        if (!marketplace.isConfigured) {
            markUnlisted(nft.tokenId);
            loadNFT();
            toast({ title: 'Listing cancelled' });
            return;
        }

        try {
            setIsTxPending(true);
            toast({ title: 'Cancelling...', description: 'Please confirm in MetaMask' });

            const result = await marketplace.cancelListing(nft.tokenId);
            markUnlisted(nft.tokenId, result.txHash);
            await loadNFT();

            toast({ title: 'Listing cancelled ✅' });
        } catch (err: any) {
            toast({
                title: 'Cancel failed',
                description: err?.reason || err?.message || 'Transaction rejected',
                variant: 'destructive',
            });
        } finally {
            setIsTxPending(false);
        }
    };

    /* buy NFT on-chain */
    const handleBuy = async () => {
        if (!nft || !onChainListing) return;

        try {
            setIsTxPending(true);
            toast({ title: 'Buying NFT...', description: 'Please confirm payment in MetaMask' });

            const result = await marketplace.buyNFT(nft.tokenId, onChainListing.price);

            // Update local records
            updateNFTOwner(nft.tokenId, address!, listedPrice, result.txHash);
            await loadNFT();

            toast({
                title: 'NFT Purchased! 🎉',
                description: `You now own ${nft.name} — TX: ${result.txHash.slice(0, 10)}...`,
            });
        } catch (err: any) {
            toast({
                title: 'Purchase failed',
                description: err?.reason || err?.message || 'Transaction rejected',
                variant: 'destructive',
            });
        } finally {
            setIsTxPending(false);
        }
    };

    /* ── loading / not found ────────────────────────────────────────── */

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!nft) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 pt-24">
                <h2 className="text-2xl font-bold">NFT Not Found</h2>
                <p className="text-muted-foreground">
                    Token #{tokenId} does not exist.
                </p>
                <Button onClick={() => navigate('/marketplace')} className="btn-primary">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Marketplace
                </Button>
            </div>
        );
    }

    const gatewayImg = `https://gateway.pinata.cloud/ipfs/${nft.imageCID}`;
    const explorerTx = `https://explorer.testnet.rootstock.io/tx/${nft.txHash}`;
    const explorerContract = CONTRACT_ADDRESS
        ? `https://explorer.testnet.rootstock.io/address/${CONTRACT_ADDRESS}`
        : '#';
    const metadataUrl = `https://gateway.pinata.cloud/ipfs/${nft.metadataCID}`;
    const shortOwner = short(nft.owner);
    const shortContract = CONTRACT_ADDRESS ? short(CONTRACT_ADDRESS) : '—';

    /* traits from metadata or fallback */
    const traits = fetchedMeta?.attributes ??
        [
            { trait_type: 'AI Fingerprint', value: short(nft.aiFingerprint, 10) },
            { trait_type: 'Watermark Type', value: nft.watermarkType },
            { trait_type: 'Royalty %', value: `${nft.royaltyPercent}%` },
            { trait_type: 'Registry', value: 'Netra' },
            {
                trait_type: 'Created',
                value: new Date(nft.mintedAt).toLocaleDateString(),
            },
        ] as { trait_type: string; value: string }[];

    /* ── render ─────────────────────────────────────────────────────── */

    return (
        <div className="min-h-screen bg-background">
            {/* Grid bg */}
            <div
                className="fixed inset-0 pointer-events-none z-0"
                style={{
                    backgroundImage:
                        'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
                    backgroundSize: '60px 60px',
                }}
            />

            <div className="relative pt-24 pb-16 px-4 sm:px-6 lg:px-8 z-10">
                {/* Back nav */}
                <div className="max-w-7xl mx-auto mb-6">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/marketplace')}
                        className="gap-2 text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Marketplace
                    </Button>
                </div>

                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* ── LEFT: Image ───────────────────────────────────────── */}
                    <div className="space-y-4">
                        <div className="rounded-2xl overflow-hidden border border-border bg-neutral-900 aspect-square">
                            <img
                                src={gatewayImg}
                                alt={nft.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                                }}
                            />
                        </div>

                        {/* Description */}
                        <Section title="Description" icon={FileText}>
                            <p className="text-sm text-foreground/80 leading-relaxed">
                                {nft.description || 'No description provided.'}
                            </p>
                        </Section>

                        {/* Traits */}
                        <Section title="Traits" icon={Layers}>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {traits.map((t: { trait_type: string; value: string }, i: number) => (
                                    <div
                                        key={i}
                                        className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center"
                                    >
                                        <p className="text-[10px] uppercase tracking-wider text-primary/70 font-semibold mb-1">
                                            {t.trait_type}
                                        </p>
                                        <p className="text-xs font-medium text-foreground truncate">
                                            {t.value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </Section>

                        {/* Content Hash – full, copyable, with provenance link */}
                        <div className="border border-border rounded-xl overflow-hidden bg-background">
                            <div className="px-5 py-4 bg-background">
                                <div className="flex items-center gap-2 font-semibold text-sm text-foreground mb-3">
                                    <Hash className="w-4 h-4 text-muted-foreground" />
                                    Content Hash
                                </div>
                                <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                                    <code className="text-xs font-mono text-foreground break-all flex-1 select-all">
                                        {nft.contentHash}
                                    </code>
                                    <button
                                        onClick={() => {
                                            copyText(nft.contentHash);
                                            toast({ title: 'Content hash copied!' });
                                        }}
                                        className="p-1.5 rounded-md bg-background border border-border hover:bg-muted transition-colors flex-shrink-0"
                                        title="Copy content hash"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <Link
                                    to={`/provenance?hash=${encodeURIComponent(nft.contentHash)}`}
                                    className="mt-3 flex items-center gap-2 text-xs text-primary hover:underline font-medium"
                                >
                                    <Shield className="w-3.5 h-3.5" />
                                    Track Provenance →
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT: Details ────────────────────────────────────── */}
                    <div className="space-y-5">
                        {/* Title row */}
                        <div>
                            <div className="flex items-center gap-2 text-sm text-primary mb-1">
                                <Shield className="w-4 h-4" />
                                <span className="font-semibold">Netra NFT</span>
                                <Badge
                                    variant="secondary"
                                    className="text-[10px] px-1.5 py-0"
                                >
                                    ERC-721
                                </Badge>
                            </div>
                            <h1 className="text-3xl font-bold text-foreground">
                                {nft.name}{' '}
                                <span className="text-muted-foreground">#{nft.tokenId}</span>
                            </h1>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                <span>
                                    Owned by{' '}
                                    <button
                                        onClick={() => {
                                            copyText(nft.owner);
                                            toast({ title: 'Address copied' });
                                        }}
                                        className="text-primary hover:underline font-mono"
                                    >
                                        {isOwner ? 'you' : shortOwner}
                                    </button>
                                </span>
                            </div>
                        </div>

                        {/* Action icons */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    copyText(window.location.href);
                                    toast({ title: 'Link copied!' });
                                }}
                                className="p-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors"
                                title="Share"
                            >
                                <Share2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setLiked((l) => !l)}
                                className={`p-2 rounded-lg border border-border bg-background transition-colors ${liked ? 'bg-red-50 border-red-200' : 'hover:bg-muted'
                                    }`}
                                title="Favorite"
                            >
                                <Heart
                                    className={`w-4 h-4 ${liked ? 'fill-red-500 text-red-500' : ''}`}
                                />
                            </button>
                            <button
                                onClick={handleRefreshMeta}
                                disabled={refreshingMeta}
                                className="p-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors"
                                title="Refresh metadata from IPFS"
                            >
                                <RefreshCw
                                    className={`w-4 h-4 ${refreshingMeta ? 'animate-spin' : ''}`}
                                />
                            </button>
                            <button
                                onClick={() => window.open(gatewayImg, '_blank')}
                                className="p-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors"
                                title="View full image"
                            >
                                <Eye className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Token info strip */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <Badge variant="outline" className="gap-1 font-mono">
                                <Hash className="w-3 h-3" /> Token #{nft.tokenId}
                            </Badge>
                            <Badge variant="outline" className="gap-1">
                                <Globe className="w-3 h-3" /> Rootstock Testnet
                            </Badge>
                            <Badge variant="outline" className="gap-1">
                                <Layers className="w-3 h-3" /> ERC-721
                            </Badge>
                        </div>

                        <Separator />

                        {/* ── Price / Buy section ─────────────────────────────── */}
                        {isListed && listedPrice ? (
                            <Card className="border border-border bg-background shadow-md">
                                <CardContent className="p-5 space-y-4">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">
                                            Current price
                                        </p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-3xl font-bold text-foreground">
                                                {listedPrice}
                                            </span>
                                            <span className="text-lg font-semibold text-foreground">
                                                tRBTC
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        {isOwner ? (
                                            <Button
                                                onClick={handleUnlist}
                                                variant="outline"
                                                className="flex-1"
                                                disabled={isTxPending}
                                            >
                                                {marketplace.isCancelling ? (
                                                    <><div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin mr-2" /> Cancelling...</>
                                                ) : (
                                                    <><X className="w-4 h-4 mr-2" /> Cancel Listing</>
                                                )}
                                            </Button>
                                        ) : (
                                            <Button
                                                onClick={handleBuy}
                                                className="flex-1 btn-primary py-6 text-base"
                                                disabled={isTxPending || !address}
                                            >
                                                {marketplace.isBuying ? (
                                                    <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> Buying...</>
                                                ) : (
                                                    <><ShoppingCart className="w-5 h-5 mr-2" /> Buy Now for {listedPrice} tRBTC</>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                    {!address && !isOwner && (
                                        <p className="text-xs text-muted-foreground text-center">
                                            Connect your wallet to buy this NFT
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        ) : isOwner ? (
                            <Card className="border border-border bg-background shadow-md">
                                <CardContent className="p-5">
                                    {showListForm ? (
                                        <ListForSaleForm
                                            onList={handleList}
                                            onCancel={() => setShowListForm(false)}
                                        />
                                    ) : (
                                        <Button
                                            onClick={() => setShowListForm(true)}
                                            className="w-full btn-primary py-5"
                                            disabled={isTxPending}
                                        >
                                            {marketplace.isApproving || marketplace.isListing ? (
                                                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> Processing...</>
                                            ) : (
                                                <><Tag className="w-4 h-4 mr-2" /> List for Sale</>
                                            )}
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        ) : null}

                        {/* ── Details section ─────────────────────────────────── */}
                        <Section title="Details" icon={FileText}>
                            <div className="space-y-3 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">
                                        Contract Address
                                    </span>
                                    <a
                                        href={explorerContract}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-primary font-mono text-xs hover:underline flex items-center gap-1"
                                    >
                                        {shortContract}
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Token ID</span>
                                    <span className="font-mono text-xs">{nft.tokenId}</span>
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">
                                        Token Standard
                                    </span>
                                    <span>ERC-721</span>
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Chain</span>
                                    <span>Rootstock Testnet</span>
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Royalty</span>
                                    <span>{nft.royaltyPercent}%</span>
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Metadata</span>
                                    <a
                                        href={metadataUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-primary text-xs hover:underline flex items-center gap-1"
                                    >
                                        IPFS
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>
                        </Section>

                        {/* ── Activity ────────────────────────────────────────── */}
                        <Section title="Activity" icon={Activity}>
                            <div className="space-y-3">
                                {/* Minted event */}
                                <div className="flex items-center justify-between text-sm py-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                                            <Coins className="w-4 h-4 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium">Minted</p>
                                            <p className="text-xs text-muted-foreground">
                                                by {short(nft.owner)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-muted-foreground">
                                            {timeAgo(nft.mintedAt)}
                                        </p>
                                        <a
                                            href={explorerTx}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[10px] text-primary hover:underline flex items-center gap-0.5 justify-end"
                                        >
                                            View tx <ExternalLink className="w-2.5 h-2.5" />
                                        </a>
                                    </div>
                                </div>

                                {/* Listed event (if listed) */}
                                {nft.isListed && nft.listedAt && (
                                    <div className="flex items-center justify-between text-sm py-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                                                <Tag className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium">Listed</p>
                                                <p className="text-xs text-muted-foreground">
                                                    for {nft.price} tRBTC
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {timeAgo(nft.listedAt)}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </Section>

                        {/* ── Price History placeholder ────────────────────────── */}
                        <Section title="Price History" icon={Activity} defaultOpen={false}>
                            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                                <Activity className="w-8 h-8 mb-2 opacity-30" />
                                <p className="text-sm">No price history available yet</p>
                                <p className="text-xs">
                                    Price tracking will appear after marketplace transactions
                                </p>
                            </div>
                        </Section>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NFTDetail;
