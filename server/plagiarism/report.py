"""
Report Generator
────────────────
Computes the final plagiarism report: similarity index,
source breakdown, and document hash for blockchain integration.
"""

import hashlib
from typing import List, Dict, Tuple


def build_report(
    full_text: str,
    page_count: int,
    matches: List[Dict],
    sources: List[Dict],
) -> Dict:
    """
    Build the final plagiarism report.

    Returns:
        {
            similarity_index, document_hash, total_words,
            page_count, sources, matches, breakdown
        }
    """
    total_words = len(full_text.split())
    total_chars = len(full_text)

    print(f"[Netra] Building report: {total_words} words, {total_chars} chars, {len(matches)} matches")

    # ── Compute similarity index ────────────────────────────────────────
    # Calculate the fraction of the document covered by matches
    matched_chars = 0
    for m in matches:
        start = m.get("start", 0)
        end = m.get("end", 0)
        if end > start:
            matched_chars += end - start

    # Avoid double-counting (matches are already merged/deduped)
    similarity_index = (matched_chars / total_chars * 100) if total_chars > 0 else 0.0
    similarity_index = min(similarity_index, 100.0)
    similarity_index = round(similarity_index, 1)

    print(f"[Netra] Similarity index: {similarity_index}% ({matched_chars} matched chars / {total_chars} total)")

    # ── Document hash (SHA-256) for blockchain ──────────────────────────
    document_hash = hashlib.sha256(full_text.encode("utf-8")).hexdigest()

    # ── Source breakdown ────────────────────────────────────────────────
    pub_chars = 0
    internet_chars = 0
    self_chars = 0

    for m in matches:
        start = m.get("start", 0)
        end = m.get("end", 0)
        chars = max(end - start, 0)
        source_type = _classify_source(m.get("source", ""))
        if source_type == "publication":
            pub_chars += chars
        elif source_type == "self":
            self_chars += chars
        else:
            internet_chars += chars

    pub_pct = round((pub_chars / total_chars * 100) if total_chars > 0 else 0, 1)
    internet_pct = round((internet_chars / total_chars * 100) if total_chars > 0 else 0, 1)
    self_pct = round((self_chars / total_chars * 100) if total_chars > 0 else 0, 1)

    breakdown = {
        "publications": pub_pct,
        "internet": internet_pct,
        "self": self_pct,
    }

    # ── Per-source match percentage ─────────────────────────────────────
    source_match_map: Dict[str, int] = {}
    for m in matches:
        src = m.get("source", "Unknown")
        start = m.get("start", 0)
        end = m.get("end", 0)
        chars = max(end - start, 0)
        source_match_map[src] = source_match_map.get(src, 0) + chars

    source_list = []
    for url, chars in sorted(source_match_map.items(), key=lambda x: -x[1]):
        pct = round((chars / total_chars * 100) if total_chars > 0 else 0, 1)
        title = ""
        for m in matches:
            if m.get("source") == url and m.get("source_title"):
                title = m["source_title"]
                break
        source_list.append({
            "url": url,
            "title": title,
            "match_percentage": pct,
        })

    # ── Format matches for frontend ─────────────────────────────────────
    formatted_matches = []
    for m in matches:
        formatted_matches.append({
            "text": m.get("text", ""),
            "start": m.get("start", 0),
            "end": m.get("end", 0),
            "similarity": m.get("similarity", 0),
            "source": m.get("source", ""),
            "source_title": m.get("source_title", ""),
            "match_type": m.get("match_type", "similar"),
            "source_text": m.get("source_text", ""),
        })

    print(f"[Netra] Report complete: {similarity_index}% similarity, {len(source_list)} sources, {len(formatted_matches)} matches")

    return {
        "similarity_index": similarity_index,
        "document_hash": f"sha256:{document_hash}",
        "total_words": total_words,
        "page_count": page_count,
        "sources": source_list,
        "matches": formatted_matches,
        "breakdown": breakdown,
        "full_text": full_text,
    }


def _classify_source(url: str) -> str:
    """Classify a source URL as 'publication', 'self', or 'internet'."""
    if not url:
        return "internet"

    # Self-comparison sources
    if url.startswith("self://"):
        return "self"

    academic_domains = [
        "semanticscholar.org", "arxiv.org", "doi.org",
        "pubmed", "ieee.org", "acm.org", "springer.com",
        "sciencedirect.com", "wiley.com", "nature.com",
        "researchgate.net", "scholar.google",
    ]
    url_lower = url.lower()
    for domain in academic_domains:
        if domain in url_lower:
            return "publication"
    return "internet"
