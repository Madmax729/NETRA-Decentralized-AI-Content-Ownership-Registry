import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import SpaceGeometryBackground from '@/components/SpaceGeometryBackground';
import { useWallet } from '@/hooks/use-wallet';
import { useMarketplace } from '@/hooks/use-marketplace';
import { useSearchParams, Link } from 'react-router-dom';
import {
  getNFTByContentHash,
  type MintedNFT,
  type OwnershipEvent,
} from '@/utils/mintedNFTs';
import {
  Search,
  CheckCircle,
  Clock,
  User,
  Hash,
  ExternalLink,
  FileText,
  ArrowRight,
  Shield,
  Link as LinkIcon,
  Copy,
  Image as ImageIcon,
  Tag,
  Coins,
} from 'lucide-react';

/* ── helpers ──────────────────────────────────────────────────────── */

const short = (s: string, n = 6) =>
  s.length > n * 2 + 2 ? `${s.slice(0, n)}...${s.slice(-n)}` : s;

const copyText = (text: string) => navigator.clipboard.writeText(text);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

const eventIcons: Record<string, typeof Shield> = {
  creation: Shield,
  transfer: ArrowRight,
  listing: Tag,
  unlisting: Tag,
  sale: Coins,
};

const eventColors: Record<string, string> = {
  creation: 'bg-green-500/20 text-green-400 border-green-500/30',
  transfer: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  listing: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  unlisting: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  sale: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

/* ── ownership chain block ────────────────────────────────────────── */

function ChainBlock({
  event,
  index,
  isLast,
}: {
  event: OwnershipEvent;
  index: number;
  isLast: boolean;
}) {
  const Icon = eventIcons[event.type] || Hash;
  const color = eventColors[event.type] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  const explorerBase = 'https://explorer.testnet.rootstock.io';

  return (
    <div className="flex items-start gap-0">
      {/* The block */}
      <div className="relative flex-shrink-0">
        <div
          className={`w-48 rounded-xl border p-4 ${index === 0
            ? 'border-green-500/40 bg-green-500/5'
            : 'border-blue-500/40 bg-blue-500/5'
            }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center ${color}`}
            >
              <Icon className="w-3.5 h-3.5" />
            </div>
            <Badge className={color + ' text-[10px] px-1.5 py-0'}>
              {event.type.charAt(0).toUpperCase() +
                event.type.slice(1)}
            </Badge>
          </div>

          <div className="space-y-1.5 text-xs">
            <div>
              <span className="text-muted-foreground">From: </span>
              <button
                onClick={() => copyText(event.from)}
                className="font-mono text-foreground hover:text-primary transition-colors"
                title="Copy address"
              >
                {short(event.from)}
              </button>
            </div>
            {event.to && (
              <div>
                <span className="text-muted-foreground">
                  To:{' '}
                </span>
                <button
                  onClick={() => copyText(event.to!)}
                  className="font-mono text-foreground hover:text-primary transition-colors"
                  title="Copy address"
                >
                  {short(event.to)}
                </button>
              </div>
            )}
            <p className="text-muted-foreground">
              {timeAgo(event.timestamp)}
            </p>
            {event.txHash && (
              <a
                href={`${explorerBase}/tx/${event.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline flex items-center gap-0.5 text-[10px]"
              >
                View tx{' '}
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        </div>

        {/* Block number */}
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-background border border-border rounded-full px-2 py-0.5 text-[9px] text-muted-foreground font-mono">
          #{index + 1}
        </div>
      </div>

      {/* Arrow connector */}
      {!isLast && (
        <div className="flex items-center self-center px-2">
          <div className="w-8 h-px bg-gradient-to-r from-primary/50 to-primary/20" />
          <ArrowRight className="w-4 h-4 text-primary/50 -ml-1" />
        </div>
      )}
    </div>
  );
}

/* ── Vertical timeline (mobile-friendly) ─────────────────────────── */

function TimelineBlock({
  event,
  index,
  isLast,
}: {
  event: OwnershipEvent;
  index: number;
  isLast: boolean;
}) {
  const Icon = eventIcons[event.type] || Hash;
  const color = eventColors[event.type] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  const explorerBase = 'https://explorer.testnet.rootstock.io';

  return (
    <div className="relative pl-8 pb-8 last:pb-0">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[11px] top-8 w-0.5 h-[calc(100%-24px)] bg-gradient-to-b from-primary/50 to-primary/10" />
      )}

      {/* Timeline node */}
      <div
        className={`absolute left-0 top-0 w-6 h-6 rounded-full flex items-center justify-center ${color}`}
      >
        <Icon className="w-3 h-3" />
      </div>

      {/* Event card */}
      <div className="ml-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-border/50">
        <div className="flex items-start justify-between mb-2">
          <Badge className={color}>
            {event.type.charAt(0).toUpperCase() +
              event.type.slice(1)}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Block #{index + 1}
          </span>
        </div>

        <p className="text-sm text-muted-foreground mb-2">
          {formatDate(event.timestamp)}
        </p>

        {event.type === 'transfer' && event.to ? (
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => copyText(event.from)}
              className="font-mono text-foreground hover:text-primary"
            >
              {short(event.from)}
            </button>
            <ArrowRight className="w-4 h-4 text-primary" />
            <button
              onClick={() => copyText(event.to!)}
              className="font-mono text-foreground hover:text-primary"
            >
              {short(event.to)}
            </button>
          </div>
        ) : (
          <p className="text-sm font-mono text-foreground">
            By: {short(event.from)}
          </p>
        )}

        {event.txHash && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <a
              href={`${explorerBase}/tx/${event.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <LinkIcon className="w-3 h-3" />
              TX: {short(event.txHash, 8)}
              <ExternalLink className="w-3 h-3 ml-auto" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── main component ───────────────────────────────────────────────── */

const Provenance = () => {
  const { isConnected } = useWallet();
  const marketplace = useMarketplace();
  const [searchParams] = useSearchParams();
  const [contentHash, setContentHash] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [nft, setNft] = useState<MintedNFT | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [onChainEvents, setOnChainEvents] = useState<OwnershipEvent[]>([]);

  // Pre-fill from URL query param
  useEffect(() => {
    const hashParam = searchParams.get('hash');
    if (hashParam) {
      setContentHash(hashParam);
      doSearch(hashParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const MARKETPLACE_ADDR = (import.meta.env.VITE_MARKETPLACE_ADDRESS || '').toLowerCase();

  const doSearch = async (hash: string) => {
    if (!hash.trim()) {
      setError('Please enter a content hash');
      return;
    }
    setIsSearching(true);
    setError(null);
    setSearched(true);
    setOnChainEvents([]);

    await new Promise((r) => setTimeout(r, 300));

    // Try finding by content hash first, then by tokenId
    let found = getNFTByContentHash(hash.trim());
    if (!found) {
      // Try as tokenId (numeric)
      const { getNFTByTokenId } = await import('@/utils/mintedNFTs');
      found = getNFTByTokenId(hash.trim()) ?? null;
    }

    if (found) {
      setNft(found);

      // Fetch full on-chain Transfer history for this tokenId
      if (marketplace.isConfigured && found.tokenId) {
        try {
          const transfers = await marketplace.getTransferHistory(found.tokenId);
          if (transfers.length > 0) {
            const ZERO = '0x0000000000000000000000000000000000000000';
            const chainEvents: OwnershipEvent[] = transfers.map((t) => {
              let type: OwnershipEvent['type'] = 'transfer';
              if (t.from === ZERO) {
                type = 'creation';
              } else if (t.to.toLowerCase() === MARKETPLACE_ADDR) {
                type = 'listing'; // seller → marketplace
              } else if (t.from.toLowerCase() === MARKETPLACE_ADDR) {
                type = 'sale'; // marketplace → buyer
              }
              return {
                type,
                from: t.from,
                to: t.to,
                timestamp: new Date().toISOString(),
                txHash: t.txHash,
              };
            });
            setOnChainEvents(chainEvents);
          }
        } catch (err) {
          console.error('Failed to fetch on-chain transfers:', err);
        }
      }
    } else {
      setNft(null);
      setError(`No NFT found. Try searching by the content hash shown on the NFT detail page, or its Token ID.`);
    }
    setIsSearching(false);
  };

  const handleSearch = () => doSearch(contentHash);

  // Prefer on-chain events, fall back to local history
  const events = onChainEvents.length > 0 ? onChainEvents : (nft?.ownershipHistory ?? []);
  const gatewayImg = nft
    ? `https://gateway.pinata.cloud/ipfs/${nft.imageCID}`
    : '';


  return (
    <div className="min-h-screen blockchain-bg relative">
      <SpaceGeometryBackground />

      <div className="relative pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Content Provenance Tracking
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Verify the complete ownership history of any digital
              asset using its content hash. Track every transfer
              and event recorded on the chain.
            </p>
          </div>

          {/* Search */}
          <Card className="glass-card mb-8">
            <CardContent className="p-6">
              <div className="space-y-4">
                <label className="text-sm font-medium text-foreground">
                  Content Hash
                </label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      placeholder="Paste or enter a content hash..."
                      value={contentHash}
                      onChange={(e) =>
                        setContentHash(e.target.value)
                      }
                      onKeyDown={(e) =>
                        e.key === 'Enter' &&
                        handleSearch()
                      }
                      className="pl-10 glass border-glass-border h-12 font-mono text-sm"
                    />
                  </div>
                  <Button
                    onClick={handleSearch}
                    className="btn-primary h-12 px-6"
                    disabled={isSearching}
                  >
                    {isSearching ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Track Provenance
                      </>
                    )}
                  </Button>
                </div>
                {error && (
                  <p className="text-red-400 text-sm">
                    {error}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Results ───────────────────────────────────── */}
          {nft && (
            <div className="space-y-6 animate-fade-in">
              {/* NFT Summary Card */}
              <Card className="glass-card overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  {/* Image */}
                  <div className="md:w-48 flex-shrink-0">
                    <img
                      src={gatewayImg}
                      alt={nft.name}
                      className="w-full h-48 md:h-full object-cover"
                      onError={(e) => {
                        (
                          e.target as HTMLImageElement
                        ).src = '/placeholder.svg';
                      }}
                    />
                  </div>
                  {/* Details */}
                  <CardContent className="p-6 flex-1 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-foreground">
                          {nft.name}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Token #{nft.tokenId}
                        </p>
                      </div>
                      <Link
                        to={`/nft/${nft.tokenId}`}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        View NFT{' '}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-white/5">
                        <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                          <Shield className="w-3 h-3" />{' '}
                          Original Creator
                        </p>
                        <button
                          onClick={() =>
                            copyText(
                              events[0]?.from ??
                              nft.owner
                            )
                          }
                          className="font-mono text-foreground text-xs hover:text-primary transition-colors"
                        >
                          {events[0]?.from ??
                            nft.owner}
                        </button>
                      </div>
                      <div className="p-3 rounded-lg bg-white/5">
                        <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                          <User className="w-3 h-3" />{' '}
                          Current Owner
                        </p>
                        <button
                          onClick={() =>
                            copyText(nft.owner)
                          }
                          className="font-mono text-foreground text-xs hover:text-primary transition-colors"
                        >
                          {nft.owner}
                        </button>
                      </div>
                      <div className="p-3 rounded-lg bg-white/5">
                        <p className="text-xs text-muted-foreground mb-0.5">
                          Content Hash
                        </p>
                        <div className="flex items-center gap-1">
                          <code className="font-mono text-foreground text-[10px] break-all">
                            {nft.contentHash}
                          </code>
                          <button
                            onClick={() =>
                              copyText(
                                nft.contentHash
                              )
                            }
                            className="flex-shrink-0"
                          >
                            <Copy className="w-3 h-3 text-muted-foreground hover:text-primary" />
                          </button>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-white/5">
                        <p className="text-xs text-muted-foreground mb-0.5">
                          {nft.isListed
                            ? 'Listed Price'
                            : 'Status'}
                        </p>
                        <p className="font-semibold text-foreground text-sm">
                          {nft.isListed && nft.price
                            ? `${nft.price} tRBTC`
                            : 'Not Listed'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>

              {/* ── Ownership Chain ── */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <LinkIcon className="w-5 h-5 text-blockchain-primary" />
                    Ownership Chain
                    <Badge variant="secondary" className="ml-auto">
                      {events.length} event{events.length !== 1 ? 's' : ''}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {events.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No ownership events recorded yet.
                    </p>
                  ) : (
                    <>
                      {/* Horizontal chain (desktop) */}
                      <div className="hidden md:block overflow-x-auto pb-6 pt-2">
                        <div className="flex items-start min-w-max px-2">
                          {events.map((event, i) => (
                            <ChainBlock
                              key={i}
                              event={event}
                              index={i}
                              isLast={
                                i ===
                                events.length - 1
                              }
                            />
                          ))}
                        </div>
                      </div>

                      {/* Vertical timeline (mobile) */}
                      <div className="md:hidden">
                        {events.map((event, i) => (
                          <TimelineBlock
                            key={i}
                            event={event}
                            index={i}
                            isLast={
                              i ===
                              events.length - 1
                            }
                          />
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Unique Owners Summary */}
              {events.length > 0 && (
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground text-base">
                      <User className="w-4 h-4 text-blockchain-primary" />
                      All Owners
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(() => {
                        // Build unique ordered owner list
                        const owners: string[] = [];
                        for (const ev of events) {
                          if (!owners.includes(ev.from))
                            owners.push(ev.from);
                          if (ev.to && !owners.includes(ev.to))
                            owners.push(ev.to);
                        }
                        return owners.map((addr, i) => (
                          <div
                            key={addr}
                            className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                {i + 1}
                              </div>
                              <div>
                                <p className="font-mono text-foreground text-xs">
                                  {addr}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {i === 0
                                    ? 'Original Creator'
                                    : addr.toLowerCase() === nft.owner.toLowerCase()
                                      ? 'Current Owner'
                                      : 'Previous Owner'}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => copyText(addr)}
                              className="p-1.5 rounded hover:bg-muted transition-colors"
                              title="Copy address"
                            >
                              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                          </div>
                        ));
                      })()}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Empty State */}
          {!nft && !isSearching && !searched && (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blockchain-primary/10 mb-6">
                <Search className="w-10 h-10 text-blockchain-primary" />
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-2">
                Enter a Content Hash
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Paste a content hash to view the complete
                ownership history and provenance chain of any
                registered NFT.
              </p>
            </div>
          )}

          {/* Not found state */}
          {!nft && searched && !isSearching && error && (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 mb-6">
                <Hash className="w-10 h-10 text-red-400" />
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-2">
                NFT Not Found
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                No registered NFT matches this content hash. The
                asset may not have been minted through Netra yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Provenance;
