import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import SpaceGeometryBackground from '@/components/SpaceGeometryBackground';
import { useWallet } from '@/hooks/use-wallet';
import { 
  Wallet, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Search,
  Filter,
  ExternalLink,
  Eye,
  Heart,
  Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface NFTItem {
  id: string;
  title: string;
  owner: string;
  price: string;
  listed: boolean;
  assetType: 'image' | 'video' | 'audio';
  thumbnail: string;
  ipfsCID: string;
  createdAt: string;
  views: number;
  likes: number;
}

const NFTMarketplace = () => {
  const { isConnected, address, connect, isConnecting } = useWallet();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video' | 'audio'>('all');

  // Mock NFT data - in production, this would come from smart contract events
  const mockNFTs: NFTItem[] = [
    {
      id: '1',
      title: 'Digital Dreamscape #001',
      owner: '0x742d...F847',
      price: '0.5 ETH',
      listed: true,
      assetType: 'image',
      thumbnail: '/placeholder.svg',
      ipfsCID: 'QmX7YzKvZjW...9Hf2k',
      createdAt: '2024-01-15',
      views: 234,
      likes: 56
    },
    {
      id: '2',
      title: 'Abstract Motion #042',
      owner: '0x8B3d...A291',
      price: '1.2 ETH',
      listed: true,
      assetType: 'video',
      thumbnail: '/placeholder.svg',
      ipfsCID: 'QmY8ZaLvKzX...8Gj3m',
      createdAt: '2024-01-20',
      views: 189,
      likes: 43
    },
    {
      id: '3',
      title: 'Ambient Waves #007',
      owner: '0x1F5e...C482',
      price: '0.3 ETH',
      listed: false,
      assetType: 'audio',
      thumbnail: '/placeholder.svg',
      ipfsCID: 'QmZ9AbMwLyY...7Hk4n',
      createdAt: '2024-01-25',
      views: 98,
      likes: 21
    },
    {
      id: '4',
      title: 'Cyber Genesis #128',
      owner: '0x4D2c...B563',
      price: '2.0 ETH',
      listed: true,
      assetType: 'image',
      thumbnail: '/placeholder.svg',
      ipfsCID: 'QmA1BcNdOzZ...6Il5o',
      createdAt: '2024-02-01',
      views: 567,
      likes: 134
    },
    {
      id: '5',
      title: 'Neural Network Art',
      owner: '0x9E7f...D674',
      price: '0.8 ETH',
      listed: true,
      assetType: 'image',
      thumbnail: '/placeholder.svg',
      ipfsCID: 'QmB2CdPeQaA...5Jm6p',
      createdAt: '2024-02-05',
      views: 321,
      likes: 78
    },
    {
      id: '6',
      title: 'Synthwave Echoes',
      owner: '0x3A8b...E785',
      price: '0.15 ETH',
      listed: true,
      assetType: 'audio',
      thumbnail: '/placeholder.svg',
      ipfsCID: 'QmC3DeQfRbB...4Kn7q',
      createdAt: '2024-02-10',
      views: 145,
      likes: 32
    },
  ];

  const getAssetIcon = (type: 'image' | 'video' | 'audio') => {
    switch (type) {
      case 'image': return ImageIcon;
      case 'video': return Video;
      case 'audio': return Music;
    }
  };

  const getAssetColor = (type: 'image' | 'video' | 'audio') => {
    switch (type) {
      case 'image': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'video': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'audio': return 'bg-green-500/20 text-green-400 border-green-500/30';
    }
  };

  const filteredNFTs = mockNFTs.filter(nft => {
    const matchesSearch = nft.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          nft.owner.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || nft.assetType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen blockchain-bg relative">
      <SpaceGeometryBackground />
      
      <div className="relative pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              NFT Marketplace
            </h1>
            <p className="text-muted-foreground">
              Browse, discover, and collect protected digital assets
            </p>
          </div>

          {/* Wallet Status */}
          <Card className="glass-card mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-xl bg-blockchain-primary/10">
                    <Wallet className="w-6 h-6 text-blockchain-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {isConnected ? 'Wallet Connected' : 'Connect Your Wallet'}
                    </h3>
                    <p className="text-sm text-muted-foreground font-mono">
                      {isConnected 
                        ? address
                        : 'Connect MetaMask to browse and collect NFTs'
                      }
                    </p>
                  </div>
                </div>
                {!isConnected && (
                  <Button onClick={connect} className="btn-primary" disabled={isConnecting}>
                    {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                  </Button>
                )}
                {isConnected && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    Connected
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by title or owner address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 glass border-glass-border h-12"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'image', 'video', 'audio'] as const).map((type) => (
                <Button
                  key={type}
                  variant={filterType === type ? 'default' : 'outline'}
                  onClick={() => setFilterType(type)}
                  className={filterType === type ? 'btn-primary' : 'btn-glass'}
                >
                  {type === 'all' ? <Filter className="w-4 h-4 mr-2" /> : null}
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* NFT Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNFTs.map((nft) => {
              const AssetIcon = getAssetIcon(nft.assetType);
              return (
                <Card 
                  key={nft.id} 
                  className="glass-card overflow-hidden group hover:scale-[1.02] transition-all duration-300 cursor-pointer"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-square bg-gradient-to-br from-blockchain-primary/20 to-blockchain-secondary/20 overflow-hidden">
                    <img 
                      src={nft.thumbnail} 
                      alt={nft.title}
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <AssetIcon className="w-16 h-16 text-white/40" />
                    </div>
                    
                    {/* Asset Type Badge */}
                    <Badge className={`absolute top-3 left-3 ${getAssetColor(nft.assetType)}`}>
                      <AssetIcon className="w-3 h-3 mr-1" />
                      {nft.assetType}
                    </Badge>
                    
                    {/* Listing Status */}
                    {nft.listed ? (
                      <Badge className="absolute top-3 right-3 bg-green-500/20 text-green-400 border-green-500/30">
                        Listed
                      </Badge>
                    ) : (
                      <Badge className="absolute top-3 right-3 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                        Not Listed
                      </Badge>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                      <Link to={`/provenance`}>
                        <Button size="sm" className="btn-glass">
                          <Eye className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    {/* Title */}
                    <h3 className="text-lg font-semibold text-foreground mb-2 truncate">
                      {nft.title}
                    </h3>
                    
                    {/* Owner */}
                    <p className="text-sm text-muted-foreground mb-3 font-mono truncate">
                      Owner: {nft.owner}
                    </p>

                    {/* Price and Stats */}
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-blockchain-primary">
                        {nft.price}
                      </span>
                      <div className="flex items-center gap-3 text-muted-foreground text-sm">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {nft.views}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {nft.likes}
                        </span>
                      </div>
                    </div>

                    {/* IPFS CID */}
                    <div className="mt-3 pt-3 border-t border-glass-border">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {nft.createdAt}
                        <span className="ml-auto font-mono truncate max-w-[120px]">
                          {nft.ipfsCID}
                        </span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Empty State */}
          {filteredNFTs.length === 0 && (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blockchain-primary/10 mb-6">
                <Search className="w-10 h-10 text-blockchain-primary" />
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-2">
                No NFTs Found
              </h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NFTMarketplace;
