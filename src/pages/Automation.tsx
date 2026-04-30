import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Search, Shield, Upload, Loader2, X, Image as ImageIcon,
  FileVideo, Globe, Tag, AlertTriangle, CheckCircle, Eye,
  ExternalLink, RotateCcw, Sparkles, ScanLine
} from 'lucide-react';
import { useBackgroundTasks } from '@/hooks/BackgroundTaskContext';

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface MatchingPage {
  url: string;
  pageTitle: string;
  fullMatchingImages: { url: string }[];
  partialMatchingImages: { url: string }[];
}

interface WebEntity {
  entityId: string;
  description: string;
  score: number;
}

interface SearchResults {
  pagesWithMatchingImages: MatchingPage[];
  fullMatchingImages: { url: string }[];
  partialMatchingImages: { url: string }[];
  visuallySimilarImages: { url: string }[];
  webEntities: WebEntity[];
  bestGuessLabels: string[];
  totalMatches: number;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
}

type RiskLevel = SearchResults['riskLevel'];

const RISK_CONFIG: Record<RiskLevel, { emoji: string; color: string; bg: string; border: string; label: string }> = {
  HIGH:   { emoji: '🔴', color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30',    label: 'High Risk' },
  MEDIUM: { emoji: '🟡', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', label: 'Medium Risk' },
  LOW:    { emoji: '🟢', color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30',  label: 'Low Risk' },
  NONE:   { emoji: '🔵', color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   label: 'No Risk' },
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function extractVideoFrame(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      video.currentTime = video.duration * 0.25;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas context failed')); return; }
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        URL.revokeObjectURL(video.src);
        resolve(dataUrl);
      } catch (e) {
        reject(e);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video. The file may be corrupted or unsupported.'));
    };

    video.src = URL.createObjectURL(file);
  });
}

function ImgWithFallback({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={`flex items-center justify-center bg-muted/30 text-2xl ${className}`}>🖼️</div>
    );
  }
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} loading="lazy" />;
}

let _autoTaskCounter = 0;

/* ─── Component ──────────────────────────────────────────────────────────── */

const Automation = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    startAutomationTask,
    setAutomationResult,
    setAutomationError,
    getAutomationTask,
    clearAutomationTask,
  } = useBackgroundTasks();

  // Local file/preview state (these are UI-only, doesn't need to persist)
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [frameExtracted, setFrameExtracted] = useState(false);

  // Read task state from context
  const task = getAutomationTask();
  const scanning = task?.status === 'processing';
  const results = task?.status === 'complete' ? (task.result as SearchResults | null) : null;
  const error = task?.status === 'error' ? (task.error || 'Scan failed') : null;

  // Toast on completion (once per task)
  const lastToastRef = useRef<string | null>(null);
  useEffect(() => {
    if (task?.status === 'complete' && task.result && lastToastRef.current !== task.id) {
      lastToastRef.current = task.id;
      const r = task.result as SearchResults;
      toast({ title: 'Scan Complete', description: `${r.totalMatches} match(es) found. Risk: ${r.riskLevel}` });
    } else if (task?.status === 'error' && lastToastRef.current !== task.id) {
      lastToastRef.current = task.id;
      toast({ title: 'Scan Failed', description: task.error, variant: 'destructive' });
    }
  }, [task?.status, task?.id]);

  /* ── File handling ─────────────────────────────────────────────────── */

  const handleFileSelect = useCallback((selectedFile: File) => {
    clearAutomationTask();
    setFrameExtracted(false);

    const isVid = selectedFile.type.startsWith('video/');
    setIsVideo(isVid);
    setFile(selectedFile);

    if (isVid) {
      const url = URL.createObjectURL(selectedFile);
      setPreview(url);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(selectedFile);
    }
  }, [clearAutomationTask]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelect(f);
  }, [handleFileSelect]);

  const reset = () => {
    clearAutomationTask();
    setFile(null);
    setPreview(null);
    setIsVideo(false);
    setFrameExtracted(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ── Scan ───────────────────────────────────────────────────────────── */

  const runScan = async () => {
    if (!file || !preview) return;

    const taskId = String(++_autoTaskCounter);
    startAutomationTask(taskId, file.name);

    try {
      let imageBase64: string;

      if (isVideo) {
        setFrameExtracted(false);
        imageBase64 = await extractVideoFrame(file);
        setFrameExtracted(true);
      } else {
        imageBase64 = preview;
      }

      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Server returned ${res.status}`);
      }

      setAutomationResult(taskId, data as SearchResults);
    } catch (err: any) {
      const msg = err.message || 'Scan failed';
      setAutomationError(taskId, msg);
    }
  };

  /* ── Render helpers ─────────────────────────────────────────────────── */

  const riskBadge = (level: RiskLevel) => {
    const cfg = RISK_CONFIG[level];
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
        <span>{cfg.emoji}</span> {cfg.label}
      </span>
    );
  };

  /* ── JSX ─────────────────────────────────────────────────────────────── */

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
          <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
            <ScanLine className="w-9 h-9 text-primary" />
            Reverse Search &amp; Automation
          </h1>
          <p className="text-muted-foreground text-lg">
            Upload an image or video to detect if your content exists elsewhere on the internet.
          </p>
        </div>

        {/* ─── UPLOAD ZONE ─────────────────────────────────────────────── */}
        {!results && (
          <Card className="glass-card mb-8">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" />
                Content Scanner
              </CardTitle>
              <CardDescription>
                Upload an image or video file. Videos will be analysed by extracting a frame at 25% duration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Drop zone / preview */}
              <div className="flex flex-col items-center gap-4">
                {preview ? (
                  <div className="relative">
                    {isVideo ? (
                      <video
                        src={preview}
                        className="w-64 h-48 object-cover rounded-xl border border-border"
                        controls
                        muted
                      />
                    ) : (
                      <img
                        src={preview}
                        alt="Preview"
                        className="w-64 h-48 object-cover rounded-xl border border-border"
                      />
                    )}
                    <button
                      onClick={reset}
                      className="absolute -top-2 -right-2 bg-background border border-border rounded-full p-1 hover:bg-muted transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {isVideo && (
                      <Badge variant="outline" className="absolute bottom-2 left-2 bg-background/80 gap-1 text-xs">
                        <FileVideo className="w-3 h-3" /> Video
                      </Badge>
                    )}
                  </div>
                ) : (
                  <label
                    className="w-full max-w-lg border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:bg-muted/20 hover:border-primary/40 transition-all"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={onDrop}
                  >
                    <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm font-medium text-foreground mb-1">
                      Click to upload or drag &amp; drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Images (PNG, JPG, WEBP) or Videos (MP4, WEBM) up to 20MB
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*,video/*"
                      onChange={onInputChange}
                    />
                  </label>
                )}
              </div>

              {/* Status indicators */}
              {scanning && isVideo && !frameExtracted && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Extracting video frame…
                </div>
              )}
              {scanning && frameExtracted && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching the web…
                </div>
              )}
              {scanning && !isVideo && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analysing image…
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Scan button */}
              <Button
                className="btn-primary w-full gap-2"
                onClick={runScan}
                disabled={scanning || !file}
              >
                {scanning ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Scanning…</>
                ) : (
                  <><Search className="w-4 h-4" /> Scan for Matches</>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ─── RESULTS ─────────────────────────────────────────────────── */}
        {results && (
          <div className="space-y-6">
            {/* Results header */}
            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-3">
                    {/* Risk badge */}
                    <div>{riskBadge(results.riskLevel)}</div>

                    {/* Labels */}
                    {results.bestGuessLabels.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Sparkles className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm text-muted-foreground">Detected:</span>
                        {results.bestGuessLabels.map((label, i) => (
                          <Badge key={i} variant="outline" className="bg-primary/5 text-primary border-primary/20">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Match count */}
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{results.totalMatches}</span> total match(es) found across the web
                    </p>

                    {/* Web entities */}
                    {results.webEntities.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        {results.webEntities.slice(0, 8).map((e, i) => (
                          e.description && (
                            <Badge key={i} variant="outline" className="text-xs bg-muted/30">
                              {e.description}
                              {e.score > 0 && (
                                <span className="ml-1 text-muted-foreground">
                                  {(e.score * 100).toFixed(0)}%
                                </span>
                              )}
                            </Badge>
                          )
                        ))}
                      </div>
                    )}
                  </div>

                  <Button variant="outline" className="btn-glass gap-2 shrink-0" onClick={reset}>
                    <RotateCcw className="w-4 h-4" /> Scan Another File
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tabbed results */}
            <Tabs defaultValue="pages" className="space-y-4">
              <TabsList className="glass">
                <TabsTrigger value="pages" className="gap-2">
                  <Globe className="w-4 h-4" />
                  Matching Pages
                  {results.pagesWithMatchingImages.length > 0 && (
                    <Badge variant="outline" className="ml-1 text-xs">{results.pagesWithMatchingImages.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="similar" className="gap-2">
                  <Eye className="w-4 h-4" />
                  Similar Images
                  {results.visuallySimilarImages.length > 0 && (
                    <Badge variant="outline" className="ml-1 text-xs">{results.visuallySimilarImages.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="partial" className="gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Partial Matches
                  {(results.partialMatchingImages.length + results.fullMatchingImages.length) > 0 && (
                    <Badge variant="outline" className="ml-1 text-xs">
                      {results.partialMatchingImages.length + results.fullMatchingImages.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* ── Tab 1: Matching Pages ──────────────────────────────── */}
              <TabsContent value="pages" className="space-y-4">
                {results.pagesWithMatchingImages.length === 0 ? (
                  <Card className="glass-card">
                    <CardContent className="p-12 text-center">
                      <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                      <p className="text-muted-foreground">No matching pages found — your content appears original!</p>
                    </CardContent>
                  </Card>
                ) : (
                  results.pagesWithMatchingImages.map((page, i) => (
                    <Card key={i} className="glass-card hover:border-primary/20 transition-colors">
                      <CardContent className="p-5">
                        <div className="flex gap-4">
                          {/* Thumbnail */}
                          {page.fullMatchingImages[0]?.url && (
                            <div className="shrink-0">
                              <ImgWithFallback
                                src={page.fullMatchingImages[0].url}
                                alt="Match thumbnail"
                                className="w-20 h-20 object-cover rounded-lg border border-border"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm truncate">
                              {page.pageTitle || 'Untitled Page'}
                            </p>
                            <a
                              href={page.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline truncate block mt-1"
                            >
                              {page.url} <ExternalLink className="w-3 h-3 inline ml-1" />
                            </a>
                            <div className="flex gap-2 mt-2">
                              {page.fullMatchingImages.length > 0 && (
                                <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400 border-red-500/30">
                                  Full Match ({page.fullMatchingImages.length})
                                </Badge>
                              )}
                              {page.partialMatchingImages.length > 0 && (
                                <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                                  Partial Match ({page.partialMatchingImages.length})
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* ── Tab 2: Similar Images ──────────────────────────────── */}
              <TabsContent value="similar">
                {results.visuallySimilarImages.length === 0 ? (
                  <Card className="glass-card">
                    <CardContent className="p-12 text-center">
                      <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                      <p className="text-muted-foreground">No visually similar images found.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {results.visuallySimilarImages.map((img, i) => (
                      <a
                        key={i}
                        href={img.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block rounded-xl border border-border overflow-hidden hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/5"
                      >
                        <ImgWithFallback
                          src={img.url}
                          alt={`Similar image ${i + 1}`}
                          className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="p-2 bg-background/80 text-xs text-muted-foreground truncate flex items-center gap-1">
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{new URL(img.url).hostname}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ── Tab 3: Partial + Full Matches ─────────────────────── */}
              <TabsContent value="partial">
                {(results.partialMatchingImages.length + results.fullMatchingImages.length) === 0 ? (
                  <Card className="glass-card">
                    <CardContent className="p-12 text-center">
                      <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                      <p className="text-muted-foreground">No partial or full image matches found.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {results.fullMatchingImages.map((img, i) => (
                      <a
                        key={`full-${i}`}
                        href={img.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block rounded-xl border border-red-500/30 overflow-hidden hover:border-red-500/60 transition-all"
                      >
                        <ImgWithFallback
                          src={img.url}
                          alt={`Full match ${i + 1}`}
                          className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="p-2 bg-background/80 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground truncate">{new URL(img.url).hostname}</span>
                          <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-400 border-red-500/30">Full</Badge>
                        </div>
                      </a>
                    ))}
                    {results.partialMatchingImages.map((img, i) => (
                      <a
                        key={`partial-${i}`}
                        href={img.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block rounded-xl border border-yellow-500/30 overflow-hidden hover:border-yellow-500/60 transition-all"
                      >
                        <ImgWithFallback
                          src={img.url}
                          alt={`Partial match ${i + 1}`}
                          className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="p-2 bg-background/80 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground truncate">{new URL(img.url).hostname}</span>
                          <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-400 border-yellow-500/30">Partial</Badge>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* ─── HOW IT WORKS ────────────────────────────────────────────── */}
        {!results && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                How Reverse Search Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-4 gap-4">
                {[
                  { step: '1', title: 'Upload', desc: 'Drag & drop an image or video file to scan.', icon: Upload },
                  { step: '2', title: 'Extract', desc: 'For videos, a frame is extracted at 25% duration.', icon: FileVideo },
                  { step: '3', title: 'Analyse', desc: 'Google Vision AI performs web detection & matching.', icon: Eye },
                  { step: '4', title: 'Results', desc: 'View matching pages, similar images & risk assessment.', icon: Search },
                ].map((s) => (
                  <div key={s.step} className="p-4 rounded-xl border border-border text-center space-y-2 hover:bg-muted/10 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto font-bold text-sm">
                      {s.step}
                    </div>
                    <s.icon className="w-5 h-5 mx-auto text-primary" />
                    <p className="font-medium text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Automation;
