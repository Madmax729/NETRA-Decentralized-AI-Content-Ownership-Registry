import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useWallet } from '@/hooks/use-wallet';
import { useToast } from '@/hooks/use-toast';
import { useMarketplace, type OnChainListing } from '@/hooks/use-marketplace';
import { ethers } from 'ethers';
import {
  getMintedNFTs,
  getMintedNFTsByOwner,
  getListedNFTs,
  getListedNFTsByOwner,
  getUnlistedNFTsByOwner,
  getNFTByTokenId,
  markListed,
  markUnlisted,
  type MintedNFT,
} from '@/utils/mintedNFTs';
import {
  Wallet,
  Image as ImageIcon,
  Search,
  ExternalLink,
  Eye,
  Clock,
  ShoppingBag,
  List,
  FolderOpen,
  Copy,
  Coins,
  Tag,
  Plus,
  X,
  ArrowUpDown,
  TrendingUp,
  Users,
  Layers,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

type TabType = 'browse' | 'my-listings' | 'my-assets';
type SortOption = 'newest' | 'oldest' | 'price-low' | 'price-high';

/* ── helpers ──────────────────────────────────────────────────────── */

const short = (s: string, n = 6) =>
  s.length > n * 2 + 2 ? `${s.slice(0, n)}...${s.slice(-n)}` : s;

/* ── NFT Card ─────────────────────────────────────────────────────── */

function MintedNFTCard({
  nft,
  showCancelListing,
  onCancelListing,
}: {
  nft: MintedNFT;
  showCancelListing?: boolean;
  onCancelListing?: () => void;
}) {
  const navigate = useNavigate();
  const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${nft.imageCID}`;
  const shortOwner = nft.owner
    ? `${nft.owner.slice(0, 6)}...${nft.owner.slice(-4)}`
    : '–';

  return (
    <Card
      className="glass-card overflow-hidden group hover:scale-[1.02] transition-all duration-300 cursor-pointer"
      onClick={() => navigate(`/nft/${nft.tokenId}`)}
    >
      {/* Image */}
      <div className="relative aspect-square bg-gradient-to-br from-primary/10 to-accent/10 overflow-hidden">
        <img
          src={gatewayUrl}
          alt={nft.name}
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder.svg';
          }}
        />
        <Badge className="absolute top-3 left-3 bg-primary/80 text-primary-foreground">
          <ImageIcon className="w-3 h-3 mr-1" />
          NFT
        </Badge>
        <Badge className="absolute top-3 right-3 bg-green-500/20 text-green-600 border-green-500/30">
          #{nft.tokenId}
        </Badge>

        {/* Listed price badge */}
        {nft.isListed && nft.price && (
          <Badge className="absolute bottom-3 left-3 bg-blue-600 text-white border-0">
            <Coins className="w-3 h-3 mr-1" />
            {nft.price} tRBTC
          </Badge>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <Button
            size="sm"
            className="btn-glass"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/nft/${nft.tokenId}`);
            }}
          >
            <Eye className="w-4 h-4 mr-1" /> View Details
          </Button>
        </div>
      </div>

      {/* Content */}
      <CardContent className="p-4">
        <h3 className="text-xl font-semibold text-foreground mb-1 truncate">
          {nft.name}
        </h3>
        <p className="text-base text-muted-foreground mb-3 line-clamp-2">
          {nft.description}
        </p>

        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground font-mono">
            Owner: {shortOwner}
          </span>
          {nft.royaltyPercent > 0 && (
            <Badge variant="secondary" className="text-xs">
              {nft.royaltyPercent}% Royalty
            </Badge>
          )}
        </div>

        {/* Price row or watermark row */}
        {nft.isListed && nft.price ? (
          <div className="glass rounded-lg p-2 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Price</span>
            <span className="text-base font-bold">{nft.price} tRBTC</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="glass rounded-lg p-2">
              <p className="text-muted-foreground mb-0.5">Watermark</p>
              <p className="font-medium truncate">{nft.watermarkType}</p>
            </div>
            <div className="glass rounded-lg p-2">
              <p className="text-muted-foreground mb-0.5">Content Hash</p>
              <p className="font-mono truncate">
                {nft.contentHash.slice(0, 10)}…
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(nft.mintedAt).toLocaleDateString()}
          </p>
          <div className="flex items-center gap-1">
            {showCancelListing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCancelListing?.();
                }}
                className="px-2 py-1 rounded text-xs bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors"
                title="Cancel listing"
              >
                Cancel
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(nft.metadataCID);
              }}
              className="p-1 rounded hover:bg-muted transition-colors"
              title="Copy Metadata CID"
            >
              <Copy className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── New Listing Dialog ───────────────────────────────────────────── */

function NewListingDialog({
  unlistedNFTs,
  onClose,
  onList,
}: {
  unlistedNFTs: MintedNFT[];
  onClose: () => void;
  onList: (tokenId: string, price: string, days: number) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState(7);

  const selected = unlistedNFTs.find((n) => n.tokenId === selectedId);

  const durations = [
    { label: '1 Day', days: 1 },
    { label: '3 Days', days: 3 },
    { label: '7 Days', days: 7 },
    { label: '1 Month', days: 30 },
    { label: '3 Months', days: 90 },
    { label: '6 Months', days: 180 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="glass-card w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Plus className="w-5 h-5" /> New Listing
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {unlistedNFTs.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                No unlisted NFTs available.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Mint a new NFT first, or all your NFTs are already listed.
              </p>
            </div>
          ) : (
            <>
              {/* Select NFT */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Select NFT
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {unlistedNFTs.map((nft) => (
                    <button
                      key={nft.tokenId}
                      onClick={() => setSelectedId(nft.tokenId)}
                      className={`flex items-center gap-2 p-2 rounded-lg text-left border transition-all ${selectedId === nft.tokenId
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:bg-muted/50'
                        }`}
                    >
                      <img
                        src={`https://gateway.pinata.cloud/ipfs/${nft.imageCID}`}
                        alt={nft.name}
                        className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            '/placeholder.svg';
                        }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">
                          {nft.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          #{nft.tokenId}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {selected && (
                <div className="flex items-center gap-3 p-3 rounded-xl glass border border-primary/20">
                  <img
                    src={`https://gateway.pinata.cloud/ipfs/${selected.imageCID}`}
                    alt={selected.name}
                    className="w-16 h-16 rounded-lg object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                  <div>
                    <p className="font-semibold text-sm">{selected.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Token #{selected.tokenId} · {selected.royaltyPercent}%
                      Royalty
                    </p>
                  </div>
                </div>
              )}

              {/* Price */}
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Price (tRBTC)
                </label>
                <Input
                  type="number"
                  step="0.001"
                  min="0.0001"
                  placeholder="0.05"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="glass font-mono"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Duration
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {durations.map((d) => (
                    <button
                      key={d.days}
                      onClick={() => setDuration(d.days)}
                      className={`p-2 rounded-lg text-xs font-medium border transition-all ${duration === d.days
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'glass border-border hover:bg-muted/50'
                        }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <Button
                onClick={() => {
                  if (selectedId && price) {
                    onList(selectedId, price, duration);
                  }
                }}
                disabled={!selectedId || !price || parseFloat(price) <= 0}
                className="w-full btn-primary py-5"
              >
                <Tag className="w-4 h-4 mr-2" />
                List for {price || '—'} tRBTC
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Stats Bar ────────────────────────────────────────────────────── */

function StatsBar({
  totalMinted,
  totalListed,
  uniqueOwners,
  floorPrice,
}: {
  totalMinted: number;
  totalListed: number;
  uniqueOwners: number;
  floorPrice: string | null;
}) {
  const stats = [
    {
      label: 'Total Minted',
      value: totalMinted.toString(),
      icon: Layers,
    },
    {
      label: 'Listed',
      value: totalListed.toString(),
      icon: Tag,
    },
    {
      label: 'Owners',
      value: uniqueOwners.toString(),
      icon: Users,
    },
    {
      label: 'Floor Price',
      value: floorPrice ? `${floorPrice} tRBTC` : '—',
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {stats.map((s) => (
        <div
          key={s.label}
          className="glass rounded-xl p-3 flex items-center gap-3"
        >
          <div className="p-2 rounded-lg bg-primary/10">
            <s.icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-sm font-bold">{s.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────────── */

const NFTMarketplace = () => {
  const { isConnected, address, connect, isConnecting } = useWallet();
  const { toast } = useToast();
  const navigate = useNavigate();
  const marketplace = useMarketplace();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('browse');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showNewListing, setShowNewListing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [onChainListings, setOnChainListings] = useState<OnChainListing[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(false);

  const refresh = () => setRefreshKey((k) => k + 1);

  /* ── Fetch on-chain listings ──────────────────── */
  const fetchOnChainListings = useCallback(async () => {
    if (!marketplace.isConfigured) return;
    setIsLoadingListings(true);
    try {
      const listings = await marketplace.getActiveListings();
      setOnChainListings(listings);
    } catch (err) {
      console.error('Failed to fetch listings:', err);
    } finally {
      setIsLoadingListings(false);
    }
  }, [marketplace.isConfigured]);

  // Fetch listings on mount and when refreshKey changes
  useEffect(() => {
    fetchOnChainListings();
  }, [fetchOnChainListings, refreshKey]);

  /* ── data ────────────────────────────────────── */
  const allNFTs = useMemo(() => getMintedNFTs(), [refreshKey]);

  // Merge on-chain listings with local metadata
  const listedNFTs: MintedNFT[] = useMemo(() => {
    if (onChainListings.length > 0) {
      // Primary: on-chain listings — use local metadata if available, otherwise use on-chain fetched metadata
      return onChainListings.map((listing) => {
        const local = getNFTByTokenId(listing.tokenId);
        if (local) {
          // Known NFT: merge with on-chain listing state
          return {
            ...local,
            isListed: true,
            price: listing.priceFormatted,
            currency: 'tRBTC',
            owner: listing.seller, // seller is the true owner while listed
          };
        }
        // Unknown NFT (different account's mint): build synthetic record from on-chain data
        return {
          tokenId: listing.tokenId,
          txHash: '',
          name: listing.name ?? `NFT #${listing.tokenId}`,
          description: listing.description ?? '',
          imageCID: listing.imageCID ?? '',
          metadataCID: listing.metadataCID ?? '',
          contentHash: listing.tokenId,
          aiFingerprint: listing.seller,
          watermarkType: 'Unknown',
          royaltyPercent: 0,
          owner: listing.seller,
          mintedAt: new Date().toISOString(),
          isListed: true,
          price: listing.priceFormatted,
          currency: 'tRBTC',
        } as MintedNFT;
      });
    }
    // Fallback: localStorage
    return getListedNFTs();
  }, [onChainListings, refreshKey]);


  const myNFTs = useMemo(
    () => (address ? getMintedNFTsByOwner(address) : []),
    [address, refreshKey]
  );
  const myListedNFTs = useMemo(
    () =>
      listedNFTs.filter(
        (n) => n.owner.toLowerCase() === (address || '').toLowerCase()
      ),
    [listedNFTs, address]
  );
  const myUnlistedNFTs = useMemo(
    () => (address ? getUnlistedNFTsByOwner(address) : []),
    [address, refreshKey]
  );

  // Refresh when tab or address changes
  useEffect(() => {
    refresh();
  }, [activeTab, address]);

  /* ── derived data ────────────────────────────── */
  const getDisplayNFTs = (): MintedNFT[] => {
    switch (activeTab) {
      case 'my-assets':
        return myNFTs;
      case 'my-listings':
        return myListedNFTs;
      case 'browse':
      default:
        return listedNFTs;
    }
  };

  const displayNFTs = getDisplayNFTs();

  const filteredNFTs = displayNFTs
    .filter((nft) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        nft.name.toLowerCase().includes(q) ||
        nft.owner.toLowerCase().includes(q) ||
        nft.tokenId.includes(q)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return (
            new Date(a.mintedAt).getTime() - new Date(b.mintedAt).getTime()
          );
        case 'price-low':
          return (
            parseFloat(a.price || '0') - parseFloat(b.price || '0')
          );
        case 'price-high':
          return (
            parseFloat(b.price || '0') - parseFloat(a.price || '0')
          );
        case 'newest':
        default:
          return (
            new Date(b.mintedAt).getTime() - new Date(a.mintedAt).getTime()
          );
      }
    });

  const tabs: {
    id: TabType;
    label: string;
    icon: typeof ShoppingBag;
    description: string;
  }[] = [
      {
        id: 'browse',
        label: 'Browse NFTs',
        icon: ShoppingBag,
        description: 'All listed NFTs for sale',
      },
      {
        id: 'my-listings',
        label: 'My Listings',
        icon: List,
        description: 'Your listed NFTs',
      },
      {
        id: 'my-assets',
        label: 'My Assets',
        icon: FolderOpen,
        description: 'All your minted NFTs',
      },
    ];

  const getTabCount = (tabId: TabType): number => {
    switch (tabId) {
      case 'browse':
        return listedNFTs.length;
      case 'my-listings':
        return myListedNFTs.length;
      case 'my-assets':
        return myNFTs.length;
    }
  };

  const getEmptyMessage = (): {
    title: string;
    desc: string;
    showMintBtn: boolean;
  } => {
    if (searchQuery)
      return {
        title: 'No NFTs Found',
        desc: 'Try adjusting your search criteria',
        showMintBtn: false,
      };
    switch (activeTab) {
      case 'my-assets':
        return {
          title: 'No NFTs Minted Yet',
          desc: 'Mint your first NFT to see it here',
          showMintBtn: true,
        };
      case 'my-listings':
        return {
          title: 'No Listings Yet',
          desc: 'List your minted NFTs for sale to see them here',
          showMintBtn: false,
        };
      case 'browse':
        return {
          title: 'No Listed NFTs',
          desc: 'No NFTs are currently listed for sale',
          showMintBtn: true,
        };
      default:
        return {
          title: 'No NFTs Found',
          desc: 'No NFTs available',
          showMintBtn: true,
        };
    }
  };

  /* ── collection stats ────────────────────────── */
  const uniqueOwners = useMemo(() => {
    const owners = new Set(allNFTs.map((n) => n.owner.toLowerCase()));
    return owners.size;
  }, [allNFTs]);

  const floorPrice = useMemo(() => {
    const prices = listedNFTs
      .filter((n) => n.price)
      .map((n) => parseFloat(n.price!));
    if (prices.length === 0) return null;
    return Math.min(...prices).toString();
  }, [listedNFTs]);

  /* ── handlers ────────────────────────────────── */
  const handleNewListing = async (
    tokenId: string,
    price: string,
    _days: number
  ) => {
    if (!marketplace.isConfigured) {
      // Fallback to localStorage only
      markListed(tokenId, price);
      setShowNewListing(false);
      refresh();
      toast({ title: 'NFT listed!', description: `Listed for ${price} tRBTC` });
      return;
    }

    try {
      toast({
        title: 'Approving NFT...',
        description: 'Please confirm the approval transaction in MetaMask',
      });

      const result = await marketplace.listNFT(tokenId, price);

      // 1. Update localStorage immediately
      markListed(tokenId, price, result.txHash);

      // 2. Immediately inject into on-chain listings state so UI updates now
      const local = getNFTByTokenId(tokenId) ?? getMintedNFTs().find((n) => n.tokenId === tokenId);
      const priceWei = BigInt(Math.round(parseFloat(price) * 1e18));
      setOnChainListings((prev) => {
        const filtered = prev.filter((l) => l.tokenId !== tokenId);
        return [
          ...filtered,
          {
            tokenId,
            seller: address ?? '',
            price: priceWei,
            priceFormatted: price,
            active: true,
            name: local?.name,
            description: local?.description,
            imageCID: local?.imageCID,
            metadataCID: local?.metadataCID,
          },
        ];
      });

      setShowNewListing(false);
      refresh();

      toast({
        title: 'NFT listed on-chain! ✅',
        description: `Listed for ${price} tRBTC — TX: ${result.txHash.slice(0, 10)}...`,
      });

      // 3. Background refresh to sync full on-chain state
      setTimeout(() => fetchOnChainListings(), 3000);
    } catch (err: any) {
      console.error('Listing failed:', err);
      toast({
        title: 'Listing failed',
        description: err?.reason || err?.message || 'Transaction rejected',
        variant: 'destructive',
      });
    }
  };


  const handleCancelListing = async (tokenId: string) => {
    if (!marketplace.isConfigured) {
      markUnlisted(tokenId);
      refresh();
      toast({ title: 'Listing cancelled' });
      return;
    }

    try {
      toast({
        title: 'Cancelling listing...',
        description: 'Please confirm in MetaMask',
      });

      const result = await marketplace.cancelListing(tokenId);
      markUnlisted(tokenId, result.txHash);
      await fetchOnChainListings();
      refresh();

      toast({ title: 'Listing cancelled ✅' });
    } catch (err: any) {
      console.error('Cancel failed:', err);
      toast({
        title: 'Cancel failed',
        description: err?.reason || err?.message || 'Transaction rejected',
        variant: 'destructive',
      });
    }
  };

  /* ── sort options ────────────────────────────── */
  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'price-low', label: 'Price: Low → High' },
    { value: 'price-high', label: 'Price: High → Low' },
  ];

  return (
    <div className="min-h-screen relative bg-background">
      {/* Grid background */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative pt-24 pb-12 px-4 sm:px-6 lg:px-8 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              NFT Marketplace
            </h1>
            <p className="text-muted-foreground">
              Browse, discover, and collect protected digital assets
            </p>
          </div>

          {/* Main content */}
          <div>
            {/* Wallet Status */}
            <Card className="glass-card mb-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <Wallet className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {isConnected
                          ? 'Wallet Connected'
                          : 'Connect Your Wallet'}
                      </h3>
                      <p className="text-sm text-muted-foreground font-mono">
                        {isConnected
                          ? address
                          : 'Connect MetaMask to browse and collect NFTs'}
                      </p>
                    </div>
                  </div>
                  {!isConnected && (
                    <Button
                      onClick={connect}
                      className="btn-primary"
                      disabled={isConnecting}
                    >
                      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                    </Button>
                  )}
                  {isConnected && (
                    <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                      Connected
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Collection Stats */}
            <StatsBar
              totalMinted={allNFTs.length}
              totalListed={listedNFTs.length}
              uniqueOwners={uniqueOwners}
              floorPrice={floorPrice}
            />

            {/* 3 Tabs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 text-left ${activeTab === tab.id
                    ? 'bg-primary text-primary-foreground border-primary shadow-lg'
                    : 'glass border-border hover:bg-primary/5'
                    }`}
                >
                  <tab.icon
                    className={`w-5 h-5 flex-shrink-0 ${activeTab === tab.id
                      ? 'text-primary-foreground'
                      : 'text-muted-foreground'
                      }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{tab.label}</div>
                    <div
                      className={`text-xs ${activeTab === tab.id
                        ? 'text-primary-foreground/70'
                        : 'text-muted-foreground'
                        }`}
                    >
                      {tab.description}
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`flex-shrink-0 ${activeTab === tab.id
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : ''
                      }`}
                  >
                    {getTabCount(tab.id)}
                  </Badge>
                </button>
              ))}
            </div>

            {/* Search + Sort + Actions */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search by name, owner address, or token ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 glass border-border h-12"
                />
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-3 h-12 glass border border-border rounded-lg">
                  <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="bg-transparent text-sm outline-none cursor-pointer"
                  >
                    {sortOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Actions based on tab */}
              {activeTab === 'my-listings' && isConnected && (
                <Button
                  onClick={() => setShowNewListing(true)}
                  className="btn-primary h-12 px-6"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Listing
                </Button>
              )}
              <Link to="/mint">
                <Button className="btn-primary h-12 px-6">
                  <Coins className="w-4 h-4 mr-2" />
                  Mint New NFT
                </Button>
              </Link>
            </div>

            {/* ── Browse tab: Featured hero ────────── */}
            {activeTab === 'browse' && filteredNFTs.length > 0 && (
              <div className="space-y-8">
                {/* Featured Hero – newest listing */}
                {(() => {
                  const featured = filteredNFTs[0];
                  const featuredImg = `https://gateway.pinata.cloud/ipfs/${featured.imageCID}`;
                  return (
                    <div
                      className="relative rounded-2xl overflow-hidden cursor-pointer group mb-8"
                      onClick={() => navigate(`/nft/${featured.tokenId}`)}
                    >
                      {/* bg image blurred */}
                      <div
                        className="absolute inset-0 bg-cover bg-center blur-2xl scale-110 opacity-40"
                        style={{ backgroundImage: `url(${featuredImg})` }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
                      <div className="relative flex flex-col md:flex-row items-center gap-8 p-8 md:p-12">
                        <img
                          src={featuredImg}
                          alt={featured.name}
                          className="w-48 h-48 md:w-64 md:h-64 rounded-xl object-cover border border-border shadow-2xl group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder.svg';
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <Badge className="bg-primary/20 text-primary mb-3">
                            ✨ Featured
                          </Badge>
                          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2 truncate">
                            {featured.name}
                          </h2>
                          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                            {featured.description}
                          </p>
                          <div className="flex items-center gap-6">
                            <div>
                              <p className="text-xs text-muted-foreground">Price</p>
                              <p className="text-2xl font-bold text-foreground">
                                {featured.price}{' '}
                                <span className="text-sm font-semibold">tRBTC</span>
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Owner</p>
                              <p className="text-sm font-mono text-foreground">
                                {short(featured.owner)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Token</p>
                              <p className="text-sm font-mono text-foreground">
                                #{featured.tokenId}
                              </p>
                            </div>
                          </div>
                          <Button className="btn-primary mt-6 px-8 py-5">
                            <Eye className="w-4 h-4 mr-2" /> View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Recently Listed */}
                {filteredNFTs.length > 1 && (
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      Recently Listed
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {filteredNFTs.slice(0, 6).map((nft) => (
                        <MintedNFTCard
                          key={`trending-${nft.tokenId}`}
                          nft={nft}
                          showCancelListing={false}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* All listed */}
                {filteredNFTs.length > 6 && (
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-4">
                      All Listed
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {filteredNFTs.slice(6).map((nft) => (
                        <MintedNFTCard
                          key={`all-${nft.tokenId}`}
                          nft={nft}
                          showCancelListing={false}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Standard grid for My Assets & My Listings ── */}
            {activeTab !== 'browse' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredNFTs.map((nft) => (
                  <MintedNFTCard
                    key={`${nft.tokenId}-${nft.txHash}`}
                    nft={nft}
                    showCancelListing={activeTab === 'my-listings'}
                    onCancelListing={() => handleCancelListing(nft.tokenId)}
                  />
                ))}
              </div>
            )}

            {/* Empty state */}
            {filteredNFTs.length === 0 &&
              (() => {
                const msg = getEmptyMessage();
                return (
                  <div className="text-center py-20">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
                      {activeTab === 'my-assets' ? (
                        <FolderOpen className="w-10 h-10 text-primary" />
                      ) : activeTab === 'my-listings' ? (
                        <List className="w-10 h-10 text-primary" />
                      ) : (
                        <ShoppingBag className="w-10 h-10 text-primary" />
                      )}
                    </div>
                    <h3 className="text-2xl font-semibold text-foreground mb-2">
                      {msg.title}
                    </h3>
                    <p className="text-muted-foreground mb-6">{msg.desc}</p>
                    <div className="flex items-center justify-center gap-3">
                      {msg.showMintBtn && (
                        <Link to="/mint">
                          <Button className="btn-primary">
                            <Coins className="w-4 h-4 mr-2" />
                            Mint Your First NFT
                          </Button>
                        </Link>
                      )}
                      {activeTab === 'my-listings' && isConnected && (
                        <Button
                          onClick={() => setShowNewListing(true)}
                          className="btn-primary"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create New Listing
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })()}
          </div>
        </div>
      </div>

      {/* ── Rankings sidebar – fixed in right margin ──────── */}
      {activeTab === 'browse' && listedNFTs.length > 0 && (
        <div className="hidden xl:block fixed right-4 top-28 w-72 z-20 max-h-[calc(100vh-8rem)] overflow-y-auto">
          <div className="border border-border rounded-xl bg-background p-5 shadow-lg">
            <h3 className="text-lg font-bold text-foreground mb-5 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                Rankings
              </span>
              <span className="text-sm text-muted-foreground font-normal">
                PRICE
              </span>
            </h3>
            <div className="space-y-1">
              {[...listedNFTs]
                .sort(
                  (a, b) =>
                    parseFloat(b.price || '0') -
                    parseFloat(a.price || '0')
                )
                .slice(0, 10)
                .map((nft, i) => (
                  <button
                    key={`rank-${nft.tokenId}`}
                    onClick={() => navigate(`/nft/${nft.tokenId}`)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/80 transition-colors text-left border border-transparent hover:border-border"
                  >
                    <span className="text-base text-muted-foreground font-mono w-6 text-right">
                      {i + 1}
                    </span>
                    <img
                      src={`https://gateway.pinata.cloud/ipfs/${nft.imageCID}`}
                      alt={nft.name}
                      className="w-11 h-11 rounded-lg object-cover flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          '/placeholder.svg';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-foreground truncate">
                        {nft.name}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-base font-bold text-foreground">
                        {nft.price}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        tRBTC
                      </p>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* New Listing Modal */}
      {showNewListing && (
        <NewListingDialog
          unlistedNFTs={myUnlistedNFTs}
          onClose={() => setShowNewListing(false)}
          onList={handleNewListing}
        />
      )}
    </div>
  );
};

export default NFTMarketplace;
