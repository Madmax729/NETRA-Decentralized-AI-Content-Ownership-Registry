import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/hooks/use-wallet';
import {
  Search, Bell, BellRing, Shield, AlertTriangle, CheckCircle,
  Globe, Youtube, Twitter, Upload, Eye, Clock, Loader2, X, Image as ImageIcon
} from 'lucide-react';

type Platform = 'google' | 'youtube' | 'x';
type AlertLevel = 'high' | 'medium' | 'low';

interface ScanResult {
  id: string;
  platform: Platform;
  url: string;
  matchScore: number;
  title: string;
  timestamp: string;
  alertLevel: AlertLevel;
  thumbnail?: string;
}

interface MonitoredNFT {
  id: string;
  name: string;
  imageHash: string;
  platforms: Platform[];
  isActive: boolean;
  lastScan: string;
  alertCount: number;
}

const PLATFORM_CONFIG: Record<Platform, { icon: React.ElementType; label: string; color: string }> = {
  google: { icon: Globe, label: 'Google Images', color: 'bg-primary/10 text-primary' },
  youtube: { icon: Youtube, label: 'YouTube', color: 'bg-primary/10 text-primary' },
  x: { icon: Twitter, label: 'X (Twitter)', color: 'bg-primary/10 text-primary' },
};

const Automation = () => {
  const { address } = useWallet();
  const { toast } = useToast();

  const [manualFile, setManualFile] = useState<File | null>(null);
  const [manualPreview, setManualPreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['google', 'youtube', 'x']);

  // Automated monitoring state
  const [monitoredNFTs] = useState<MonitoredNFT[]>([
    {
      id: '1',
      name: 'Cyber Ape #4421',
      imageHash: '0xabc...def',
      platforms: ['google', 'youtube', 'x'],
      isActive: true,
      lastScan: '2 hours ago',
      alertCount: 3,
    },
    {
      id: '2',
      name: 'Digital Landscape #12',
      imageHash: '0x123...789',
      platforms: ['google', 'x'],
      isActive: true,
      lastScan: '5 hours ago',
      alertCount: 0,
    },
    {
      id: '3',
      name: 'Abstract Sound #88',
      imageHash: '0xfed...321',
      platforms: ['youtube'],
      isActive: false,
      lastScan: '1 day ago',
      alertCount: 1,
    },
  ]);

  const [alerts] = useState<ScanResult[]>([
    {
      id: 'a1',
      platform: 'google',
      url: 'https://images.example.com/stolen-art-1',
      matchScore: 94,
      title: 'Unauthorized use on art blog',
      timestamp: '35 min ago',
      alertLevel: 'high',
    },
    {
      id: 'a2',
      platform: 'youtube',
      url: 'https://youtube.com/watch?v=example',
      matchScore: 78,
      title: 'Used as thumbnail without permission',
      timestamp: '2 hours ago',
      alertLevel: 'medium',
    },
    {
      id: 'a3',
      platform: 'x',
      url: 'https://x.com/user/status/12345',
      matchScore: 62,
      title: 'Similar content posted by unknown user',
      timestamp: '6 hours ago',
      alertLevel: 'low',
    },
  ]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setManualFile(file);
    setScanResults([]);
    const reader = new FileReader();
    reader.onload = (ev) => setManualPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const runManualScan = async () => {
    if (!manualFile) {
      toast({ title: 'No file selected', description: 'Upload an image to scan.', variant: 'destructive' });
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast({ title: 'No platform selected', description: 'Select at least one platform.', variant: 'destructive' });
      return;
    }

    setIsScanning(true);
    setScanResults([]);

    // Simulate scanning delay per platform
    await new Promise((r) => setTimeout(r, 2500));

    const mockResults: ScanResult[] = [];
    if (selectedPlatforms.includes('google')) {
      mockResults.push({
        id: 'r1',
        platform: 'google',
        url: 'https://example.com/blog/stolen-image',
        matchScore: 91,
        title: 'Matching image found on art marketplace',
        timestamp: 'Just now',
        alertLevel: 'high',
      });
    }
    if (selectedPlatforms.includes('youtube')) {
      mockResults.push({
        id: 'r2',
        platform: 'youtube',
        url: 'https://youtube.com/watch?v=abc123',
        matchScore: 67,
        title: 'Partial match in video thumbnail',
        timestamp: 'Just now',
        alertLevel: 'medium',
      });
    }
    if (selectedPlatforms.includes('x')) {
      mockResults.push({
        id: 'r3',
        platform: 'x',
        url: 'https://x.com/anon_user/status/999',
        matchScore: 55,
        title: 'Similar artwork posted 3 days ago',
        timestamp: 'Just now',
        alertLevel: 'low',
      });
    }

    setScanResults(mockResults);
    setIsScanning(false);
    toast({ title: 'Scan Complete', description: `${mockResults.length} result(s) found across ${selectedPlatforms.length} platform(s).` });
  };

  const alertLevelBadge = (level: AlertLevel) => {
    const map: Record<AlertLevel, string> = {
      high: 'bg-destructive/10 text-destructive border-destructive/30',
      medium: 'bg-primary/10 text-primary border-primary/30',
      low: 'bg-muted text-muted-foreground border-border',
    };
    return map[level];
  };

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

      <div className="relative z-10 pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-foreground mb-2">Automation</h1>
          <p className="text-muted-foreground text-lg">
            Monitor the internet for unauthorized use of your NFTs and digital assets.
          </p>
        </div>

        {!address && (
          <Card className="glass-card mb-8">
            <CardContent className="p-6 flex items-center gap-3">
              <Shield className="w-5 h-5 text-muted-foreground" />
              <span className="text-muted-foreground">Connect your wallet to enable automated monitoring.</span>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="automated" className="space-y-6">
          <TabsList className="glass">
            <TabsTrigger value="automated" className="gap-2"><Eye className="w-4 h-4" /> Automated</TabsTrigger>
            <TabsTrigger value="manual" className="gap-2"><Search className="w-4 h-4" /> Manual Check</TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <BellRing className="w-4 h-4" />
              Alerts
              {alerts.length > 0 && (
                <Badge variant="outline" className="ml-1 bg-destructive/10 text-destructive border-destructive/30 text-xs">
                  {alerts.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ───── AUTOMATED TAB ───── */}
          <TabsContent value="automated" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" />
                  Monitored NFTs
                </CardTitle>
                <CardDescription>
                  Your assets being continuously scanned across Google, YouTube, and X for unauthorized usage.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {monitoredNFTs.map((nft) => (
                  <div
                    key={nft.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-border bg-background/50 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{nft.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{nft.imageHash}</p>
                        <div className="flex gap-1 mt-1">
                          {nft.platforms.map((p) => {
                            const cfg = PLATFORM_CONFIG[p];
                            return (
                              <Badge key={p} variant="outline" className={`text-[10px] ${cfg.color}`}>
                                {cfg.label}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {nft.lastScan}
                        </div>
                        {nft.alertCount > 0 && (
                          <span className="text-destructive text-xs font-medium">{nft.alertCount} alert(s)</span>
                        )}
                      </div>
                      <Switch checked={nft.isActive} />
                    </div>
                  </div>
                ))}

                <Button variant="outline" className="btn-glass w-full mt-4 gap-2">
                  <Upload className="w-4 h-4" />
                  Add NFT to Monitor
                </Button>
              </CardContent>
            </Card>

            {/* How it works */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">How Automated Monitoring Works</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { step: '1', title: 'Register NFT', desc: 'Add your NFT image hash and select platforms to monitor.' },
                    { step: '2', title: 'Continuous Scan', desc: 'Our engine performs reverse-image & content matching every few hours.' },
                    { step: '3', title: 'Instant Alerts', desc: 'Get notified immediately when a potential match is found.' },
                  ].map((s) => (
                    <div key={s.step} className="p-4 rounded-xl border border-border text-center space-y-2">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto font-bold text-sm">
                        {s.step}
                      </div>
                      <p className="font-medium text-foreground">{s.title}</p>
                      <p className="text-sm text-muted-foreground">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ───── MANUAL CHECK TAB ───── */}
          <TabsContent value="manual" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Search className="w-5 h-5 text-primary" />
                  Manual Theft Check
                </CardTitle>
                <CardDescription>
                  Upload an image and scan selected platforms for unauthorized copies.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Upload area */}
                <div className="flex flex-col items-center gap-4">
                  {manualPreview ? (
                    <div className="relative">
                      <img
                        src={manualPreview}
                        alt="Preview"
                        className="w-48 h-48 object-cover rounded-xl border border-border"
                      />
                      <button
                        onClick={() => { setManualFile(null); setManualPreview(null); setScanResults([]); }}
                        className="absolute -top-2 -right-2 bg-background border border-border rounded-full p-1 hover:bg-muted"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-full max-w-md border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:bg-muted/20 transition-colors">
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Click to upload or drag & drop</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP up to 10MB</p>
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
                    </label>
                  )}
                </div>

                {/* Platform selection */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-3">Platforms to scan</p>
                  <div className="flex gap-3">
                    {(Object.entries(PLATFORM_CONFIG) as [Platform, typeof PLATFORM_CONFIG[Platform]][]).map(
                      ([key, cfg]) => {
                        const active = selectedPlatforms.includes(key);
                        return (
                          <button
                            key={key}
                            onClick={() => togglePlatform(key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                              active
                                ? 'border-primary bg-primary/10 text-foreground'
                                : 'border-border text-muted-foreground hover:border-primary/40'
                            }`}
                          >
                            <cfg.icon className="w-4 h-4" />
                            {cfg.label}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                <Button
                  className="btn-primary w-full gap-2"
                  onClick={runManualScan}
                  disabled={isScanning || !manualFile}
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Scanning…
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" /> Run Scan
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Scan Results */}
            {scanResults.length > 0 && (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg">Scan Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {scanResults.map((r) => {
                    const cfg = PLATFORM_CONFIG[r.platform];
                    return (
                      <div
                        key={r.id}
                        className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <cfg.icon className="w-4 h-4 text-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">{r.title}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-sm">{r.url}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={alertLevelBadge(r.alertLevel)}>
                            {r.matchScore}% match
                          </Badge>
                          <Button variant="outline" size="sm" className="btn-glass text-xs" asChild>
                            <a href={r.url} target="_blank" rel="noopener noreferrer">View</a>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ───── ALERTS TAB ───── */}
          <TabsContent value="alerts" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  Theft Alerts
                </CardTitle>
                <CardDescription>
                  Notifications for potential unauthorized usage of your NFTs detected by automated scans.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {alerts.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No alerts — your content is safe!</p>
                  </div>
                ) : (
                  alerts.map((a) => {
                    const cfg = PLATFORM_CONFIG[a.platform];
                    return (
                      <div
                        key={a.id}
                        className="flex items-start gap-4 p-4 rounded-xl border border-border hover:bg-muted/20 transition-colors"
                      >
                        <div className={`p-2 rounded-lg shrink-0 ${
                          a.alertLevel === 'high' ? 'bg-destructive/10' : 'bg-muted'
                        }`}>
                          {a.alertLevel === 'high' ? (
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                          ) : (
                            <cfg.icon className="w-5 h-5 text-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-foreground text-sm">{a.title}</p>
                            <Badge variant="outline" className={alertLevelBadge(a.alertLevel)}>
                              {a.alertLevel}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{a.url}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <cfg.icon className="w-3 h-3" /> {cfg.label}
                            </span>
                            <span>{a.matchScore}% match</span>
                            <span>{a.timestamp}</span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="btn-glass text-xs shrink-0" asChild>
                          <a href={a.url} target="_blank" rel="noopener noreferrer">View</a>
                        </Button>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Automation;
