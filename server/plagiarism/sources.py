"""
Source Fetcher
──────────────
Retrieves relevant academic papers from Semantic Scholar API
to use as comparison sources for plagiarism detection.

Falls back to self-comparison sources when no external sources
are found, enabling internal duplicate detection.
"""

import os
import time
import re
from typing import List, Dict

import requests

SEMANTIC_SCHOLAR_BASE = "https://api.semanticscholar.org/graph/v1"
_RATE_LIMIT_DELAY = 1.0  # seconds between requests
_REQUEST_TIMEOUT = 8     # seconds per HTTP request


def fetch_sources(
    text: str,
    max_sources: int = 10,
) -> List[Dict]:
    """
    Fetch relevant academic papers from Semantic Scholar.

    Extracts keywords from the document text, searches for related papers,
    and returns their titles, abstracts, and URLs.

    Returns:
        List of {title, url, abstract, authors, year, source_type}
    """
    api_key = os.getenv("SEMANTIC_SCHOLAR_API_KEY", "")
    headers = {}
    if api_key:
        headers["x-api-key"] = api_key

    # Extract search queries from the text
    queries = _extract_search_queries(text)
    if not queries:
        print("[Netra] No search queries extracted from document — using self-comparison")
        return generate_self_comparison_sources(text)

    sources: List[Dict] = []
    seen_ids = set()
    failures = 0

    for query in queries[:3]:  # Limit to 3 queries to stay within rate limits
        try:
            print(f"[Netra] Searching Semantic Scholar: '{query[:60]}…'")
            results = _search_papers(query, headers, limit=5)
            print(f"[Netra]   → Found {len(results)} papers")

            for paper in results:
                paper_id = paper.get("paperId", "")
                if paper_id and paper_id not in seen_ids:
                    seen_ids.add(paper_id)
                    abstract = paper.get("abstract") or ""
                    sources.append({
                        "title": paper.get("title", "Unknown"),
                        "url": paper.get("url", f"https://www.semanticscholar.org/paper/{paper_id}"),
                        "abstract": abstract,
                        "authors": ", ".join(
                            a.get("name", "") for a in paper.get("authors", [])[:3]
                        ),
                        "year": paper.get("year"),
                        "source_type": "publication",
                        "paper_id": paper_id,
                    })

            time.sleep(_RATE_LIMIT_DELAY)

        except Exception as e:
            failures += 1
            print(f"[Netra] Semantic Scholar search failed for '{query[:50]}…': {e}")
            continue

        if len(sources) >= max_sources:
            break

    # Filter out sources without abstracts (can't compare against empty text)
    sources_with_abstracts = [s for s in sources if s.get("abstract", "").strip()]
    print(f"[Netra] Total sources found: {len(sources)}, with abstracts: {len(sources_with_abstracts)}")

    if not sources_with_abstracts:
        print("[Netra] No usable external sources — falling back to self-comparison")
        return generate_self_comparison_sources(text)

    return sources_with_abstracts[:max_sources]


def generate_self_comparison_sources(text: str) -> List[Dict]:
    """
    Generate synthetic comparison sources from the document itself.

    Splits the document into large segments and treats each segment
    as a separate 'source' for self-plagiarism / internal duplication
    detection.  Also extracts distinct paragraphs for comparison.
    """
    # Split into paragraphs
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if len(p.strip()) > 100]

    if len(paragraphs) < 2:
        # Fall back to splitting by sentences
        sentences = re.split(r"[.!?]\s+", text)
        # Group into chunks of ~5 sentences
        chunk_size = 5
        paragraphs = []
        for i in range(0, len(sentences), chunk_size):
            chunk = ". ".join(sentences[i : i + chunk_size])
            if len(chunk) > 100:
                paragraphs.append(chunk)

    sources: List[Dict] = []
    # Split paragraphs into two halves for cross-comparison
    mid = len(paragraphs) // 2
    if mid < 1:
        mid = 1

    first_half = " ".join(paragraphs[:mid])
    second_half = " ".join(paragraphs[mid:])

    if first_half.strip():
        sources.append({
            "title": "Document Section A (Self-Comparison)",
            "url": "self://section-a",
            "abstract": first_half[:3000],
            "authors": "",
            "year": None,
            "source_type": "self",
        })

    if second_half.strip():
        sources.append({
            "title": "Document Section B (Self-Comparison)",
            "url": "self://section-b",
            "abstract": second_half[:3000],
            "authors": "",
            "year": None,
            "source_type": "self",
        })

    # Also add individual large paragraphs as sources
    for i, para in enumerate(paragraphs[:5]):
        if len(para) > 200:
            sources.append({
                "title": f"Document Paragraph {i + 1} (Self-Comparison)",
                "url": f"self://paragraph-{i + 1}",
                "abstract": para[:2000],
                "authors": "",
                "year": None,
                "source_type": "self",
            })

    print(f"[Netra] Generated {len(sources)} self-comparison sources")
    return sources


def _extract_search_queries(text: str, max_queries: int = 5) -> List[str]:
    """
    Extract meaningful search queries from the document text.
    Uses the first few sentences and key phrases.
    """
    # Clean text
    clean = re.sub(r"\s+", " ", text).strip()

    # Split into sentences
    sentences = re.split(r"[.!?]\s+", clean)
    sentences = [s.strip() for s in sentences if len(s.strip()) > 30]

    queries = []

    # Use first substantial sentences as queries (likely abstract/intro)
    for sent in sentences[:10]:
        # Truncate to ~15 words for a good search query
        words = sent.split()[:15]
        query = " ".join(words)
        if len(query) > 20:
            queries.append(query)

        if len(queries) >= max_queries:
            break

    return queries


def _search_papers(
    query: str,
    headers: dict,
    limit: int = 5,
) -> List[Dict]:
    """Search Semantic Scholar for papers matching the query."""
    params = {
        "query": query,
        "limit": limit,
        "fields": "title,abstract,url,authors,year,paperId",
    }

    try:
        resp = requests.get(
            f"{SEMANTIC_SCHOLAR_BASE}/paper/search",
            params=params,
            headers=headers,
            timeout=_REQUEST_TIMEOUT,
        )

        if resp.status_code == 429:
            # Rate limited — wait and retry once
            print("[Netra]   Rate limited by Semantic Scholar — retrying in 3s")
            time.sleep(3)
            resp = requests.get(
                f"{SEMANTIC_SCHOLAR_BASE}/paper/search",
                params=params,
                headers=headers,
                timeout=_REQUEST_TIMEOUT,
            )

        if resp.status_code != 200:
            print(f"[Netra]   Semantic Scholar returned {resp.status_code}")
            return []

        data = resp.json()
        return data.get("data", [])

    except requests.exceptions.Timeout:
        print(f"[Netra]   Semantic Scholar request timed out after {_REQUEST_TIMEOUT}s")
        return []
    except requests.exceptions.RequestException as e:
        print(f"[Netra]   Semantic Scholar request failed: {e}")
        return []
