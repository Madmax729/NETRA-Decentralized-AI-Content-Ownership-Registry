import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import SpaceGeometryBackground from '@/components/SpaceGeometryBackground';
import { useWallet } from '@/hooks/use-wallet';
import { 
  Search,
  CheckCircle,
  Clock,
  User,
  Hash,
  ExternalLink,
  FileText,
  ArrowDown,
  Shield,
  Link as LinkIcon
} from 'lucide-react';

interface ProvenanceEvent {
  id: string;
  type: 'creation' | 'transfer' | 'verification' | 'update';
  from: string;
  to?: string;
  timestamp: string;
  txHash: string;
  blockNumber: number;
  ipfsCID?: string;
}

interface ProvenanceData {
  contentHash: string;
  originalCreator: string;
  currentOwner: string;
  createdAt: string;
  ipfsCID: string;
  events: ProvenanceEvent[];
}

const Provenance = () => {
  const { isConnected } = useWallet();
  const [contentHash, setContentHash] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [provenanceData, setProvenanceData] = useState<ProvenanceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mock provenance data - in production, this would come from blockchain
  const mockProvenanceData: ProvenanceData = {
    contentHash: '0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    originalCreator: '0x742d35Cc6634C0532925a3b844Bc9e7595f2F847',
    currentOwner: '0x8B3d35Cc6634C0532925a3b844Bc9e7595f2A291',
    createdAt: '2024-01-15T10:30:00Z',
    ipfsCID: 'QmX7YzKvZjW...9Hf2k',
    events: [
      {
        id: '1',
        type: 'creation',
        from: '0x742d35Cc6634C0532925a3b844Bc9e7595f2F847',
        timestamp: '2024-01-15T10:30:00Z',
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        blockNumber: 18923456,
        ipfsCID: 'QmX7YzKvZjW...9Hf2k'
      },
      {
        id: '2',
        type: 'verification',
        from: '0x742d35Cc6634C0532925a3b844Bc9e7595f2F847',
        timestamp: '2024-01-20T14:45:00Z',
        txHash: '0x2345678901bcdef02345678901bcdef02345678901bcdef02345678901bcdef0',
        blockNumber: 18956789
      },
      {
        id: '3',
        type: 'transfer',
        from: '0x742d35Cc6634C0532925a3b844Bc9e7595f2F847',
        to: '0x8B3d35Cc6634C0532925a3b844Bc9e7595f2A291',
        timestamp: '2024-02-01T09:15:00Z',
        txHash: '0x3456789012cdef013456789012cdef013456789012cdef013456789012cdef01',
        blockNumber: 18998765
      },
      {
        id: '4',
        type: 'verification',
        from: '0x8B3d35Cc6634C0532925a3b844Bc9e7595f2A291',
        timestamp: '2024-02-05T16:20:00Z',
        txHash: '0x4567890123def0124567890123def0124567890123def0124567890123def012',
        blockNumber: 19012345
      }
    ]
  };

  const handleSearch = async () => {
    if (!contentHash.trim()) {
      setError('Please enter a content hash');
      return;
    }

    setIsSearching(true);
    setError(null);

    // Simulate blockchain query
    await new Promise(resolve => setTimeout(resolve, 1500));

    // For demo purposes, show mock data
    setProvenanceData(mockProvenanceData);
    setIsSearching(false);
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'creation': return Shield;
      case 'transfer': return User;
      case 'verification': return CheckCircle;
      case 'update': return FileText;
      default: return Hash;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'creation': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'transfer': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'verification': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'update': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen blockchain-bg relative">
      <SpaceGeometryBackground />
      
      <div className="relative pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Content Provenance Tracking
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Verify the complete ownership history of any digital asset using its content hash. 
              Track every transfer, verification, and update recorded on the blockchain.
            </p>
          </div>

          {/* Search Card */}
          <Card className="glass-card mb-8">
            <CardContent className="p-6">
              <div className="space-y-4">
                <label className="text-sm font-medium text-foreground">
                  Content Hash (SHA-256 / Keccak-256)
                </label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      placeholder="0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069"
                      value={contentHash}
                      onChange={(e) => setContentHash(e.target.value)}
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
                  <p className="text-red-400 text-sm">{error}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Provenance Results */}
          {provenanceData && (
            <div className="space-y-6 animate-fade-in">
              {/* Summary Card */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Shield className="w-5 h-5 text-blockchain-primary" />
                    Ownership Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-white/5">
                      <p className="text-sm text-muted-foreground mb-1">Original Creator</p>
                      <p className="font-mono text-foreground text-sm">
                        {provenanceData.originalCreator}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-white/5">
                      <p className="text-sm text-muted-foreground mb-1">Current Owner</p>
                      <p className="font-mono text-foreground text-sm">
                        {provenanceData.currentOwner}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-white/5">
                      <p className="text-sm text-muted-foreground mb-1">IPFS CID</p>
                      <p className="font-mono text-foreground text-sm flex items-center gap-2">
                        {provenanceData.ipfsCID}
                        <ExternalLink className="w-4 h-4 text-blockchain-primary cursor-pointer" />
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-white/5">
                      <p className="text-sm text-muted-foreground mb-1">Created</p>
                      <p className="text-foreground text-sm">
                        {formatDate(provenanceData.createdAt)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Clock className="w-5 h-5 text-blockchain-primary" />
                    Ownership Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    {provenanceData.events.map((event, index) => {
                      const EventIcon = getEventIcon(event.type);
                      const isLast = index === provenanceData.events.length - 1;
                      
                      return (
                        <div key={event.id} className="relative pl-8 pb-8 last:pb-0">
                          {/* Timeline Line */}
                          {!isLast && (
                            <div className="absolute left-[11px] top-8 w-0.5 h-[calc(100%-24px)] bg-gradient-to-b from-blockchain-primary/50 to-blockchain-primary/10" />
                          )}
                          
                          {/* Timeline Node */}
                          <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-blockchain-primary/20 border-2 border-blockchain-primary flex items-center justify-center">
                            <EventIcon className="w-3 h-3 text-blockchain-primary" />
                          </div>
                          
                          {/* Event Card */}
                          <div className="ml-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                            <div className="flex items-start justify-between mb-2">
                              <Badge className={getEventColor(event.type)}>
                                {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Block #{event.blockNumber.toLocaleString()}
                              </span>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-2">
                              {formatDate(event.timestamp)}
                            </p>
                            
                            {event.type === 'transfer' ? (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-mono text-foreground">
                                  {formatAddress(event.from)}
                                </span>
                                <ArrowDown className="w-4 h-4 text-blockchain-primary rotate-[-90deg]" />
                                <span className="font-mono text-foreground">
                                  {event.to ? formatAddress(event.to) : '-'}
                                </span>
                              </div>
                            ) : (
                              <p className="text-sm font-mono text-foreground">
                                By: {formatAddress(event.from)}
                              </p>
                            )}
                            
                            <div className="mt-3 pt-3 border-t border-glass-border">
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <LinkIcon className="w-3 h-3" />
                                TX: {formatAddress(event.txHash)}
                                <ExternalLink className="w-3 h-3 ml-auto cursor-pointer text-blockchain-primary" />
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Empty State */}
          {!provenanceData && !isSearching && (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blockchain-primary/10 mb-6">
                <Search className="w-10 h-10 text-blockchain-primary" />
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-2">
                Enter a Content Hash
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Paste a SHA-256 or Keccak-256 hash to view the complete ownership history 
                and provenance chain of any registered content.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Provenance;
