import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Search, Upload, AlertTriangle, CheckCircle, X, ExternalLink,
  FileText, Download, RotateCcw, Globe, BookOpen, Loader2,
  ShieldCheck, Eye, ScanLine
} from 'lucide-react';
import {
  submitPlagiarismCheck, generatePlagiarismReportPDF,
  type PlagiarismReport, type PlagiarismMatch,
} from '@/utils/pdfUtils';
import { useBackgroundTasks } from '@/hooks/BackgroundTaskContext';

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const MATCH_COLORS = {
  direct:      { bg: 'bg-red-500/15',    border: 'border-red-500/40',    text: 'text-red-400',    label: 'Direct Copy',   dot: 'bg-red-500' },
  paraphrased: { bg: 'bg-orange-500/15', border: 'border-orange-500/40', text: 'text-orange-400', label: 'Paraphrased',   dot: 'bg-orange-500' },
  similar:     { bg: 'bg-yellow-500/15', border: 'border-yellow-500/40', text: 'text-yellow-400', label: 'Similar',       dot: 'bg-yellow-500' },
};

function SimilarityGauge({ value }: { value: number }) {
  const r = 70, stroke = 10, circ = 2 * Math.PI * r;
  const pct = Math.min(value, 100);
  const offset = circ - (pct / 100) * circ;
  const color = pct > 50 ? '#ef4444' : pct > 20 ? '#f59e0b' : '#22c55e';
  return (
    <div className="relative w-48 h-48 mx-auto">
      <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90">
        <circle cx="90" cy="90" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={stroke} />
        <circle cx="90" cy="90" r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-foreground">{pct.toFixed(1)}%</span>
        <span className="text-xs text-muted-foreground mt-1">Similarity</span>
      </div>
    </div>
  );
}

/* ─── Component ──────────────────────────────────────────────────────────── */

const Plagiarism = () => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const {
    startPlagiarismTask,
    getPlagiarismTask,
    getPlagiarismResult,
    clearPlagiarismTask,
  } = useBackgroundTasks();

  const [file, setFile] = useState<File | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<PlagiarismMatch | null>(null);

  // Read state from context
  const task = getPlagiarismTask();
  const scanning = task?.status === 'processing';
  const progress = task?.progress ?? 0;
  const stage = task?.stage ?? '';
  const error = task?.status === 'error' ? (task.error || 'Analysis failed') : null;
  const report = getPlagiarismResult();

  // Show toast on completion (only once per task)
  const lastToastRef = useRef<string | null>(null);
  useEffect(() => {
    if (task?.status === 'complete' && task.result && lastToastRef.current !== task.id) {
      lastToastRef.current = task.id;
      toast({ title: 'Analysis Complete', description: `Similarity: ${task.result.similarity_index}%` });
    } else if (task?.status === 'error' && lastToastRef.current !== task.id) {
      lastToastRef.current = task.id;
      toast({ title: 'Analysis Failed', description: task.error, variant: 'destructive' });
    }
  }, [task?.status, task?.id]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.type === 'application/pdf') {
      setFile(f); setSelectedMatch(null);
    } else {
      toast({ title: 'Invalid file', description: 'Please select a PDF file.', variant: 'destructive' });
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f?.type === 'application/pdf') {
      setFile(f); setSelectedMatch(null);
    }
  }, []);

  const reset = () => {
    clearPlagiarismTask();
    setFile(null); setSelectedMatch(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const runScan = async () => {
    if (!file) return;
    try {
      const jobId = await submitPlagiarismCheck(file);
      startPlagiarismTask(jobId, file.name);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const downloadReport = () => {
    if (!report || !file) return;
    const blob = generatePlagiarismReportPDF(report, file.name);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `netra-plagiarism-report-${file.name}.pdf`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'Downloaded', description: 'Report saved as PDF.' });
  };

  /* ── Render highlighted document text ────────────────────────────────── */
  const renderHighlightedText = () => {
    if (!report) return null;
    const text = report.full_text;
    const matches = [...report.matches].sort((a, b) => a.start - b.start);

    const segments: JSX.Element[] = [];
    let lastEnd = 0;

    matches.forEach((m, i) => {
      if (m.start > lastEnd) {
        segments.push(<span key={`t-${i}`}>{text.slice(lastEnd, m.start)}</span>);
      }
      const colors = MATCH_COLORS[m.match_type] || MATCH_COLORS.similar;
      segments.push(
        <span
          key={`m-${i}`}
          className={`${colors.bg} ${colors.border} border-b-2 cursor-pointer rounded-sm px-0.5 
            hover:opacity-80 transition-opacity`}
          onClick={() => setSelectedMatch(m)}
          title={`${m.match_type} — ${(m.similarity * 100).toFixed(0)}% match`}
        >
          {text.slice(m.start, m.end)}
        </span>
      );
      lastEnd = m.end;
    });

    if (lastEnd < text.length) {
      segments.push(<span key="tail">{text.slice(lastEnd)}</span>);
    }

    return <div className="text-sm leading-relaxed whitespace-pre-wrap font-mono">{segments}</div>;
  };

  const simColor = (v: number) => v > 50 ? 'text-red-400' : v > 20 ? 'text-yellow-400' : 'text-green-400';

  /* ─── JSX ───────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen relative bg-background">
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        backgroundImage: 'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      <div className="relative z-10 pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
            <ScanLine className="w-9 h-9 text-primary" />
            Plagiarism Detection
          </h1>
          <p className="text-muted-foreground text-lg">
            Upload a research paper (PDF) to detect plagiarism using semantic AI analysis.
          </p>
        </div>

        {/* ─── UPLOAD ZONE ──────────────────────────────────────────────── */}
        {!report && (
          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Upload Research Paper
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                  {file ? (
                    <div className="relative w-full max-w-lg p-6 border border-border rounded-xl bg-muted/10 text-center">
                      <button onClick={reset} className="absolute -top-2 -right-2 bg-background border border-border rounded-full p-1 hover:bg-muted transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                      <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
                        <FileText className="w-7 h-7 text-primary" />
                      </div>
                      <p className="font-medium text-foreground">{file.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <label
                      className="w-full max-w-lg border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:bg-muted/20 hover:border-primary/40 transition-all"
                      onDragOver={(e) => e.preventDefault()} onDrop={onDrop}
                    >
                      <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm font-medium text-foreground mb-1">Click to upload or drag & drop</p>
                      <p className="text-xs text-muted-foreground">PDF files up to 50 MB</p>
                      <input ref={fileRef} type="file" className="hidden" accept=".pdf" onChange={handleFile} />
                    </label>
                  )}
                </div>

                {/* Progress */}
                {scanning && (
                  <div className="space-y-3 max-w-lg mx-auto">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" /> {stage}
                    </div>
                    <Progress value={progress} className="w-full" />
                    <p className="text-xs text-muted-foreground text-right">{progress}%</p>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-3 max-w-lg mx-auto">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}

                <Button className="btn-primary w-full max-w-lg mx-auto gap-2" onClick={runScan} disabled={scanning || !file}>
                  {scanning ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</> : <><Search className="w-4 h-4" /> Check for Plagiarism</>}
                </Button>
              </CardContent>
            </Card>

            {/* How it works */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" /> How It Works
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-4 gap-4">
                  {[
                    { s: '1', t: 'Upload', d: 'Upload your research paper in PDF format.', icon: Upload },
                    { s: '2', t: 'Extract & Embed', d: 'Text is extracted and converted to semantic embeddings.', icon: FileText },
                    { s: '3', t: 'Compare', d: 'Compared against academic databases using AI similarity.', icon: Search },
                    { s: '4', t: 'Report', d: 'Get a detailed report with highlighted plagiarized sections.', icon: Eye },
                  ].map((step) => (
                    <div key={step.s} className="p-4 rounded-xl border border-border text-center space-y-2 hover:bg-muted/10 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto font-bold text-sm">{step.s}</div>
                      <step.icon className="w-5 h-5 mx-auto text-primary" />
                      <p className="font-medium text-foreground">{step.t}</p>
                      <p className="text-xs text-muted-foreground">{step.d}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── RESULTS ──────────────────────────────────────────────────── */}
        {report && (
          <div className="space-y-6">
            {/* Stats Header */}
            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row items-center gap-8">
                  {/* Gauge */}
                  <SimilarityGauge value={report.similarity_index} />

                  {/* Stats */}
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { label: 'Total Words', value: report.total_words.toLocaleString(), icon: FileText },
                        { label: 'Pages', value: report.page_count, icon: BookOpen },
                        { label: 'Matches', value: report.matches.length, icon: AlertTriangle },
                        { label: 'Sources', value: report.sources.length, icon: Globe },
                      ].map((s) => (
                        <div key={s.label} className="p-3 rounded-xl border border-border text-center">
                          <s.icon className="w-4 h-4 mx-auto text-primary mb-1" />
                          <p className="text-lg font-bold text-foreground">{s.value}</p>
                          <p className="text-xs text-muted-foreground">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Breakdown bar */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">Source Breakdown</p>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Internet: {report.breakdown.internet}%</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> Publications: {report.breakdown.publications}%</span>
                      </div>
                      <div className="w-full h-3 bg-muted/30 rounded-full overflow-hidden flex">
                        <div className="bg-blue-500 h-full transition-all" style={{ width: `${report.breakdown.internet}%` }} />
                        <div className="bg-purple-500 h-full transition-all" style={{ width: `${report.breakdown.publications}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button onClick={downloadReport} className="btn-primary gap-2">
                      <Download className="w-4 h-4" /> Download Report
                    </Button>
                    <Button variant="outline" className="btn-glass gap-2" onClick={reset}>
                      <RotateCcw className="w-4 h-4" /> New Scan
                    </Button>
                  </div>
                </div>

                {/* Document Hash */}
                <div className="mt-4 p-3 rounded-lg bg-muted/20 border border-border">
                  <p className="text-xs text-muted-foreground">
                    <ShieldCheck className="w-3 h-3 inline mr-1" />
                    Blockchain Verification Hash: <code className="text-foreground font-mono text-xs">{report.document_hash}</code>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Tabbed Content */}
            <Tabs defaultValue="document" className="space-y-4">
              <TabsList className="glass">
                <TabsTrigger value="document" className="gap-2">
                  <Eye className="w-4 h-4" /> Document View
                  {report.matches.length > 0 && <Badge variant="outline" className="ml-1 text-xs">{report.matches.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="sources" className="gap-2">
                  <Globe className="w-4 h-4" /> Sources
                  {report.sources.length > 0 && <Badge variant="outline" className="ml-1 text-xs">{report.sources.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="matches" className="gap-2">
                  <AlertTriangle className="w-4 h-4" /> Match Details
                </TabsTrigger>
              </TabsList>

              {/* ── Document View ────────────────────────────────────────── */}
              <TabsContent value="document">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Document */}
                  <Card className="glass-card lg:col-span-2 max-h-[70vh] overflow-y-auto">
                    <CardHeader className="sticky top-0 bg-background/80 backdrop-blur-sm z-10 border-b border-border">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" /> Document Text
                        <div className="flex gap-2 ml-auto text-xs">
                          {(['direct', 'paraphrased', 'similar'] as const).map((t) => (
                            <span key={t} className="flex items-center gap-1">
                              <span className={`w-2 h-2 rounded-full ${MATCH_COLORS[t].dot}`} />
                              {MATCH_COLORS[t].label}
                            </span>
                          ))}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">{renderHighlightedText()}</CardContent>
                  </Card>

                  {/* Source Detail Sidebar */}
                  <Card className="glass-card max-h-[70vh] overflow-y-auto">
                    <CardHeader>
                      <CardTitle className="text-base">Match Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedMatch ? (
                        <div className="space-y-4">
                          <Badge className={`${MATCH_COLORS[selectedMatch.match_type].bg} ${MATCH_COLORS[selectedMatch.match_type].text} ${MATCH_COLORS[selectedMatch.match_type].border} border`}>
                            {MATCH_COLORS[selectedMatch.match_type].label} — {(selectedMatch.similarity * 100).toFixed(0)}%
                          </Badge>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Matched Text</p>
                            <p className="text-sm text-foreground bg-muted/20 p-3 rounded-lg border border-border">{selectedMatch.text.slice(0, 300)}{selectedMatch.text.length > 300 ? '…' : ''}</p>
                          </div>
                          {selectedMatch.source_text && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Source Text</p>
                              <p className="text-sm text-foreground bg-muted/20 p-3 rounded-lg border border-border italic">{selectedMatch.source_text.slice(0, 300)}{selectedMatch.source_text.length > 300 ? '…' : ''}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Source</p>
                            <p className="text-sm font-medium text-foreground">{selectedMatch.source_title || 'Unknown'}</p>
                            {selectedMatch.source && !selectedMatch.source.startsWith('self://') && (
                              <a href={selectedMatch.source} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                                {selectedMatch.source.slice(0, 60)}… <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Click a highlighted section to view match details</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* ── Sources Tab ──────────────────────────────────────────── */}
              <TabsContent value="sources" className="space-y-3">
                {report.sources.length === 0 ? (
                  <Card className="glass-card">
                    <CardContent className="p-12 text-center">
                      <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                      <p className="text-muted-foreground">No matching sources found — your content appears original!</p>
                    </CardContent>
                  </Card>
                ) : (
                  report.sources.map((src, i) => (
                    <Card key={i} className="glass-card hover:border-primary/20 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm">{src.title || 'Untitled Source'}</p>
                            {src.url && !src.url.startsWith('self://') && (
                              <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate block mt-1">
                                {src.url} <ExternalLink className="w-3 h-3 inline ml-1" />
                              </a>
                            )}
                          </div>
                          <Badge variant="outline" className={`shrink-0 ${src.match_percentage > 10 ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'}`}>
                            {src.match_percentage}% match
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* ── Match Details Tab ────────────────────────────────────── */}
              <TabsContent value="matches" className="space-y-3">
                {report.matches.length === 0 ? (
                  <Card className="glass-card">
                    <CardContent className="p-12 text-center">
                      <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                      <p className="text-muted-foreground">No plagiarism detected.</p>
                    </CardContent>
                  </Card>
                ) : (
                  report.matches.map((m, i) => {
                    const colors = MATCH_COLORS[m.match_type] || MATCH_COLORS.similar;
                    return (
                      <Card key={i} className={`glass-card ${colors.border} border-l-4`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                              <span className="font-medium text-foreground text-sm">Match {i + 1}</span>
                              <Badge variant="outline" className={`text-xs ${colors.bg} ${colors.text} ${colors.border}`}>
                                {colors.label}
                              </Badge>
                            </div>
                            <span className={`text-sm font-bold ${colors.text}`}>{(m.similarity * 100).toFixed(0)}%</span>
                          </div>
                          <p className="text-sm text-foreground/80 mb-2 line-clamp-3">{m.text}</p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{m.source_title || 'Unknown source'}</span>
                            {m.source && !m.source.startsWith('self://') && (
                              <a href={m.source} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                View Source <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
};

export default Plagiarism;