"""
PDF Text Extraction & Chunking
───────────────────────────────
Extracts text from uploaded PDFs, cleans it, and splits into
overlapping chunks while tracking character offsets.
"""

import re
import io
from typing import List, Tuple

import PyPDF2


def extract_text_from_pdf(pdf_bytes: bytes) -> Tuple[str, int]:
    """
    Extract all text from a PDF file.

    Returns:
        (full_text, page_count)
    """
    reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
    page_count = len(reader.pages)

    parts: List[str] = []
    for page in reader.pages:
        text = page.extract_text() or ""
        parts.append(text)

    full_text = "\n\n".join(parts)
    full_text = _clean_text(full_text)
    return full_text, page_count


def _clean_text(text: str) -> str:
    """Normalize extracted text."""
    # Collapse multiple whitespace / newlines
    text = re.sub(r"\r\n", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Remove page numbers (common patterns)
    text = re.sub(r"\n\s*\d+\s*\n", "\n", text)

    # Remove common headers/footers patterns
    text = re.sub(r"(?i)(page\s+\d+\s*(of\s+\d+)?)", "", text)

    return text.strip()


def chunk_text(
    text: str,
    chunk_words: int = 200,
    overlap_words: int = 50,
) -> List[dict]:
    """
    Split text into overlapping chunks.

    Each chunk records its character offset in the original text
    so we can map matches back to highlight positions.

    Returns:
        List of {text, start, end, word_count}
    """
    words = text.split()
    if not words:
        return []

    chunks: List[dict] = []
    i = 0

    while i < len(words):
        end = min(i + chunk_words, len(words))
        chunk_words_slice = words[i:end]
        chunk_text_str = " ".join(chunk_words_slice)

        # Find the character offset of this chunk in the original text
        # We search for the first word and last word to determine positions
        start_char = _find_word_position(text, words, i)
        end_char = _find_word_position(text, words, end - 1)
        if end_char >= 0:
            end_char += len(words[end - 1])

        chunks.append({
            "text": chunk_text_str,
            "start": max(start_char, 0),
            "end": max(end_char, 0),
            "word_count": len(chunk_words_slice),
            "chunk_index": len(chunks),
        })

        # Advance by (chunk_size - overlap)
        step = chunk_words - overlap_words
        if step < 1:
            step = 1
        i += step

    return chunks


def _find_word_position(text: str, words: list, word_index: int) -> int:
    """Find the character position of the Nth word in the original text."""
    if word_index < 0 or word_index >= len(words):
        return -1

    pos = 0
    current_word = 0

    while pos < len(text) and current_word < word_index:
        # Skip whitespace
        while pos < len(text) and text[pos] in " \t\n\r":
            pos += 1
        # Skip word
        while pos < len(text) and text[pos] not in " \t\n\r":
            pos += 1
        current_word += 1

    # Skip whitespace before the target word
    while pos < len(text) and text[pos] in " \t\n\r":
        pos += 1

    return pos
