"""
Netra Plagiarism Detection Engine
──────────────────────────────────
Modular pipeline: extract → embed → fetch sources → compare → map → report
"""

from .extractor import extract_text_from_pdf, chunk_text
from .embeddings import get_embeddings
from .sources import fetch_sources, generate_self_comparison_sources
from .similarity import find_similar_chunks, find_self_similar_chunks
from .mapper import map_matches
from .report import build_report

__all__ = [
    "extract_text_from_pdf",
    "chunk_text",
    "get_embeddings",
    "fetch_sources",
    "generate_self_comparison_sources",
    "find_similar_chunks",
    "find_self_similar_chunks",
    "map_matches",
    "build_report",
]
