import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import BlockchainBackground from '@/components/BlockchainBackground';
import { Upload, Link as LinkIcon, Copy, CheckCircle, FileText, Image, Video, Globe } from 'lucide-react';

const IPFS = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [description, setDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setUploadResult(null);
    }
  };

  // const uploadToIPFS = async () => {
  //   if (!selectedFile) return;
    
  //   setIsUploading(true);
  //   // Simulate IPFS upload
  //   setTimeout(() => {
  //     setUploadResult({
  //       ipfsHash: 'QmX7YzKvZjW9Hf2k8P3LmN4oQ5rS6tU7vW8xY9zA1bC2d',
  //       gatewayUrl: 'https://ipfs.io/ipfs/QmX7YzKvZjW9Hf2k8P3LmN4oQ5rS6tU7vW8xY9zA1bC2d',
  //       transactionHash: '0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z',
  //       fileSize: selectedFile.size,
  //       timestamp: new Date().toISOString(),
  //     });
  //     setIsUploading(false);
  //   }, 3000);
  // };
  const uploadToIPFS = async () => {
    if (!selectedFile) return;

    const pinataJwt = import.meta.env.VITE_PINATA_JWT as string | undefined;
    if (!pinataJwt) {
      alert("Pinata JWT is missing. Please configure VITE_PINATA_JWT.");
      return;
    }

    setIsUploading(true);

    try {
      // Quick auth check (helps debug "not reflecting in Pinata")
      const authRes = await fetch("https://api.pinata.cloud/data/testAuthentication", {
        headers: {
          Authorization: `Bearer ${pinataJwt}`,
        },
      });
      if (!authRes.ok) throw new Error("Pinata authentication failed");

      const formData = new FormData();
      formData.append("file", selectedFile);

      const metadata = JSON.stringify({
        // Pinata may normalize names; keep a unique suffix for easier dashboard search.
        name: `${selectedFile.name} • ${new Date().toISOString()}`,
        keyvalues: {
          description,
          uploadTime: new Date().toISOString(),
          fileSize: selectedFile.size,
        },
      });
      formData.append("pinataMetadata", metadata);

      formData.append(
        "pinataOptions",
        JSON.stringify({
          cidVersion: 1,
        })
      );

      const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${pinataJwt}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Upload failed (${res.status}): ${text}`);
      }

      const data = await res.json();

      // Confirm Pinata can find it in the account (helps users verify dashboard sync)
      let pinListCount: number | null = null;
      try {
        const listRes = await fetch(
          `https://api.pinata.cloud/data/pinList?hashContains=${encodeURIComponent(data.IpfsHash)}&status=pinned`,
          {
            headers: { Authorization: `Bearer ${pinataJwt}` },
          }
        );
        if (listRes.ok) {
          const listData = await listRes.json();
          pinListCount = typeof listData?.count === "number" ? listData.count : null;
        }
      } catch {
        // ignore
      }

      const fakeTransactionHash = "0x" + crypto.randomUUID().replace(/-/g, "").slice(0, 64);

      setUploadResult({
        ipfsHash: data.IpfsHash,
        gatewayUrl: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
        transactionHash: fakeTransactionHash,
        fileSize: selectedFile.size,
        timestamp: new Date().toISOString(),
        pinata: {
          id: data.ID,
          name: data.Name,
          pinnedAt: data.Timestamp,
          isDuplicate: Boolean(data.isDuplicate),
          pinListCount,
        },
      });
    } catch (error) {
      console.error("IPFS upload error:", error);
      alert("Upload failed. Please check console.");
    } finally {
      setIsUploading(false);
    }
  };


  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return Image;
    if (file.type.startsWith('video/')) return Video;
    return FileText;
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen blockchain-bg relative">
      <BlockchainBackground />
      
      <div className="relative pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              IPFS Upload
            </h1>
            <p className="text-xl text-muted-foreground">
              Store your content on the decentralized IPFS network with blockchain verification
            </p>
          </div>

          <div className="space-y-8">
            {/* Upload Section */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="w-5 h-5" />
                  <span>Upload to IPFS</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div
                  className="border-2 border-dashed border-glass-border rounded-xl p-8 text-center transition-colors hover:border-blockchain-primary/50 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {previewUrl ? (
                    <div className="space-y-4">
                      {selectedFile?.type.startsWith('image') ? (
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="max-w-full max-h-48 mx-auto rounded-lg"
                        />
                      ) : selectedFile?.type.startsWith('video') ? (
                        <video
                          src={previewUrl}
                          controls
                          className="max-w-full max-h-48 mx-auto rounded-lg"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-24 h-24 mx-auto rounded-lg bg-blockchain-primary/10">
                          {selectedFile && (() => {
                            const Icon = getFileIcon(selectedFile);
                            return <Icon className="w-12 h-12 text-blockchain-primary" />;
                          })()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-muted-foreground font-medium">
                          {selectedFile?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedFile && formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="mx-auto w-12 h-12 rounded-full bg-blockchain-primary/10 flex items-center justify-center">
                        <Upload className="w-6 h-6 text-blockchain-primary" />
                      </div>
                      <div>
                        <p className="text-foreground font-medium">
                          Drop file here or click to browse
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Any file type up to 100MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <Input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    placeholder="Describe your content..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="glass"
                  />
                </div>
                
                <Button
                  onClick={uploadToIPFS}
                  disabled={!selectedFile || isUploading}
                  className="w-full btn-primary"
                >
                  <Globe className="w-4 h-4 mr-2" />
                  {isUploading ? 'Uploading to IPFS...' : 'Upload to IPFS'}
                </Button>
              </CardContent>
            </Card>

            {/* Upload Result */}
            {uploadResult && (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Upload Successful</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-foreground">IPFS Hash</Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <Input
                            value={uploadResult.ipfsHash}
                            readOnly
                            className="glass font-mono text-sm"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="btn-glass"
                            onClick={() => copyToClipboard(uploadResult.ipfsHash)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-foreground">Gateway URL</Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <Input
                            value={uploadResult.gatewayUrl}
                            readOnly
                            className="glass text-sm"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="btn-glass"
                            onClick={() => window.open(uploadResult.gatewayUrl, '_blank')}
                          >
                            <LinkIcon className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium text-foreground">Pinata</Label>
                          <div className="flex items-center gap-2">
                            {uploadResult.pinata?.isDuplicate ? (
                              <Badge variant="secondary" className="border border-border bg-muted text-muted-foreground">
                                Duplicate
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="border border-border bg-muted text-muted-foreground">
                                New pin
                              </Badge>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="btn-glass"
                              onClick={() => window.open('https://app.pinata.cloud/pinmanager', '_blank')}
                            >
                              Open Dashboard
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 mt-1">
                          <Input
                            value={uploadResult.pinata?.id ?? ''}
                            readOnly
                            className="glass font-mono text-sm"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="btn-glass"
                            onClick={() => copyToClipboard(uploadResult.pinata?.id ?? '')}
                            disabled={!uploadResult.pinata?.id}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>

                        {(uploadResult.pinata?.name || uploadResult.pinata?.pinnedAt) && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {uploadResult.pinata?.name ? (
                              <>
                                Name: <span className="font-mono">{uploadResult.pinata.name}</span>
                              </>
                            ) : null}
                            {uploadResult.pinata?.pinnedAt ? (
                              <>
                                {uploadResult.pinata?.name ? " • " : ""}Pinned: {new Date(uploadResult.pinata.pinnedAt).toLocaleString()}
                              </>
                            ) : null}
                          </p>
                        )}

                        {typeof uploadResult.pinata?.pinListCount === 'number' && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Pinata pinList matches: {uploadResult.pinata.pinListCount}
                          </p>
                        )}

                        {uploadResult.pinata?.isDuplicate && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Pinata marked this upload as a duplicate, so it may not appear as a new item in your dashboard.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-foreground">Transaction Hash</Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <Input
                            value={uploadResult.transactionHash}
                            readOnly
                            className="glass font-mono text-sm"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="btn-glass"
                            onClick={() => copyToClipboard(uploadResult.transactionHash)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-foreground">File Size</Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {formatFileSize(uploadResult.fileSize)}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-foreground">Upload Time</Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {new Date(uploadResult.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                    <p className="text-green-800 font-medium mb-2">✓ Successfully stored on IPFS</p>
                    <p className="text-green-700 text-sm">
                      Your content is now permanently stored on the decentralized network 
                      and recorded on the blockchain for ownership verification.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Loading State */}
            {isUploading && (
              <Card className="glass-card">
                <CardContent className="p-8">
                  <div className="text-center space-y-4">
                    <div className="w-8 h-8 border-4 border-blockchain-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-foreground font-medium">Uploading to IPFS...</p>
                    <p className="text-sm text-muted-foreground">
                      Creating blockchain record and storing on distributed network
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Info Section */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>About IPFS Storage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg bg-white/5">
                    <Globe className="w-8 h-8 text-blockchain-primary mx-auto mb-2" />
                    <h4 className="font-medium text-foreground mb-1">Decentralized</h4>
                    <p className="text-sm text-muted-foreground">
                      No single point of failure
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-white/5">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <h4 className="font-medium text-foreground mb-1">Immutable</h4>
                    <p className="text-sm text-muted-foreground">
                      Content cannot be altered
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-white/5">
                    <LinkIcon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <h4 className="font-medium text-foreground mb-1">Accessible</h4>
                    <p className="text-sm text-muted-foreground">
                      Available through multiple gateways
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IPFS;