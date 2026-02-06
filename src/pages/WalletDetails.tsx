import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SpaceGeometryBackground from '@/components/SpaceGeometryBackground';
import { useWallet } from '@/hooks/use-wallet';
import { Link } from 'react-router-dom';
import { 
  Wallet,
  Globe,
  Coins,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  ExternalLink,
  Clock,
  Shield,
  Hash,
  ArrowRight,
  Copy,
  CheckCircle
} from 'lucide-react';
import { useState } from 'react';

interface RegisteredContent {
  id: string;
  title: string;
  type: 'image' | 'video' | 'audio' | 'document';
  contentHash: string;
  registrationDate: string;
  ipfsCID: string;
  status: 'verified' | 'pending' | 'disputed';
  thumbnail?: string;
}

const WalletDetails = () => {
  const { isConnected, address, connect, isConnecting, switchAccount } = useWallet();
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Mock wallet data
  const walletInfo = {
    network: 'Ethereum Mainnet',
    balance: '2.4532 ETH',
    chainId: 1
  };

  // Mock registered content
  const registeredContent: RegisteredContent[] = [
    {
      id: '1',
      title: 'Digital Dreamscape #001',
      type: 'image',
      contentHash: '0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
      registrationDate: '2024-01-15',
      ipfsCID: 'QmX7YzKvZjW9Hf2k',
      status: 'verified'
    },
    {
      id: '2',
      title: 'Abstract Motion #042',
      type: 'video',
      contentHash: '0x8a94b2768ff2gd64c93ed19259b2e76efd3e5c2gb4e788395beef311237e1170',
      registrationDate: '2024-01-20',
      ipfsCID: 'QmY8ZaLvKzX8Gj3m',
      status: 'verified'
    },
    {
      id: '3',
      title: 'Ambient Waves #007',
      type: 'audio',
      contentHash: '0x9b05c3879gg3he75d04fe20360c3f87fge4f6d3hc5f899406cgff422348f2281',
      registrationDate: '2024-01-25',
      ipfsCID: 'QmZ9AbMwLyY7Hk4n',
      status: 'pending'
    },
    {
      id: '4',
      title: 'Research Paper Draft',
      type: 'document',
      contentHash: '0xac16d4980hh4if86e15gf31471d4g98hgf5g7e4id6g900517dhgg533459g3392',
      registrationDate: '2024-02-01',
      ipfsCID: 'QmA1BcNdOzZ6Il5o',
      status: 'verified'
    }
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return ImageIcon;
      case 'video': return Video;
      case 'audio': return Music;
      case 'document': return FileText;
      default: return FileText;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'image': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'video': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'audio': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'document': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'disputed': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen blockchain-bg relative">
        <SpaceGeometryBackground />
        
        <div className="relative pt-24 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-blockchain-primary/10 mb-8">
                <Wallet className="w-12 h-12 text-blockchain-primary" />
              </div>
              <h1 className="text-4xl font-bold text-foreground mb-4">
                Connect Your Wallet
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-md mx-auto">
                Connect your MetaMask wallet to view your Web3 identity dashboard and registered content.
              </p>
              <Button 
                onClick={connect} 
                className="btn-primary text-lg px-8 py-6"
                disabled={isConnecting}
              >
                {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen blockchain-bg relative">
      <SpaceGeometryBackground />
      
      <div className="relative pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Wallet Dashboard
            </h1>
            <p className="text-muted-foreground">
              Your Web3 identity and registered content overview
            </p>
          </div>

          {/* Wallet Info Section */}
          <Card className="glass-card mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Wallet className="w-5 h-5 text-blockchain-primary" />
                Wallet Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Address */}
                <div className="p-4 rounded-lg bg-white/5 col-span-full">
                  <p className="text-sm text-muted-foreground mb-2">Wallet Address</p>
                  <div className="flex items-center gap-3">
                    <p className="font-mono text-foreground text-sm md:text-base break-all">
                      {address}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-shrink-0"
                      onClick={copyAddress}
                    >
                      {copiedAddress ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Network */}
                <div className="p-4 rounded-lg bg-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Network</p>
                  </div>
                  <p className="font-semibold text-foreground">{walletInfo.network}</p>
                  <p className="text-xs text-muted-foreground mt-1">Chain ID: {walletInfo.chainId}</p>
                </div>

                {/* Balance */}
                <div className="p-4 rounded-lg bg-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Coins className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Balance</p>
                  </div>
                  <p className="font-semibold text-foreground text-xl">{walletInfo.balance}</p>
                </div>

                {/* Actions */}
                <div className="p-4 rounded-lg bg-white/5 flex items-center justify-center">
                  <Button
                    variant="outline"
                    className="btn-glass"
                    onClick={address ? switchAccount : connect}
                    disabled={isConnecting}
                  >
                    {isConnecting ? "Switching..." : "Switch Account"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Registered Content Section */}
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Shield className="w-5 h-5 text-blockchain-primary" />
                  Your Registered Content
                </CardTitle>
                <Badge className="bg-blockchain-primary/20 text-blockchain-primary border-blockchain-primary/30">
                  {registeredContent.length} Items
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {registeredContent.map((content) => {
                  const TypeIcon = getTypeIcon(content.type);
                  return (
                    <div
                      key={content.id}
                      className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
                    >
                      <div className="flex items-start gap-4">
                        {/* Thumbnail/Icon */}
                        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blockchain-primary/20 to-blockchain-secondary/20 flex items-center justify-center flex-shrink-0">
                          <TypeIcon className="w-8 h-8 text-blockchain-primary/60" />
                        </div>

                        {/* Content Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold text-foreground truncate">
                              {content.title}
                            </h3>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge className={getTypeColor(content.type)}>
                                <TypeIcon className="w-3 h-3 mr-1" />
                                {content.type}
                              </Badge>
                              <Badge className={getStatusColor(content.status)}>
                                {content.status}
                              </Badge>
                            </div>
                          </div>

                          {/* Hash */}
                          <div className="flex items-center gap-2 mb-2">
                            <Hash className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <p className="font-mono text-xs text-muted-foreground truncate">
                              {content.contentHash}
                            </p>
                          </div>

                          {/* Meta Info */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {content.registrationDate}
                            </span>
                            <span className="font-mono">
                              IPFS: {content.ipfsCID}
                            </span>
                          </div>
                        </div>

                        {/* Action */}
                        <Link to="/provenance" className="flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            View Provenance
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Actions */}
              <div className="mt-6 pt-6 border-t border-glass-border">
                <div className="flex flex-wrap gap-3">
                  <Link to="/watermark">
                    <Button className="btn-glass">
                      <Shield className="w-4 h-4 mr-2" />
                      Register New Content
                    </Button>
                  </Link>
                  <Link to="/verify">
                    <Button className="btn-glass">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Verify Ownership
                    </Button>
                  </Link>
                  <Link to="/marketplace">
                    <Button className="btn-glass">
                      Browse Marketplace
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default WalletDetails;
