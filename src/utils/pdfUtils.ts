import { jsPDF } from 'jspdf';

/* ─── Types ──────────────────────────────────────────────────────────────── */

export interface PlagiarismMatch {
  text: string;
  start: number;
  end: number;
  similarity: number;
  source: string;
  source_title: string;
  match_type: 'direct' | 'paraphrased' | 'similar';
  source_text: string;
}

export interface PlagiarismSource {
  url: string;
  title: string;
  match_percentage: number;
}

export interface PlagiarismReport {
  similarity_index: number;
  document_hash: string;
  total_words: number;
  page_count: number;
  sources: PlagiarismSource[];
  matches: PlagiarismMatch[];
  breakdown: {
    publications: number;
    internet: number;
  };
  full_text: string;
}

export interface JobStatus {
  status: 'processing' | 'complete' | 'error';
  progress: number;
  stage: string;
  result?: PlagiarismReport;
  error?: string;
}

/* ─── API Client ─────────────────────────────────────────────────────────── */

/**
 * Upload a PDF and start plagiarism analysis.
 * Returns a jobId for polling.
 */
export async function submitPlagiarismCheck(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('pdf', file);

  const res = await fetch('/api/plagiarism/analyze', {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Server returned ${res.status}`);
  }

  return data.jobId;
}

/**
 * Poll the status of a plagiarism analysis job.
 */
export async function pollJobStatus(jobId: string): Promise<JobStatus> {
  const res = await fetch(`/api/plagiarism/status/${jobId}`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Server returned ${res.status}`);
  }

  return data as JobStatus;
}

/**
 * Poll until job completes, calling onProgress for each update.
 */
export function startPolling(
  jobId: string,
  onProgress: (status: JobStatus) => void,
  intervalMs: number = 1500,
): () => void {
  let cancelled = false;

  const poll = async () => {
    while (!cancelled) {
      try {
        const status = await pollJobStatus(jobId);
        onProgress(status);

        if (status.status === 'complete' || status.status === 'error') {
          break;
        }
      } catch (err) {
        console.error('Polling error:', err);
      }

      await new Promise((r) => setTimeout(r, intervalMs));
    }
  };

  poll();

  return () => {
    cancelled = true;
  };
}

/* ─── PDF Report Generator ───────────────────────────────────────────────── */

export function generatePlagiarismReportPDF(
  report: PlagiarismReport,
  fileName: string,
): Blob {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = 20;

  const checkPage = (needed: number = 30) => {
    if (y > pageHeight - needed) {
      doc.addPage();
      y = 20;
    }
  };

  // ── Title ──────────────────────────────────────────────────────────────
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('NETRA — Plagiarism Detection Report', margin, y);
  y += 12;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
  y += 6;
  doc.text(`Document: ${fileName}`, margin, y);
  y += 6;
  doc.text(`Hash: ${report.document_hash}`, margin, y);
  y += 12;

  // ── Similarity Index Box ───────────────────────────────────────────────
  const boxW = pageWidth - 2 * margin;

  // Determine color based on similarity
  const simIdx = report.similarity_index;
  if (simIdx > 50) {
    doc.setFillColor(254, 226, 226); // red-50
  } else if (simIdx > 20) {
    doc.setFillColor(254, 249, 195); // yellow-50
  } else {
    doc.setFillColor(220, 252, 231); // green-50
  }
  doc.roundedRect(margin, y, boxW, 35, 3, 3, 'F');

  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`${simIdx.toFixed(1)}%`, margin + boxW / 2, y + 18, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Similarity Index', margin + boxW / 2, y + 28, { align: 'center' });
  y += 45;

  // ── Stats Row ──────────────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  const stats = [
    `Words: ${report.total_words}`,
    `Pages: ${report.page_count}`,
    `Matches: ${report.matches.length}`,
    `Sources: ${report.sources.length}`,
  ];
  doc.text(stats.join('    |    '), margin, y);
  y += 10;

  // ── Breakdown ──────────────────────────────────────────────────────────
  doc.setFillColor(243, 244, 246);
  doc.roundedRect(margin, y, boxW, 20, 3, 3, 'F');
  doc.setFontSize(9);
  doc.text(`Internet Sources: ${report.breakdown.internet}%`, margin + 10, y + 9);
  doc.text(`Publications: ${report.breakdown.publications}%`, margin + boxW / 2, y + 9);
  y += 30;

  // ── Matched Sources ────────────────────────────────────────────────────
  if (report.sources.length > 0) {
    checkPage(40);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Matched Sources', margin, y);
    y += 10;

    for (const src of report.sources) {
      checkPage(20);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      const titleLines = doc.splitTextToSize(src.title || src.url, boxW - 50);
      doc.text(titleLines[0], margin + 5, y);

      // Percentage badge
      doc.setFillColor(219, 39, 39);
      doc.roundedRect(pageWidth - margin - 30, y - 4, 25, 7, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.text(`${src.match_percentage}%`, pageWidth - margin - 25, y);
      doc.setTextColor(0, 0, 0);

      y += 6;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      const urlLines = doc.splitTextToSize(src.url, boxW - 10);
      doc.text(urlLines[0], margin + 5, y);
      doc.setTextColor(0, 0, 0);
      y += 8;
    }
    y += 5;
  }

  // ── Matches ────────────────────────────────────────────────────────────
  if (report.matches.length > 0) {
    checkPage(40);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Detected Plagiarism', margin, y);
    y += 10;

    for (let i = 0; i < Math.min(report.matches.length, 15); i++) {
      checkPage(35);
      const match = report.matches[i];

      // Color-coded left border effect
      if (match.match_type === 'direct') {
        doc.setFillColor(254, 226, 226);
      } else if (match.match_type === 'paraphrased') {
        doc.setFillColor(255, 237, 213);
      } else {
        doc.setFillColor(254, 249, 195);
      }
      doc.roundedRect(margin, y, boxW, 25, 2, 2, 'F');

      // Match label
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`Match ${i + 1} — ${match.match_type.toUpperCase()} (${(match.similarity * 100).toFixed(0)}%)`, margin + 5, y + 6);

      // Match text
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const matchText = doc.splitTextToSize(match.text, boxW - 15);
      doc.text(matchText.slice(0, 2), margin + 5, y + 12);

      // Source
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text(`Source: ${match.source_title || match.source}`, margin + 5, y + 22);
      doc.setTextColor(0, 0, 0);

      y += 30;
    }

    if (report.matches.length > 15) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text(`+ ${report.matches.length - 15} more matches (see full report)`, margin, y);
      y += 10;
    }
  }

  // ── Footer ─────────────────────────────────────────────────────────────
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${totalPages}  |  NETRA — Decentralized AI Content Ownership Registry  |  ${report.document_hash}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' },
    );
  }

  return doc.output('blob');
}
