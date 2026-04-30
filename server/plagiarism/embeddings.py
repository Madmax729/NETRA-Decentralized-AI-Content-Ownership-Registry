"""
Embedding Engine
────────────────
Lazy-loaded SentenceTransformers model for semantic embeddings.
Uses all-mpnet-base-v2 (768 dimensions, best quality for English).
"""

import hashlib
from typing import List

import numpy as np

# Global model singleton — loaded lazily on first call
_model = None
_embedding_cache: dict = {}


def _load_model():
    """Load the SentenceTransformer model (downloads ~420 MB on first run)."""
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        print("[Netra] Loading SentenceTransformer model (all-mpnet-base-v2)…")
        _model = SentenceTransformer("all-mpnet-base-v2")
        print("[Netra] Model loaded successfully.")
    return _model


def get_embeddings(texts: List[str], batch_size: int = 32) -> np.ndarray:
    """
    Generate embeddings for a list of texts.

    Uses a simple in-memory cache keyed by SHA-256 of content.
    Returns np.ndarray of shape (len(texts), 768).
    """
    model = _load_model()

    # Check cache
    cache_key = hashlib.sha256("||".join(texts).encode()).hexdigest()
    if cache_key in _embedding_cache:
        return _embedding_cache[cache_key]

    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=False,
        convert_to_numpy=True,
        normalize_embeddings=True,  # Enables cosine similarity via dot product
    )

    # Cache the result
    _embedding_cache[cache_key] = embeddings
    return embeddings
