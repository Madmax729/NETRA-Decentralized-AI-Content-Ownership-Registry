"""
Similarity Engine
─────────────────
Uses FAISS to build a vector index of source embeddings and
find the most similar chunks for each document chunk.

Also supports self-similarity detection for internal duplication.
"""

from typing import List, Dict, Tuple

import numpy as np

try:
    import faiss
except ImportError:
    faiss = None

# Similarity thresholds (lowered for better detection)
THRESHOLD_HIGH = 0.80     # Direct plagiarism (red)
THRESHOLD_MEDIUM = 0.65   # Paraphrased / high similarity (orange)
THRESHOLD_LOW = 0.50      # Possible similarity (yellow)

# Self-similarity threshold (higher bar since same document)
SELF_SIMILARITY_THRESHOLD = 0.70


def find_similar_chunks(
    doc_embeddings: np.ndarray,
    doc_chunks: List[dict],
    source_embeddings: np.ndarray,
    source_chunks: List[dict],
    top_k: int = 3,
) -> List[Dict]:
    """
    For each document chunk, find the most similar source chunks.

    Uses FAISS IndexFlatIP (inner product = cosine similarity
    when embeddings are L2-normalized).

    Returns:
        List of match dicts: {
            doc_chunk_index, source_chunk_index,
            similarity, match_type,
            doc_text, source_text, source_info
        }
    """
    if source_embeddings.shape[0] == 0 or doc_embeddings.shape[0] == 0:
        return []

    # Build FAISS index from source embeddings
    dim = source_embeddings.shape[1]

    if faiss is not None:
        index = faiss.IndexFlatIP(dim)
        index.add(source_embeddings.astype(np.float32))

        # Search
        scores, indices = index.search(
            doc_embeddings.astype(np.float32), min(top_k, source_embeddings.shape[0])
        )
    else:
        # Fallback: pure numpy cosine similarity (slower but works without FAISS)
        scores_matrix = doc_embeddings @ source_embeddings.T
        k = min(top_k, source_embeddings.shape[0])
        indices = np.argsort(-scores_matrix, axis=1)[:, :k]
        scores = np.take_along_axis(scores_matrix, indices, axis=1)

    matches = []

    for doc_idx in range(doc_embeddings.shape[0]):
        for rank in range(scores.shape[1]):
            similarity = float(scores[doc_idx][rank])
            source_idx = int(indices[doc_idx][rank])

            if similarity < THRESHOLD_LOW:
                continue

            # Determine match type
            if similarity >= THRESHOLD_HIGH:
                match_type = "direct"
            elif similarity >= THRESHOLD_MEDIUM:
                match_type = "paraphrased"
            else:
                match_type = "similar"

            source_chunk = source_chunks[source_idx] if source_idx < len(source_chunks) else {}

            matches.append({
                "doc_chunk_index": doc_idx,
                "source_chunk_index": source_idx,
                "similarity": round(similarity, 4),
                "match_type": match_type,
                "doc_text": doc_chunks[doc_idx]["text"] if doc_idx < len(doc_chunks) else "",
                "doc_start": doc_chunks[doc_idx].get("start", 0),
                "doc_end": doc_chunks[doc_idx].get("end", 0),
                "source_text": source_chunk.get("text", ""),
                "source_title": source_chunk.get("source_title", ""),
                "source_url": source_chunk.get("source_url", ""),
            })

    # Sort by similarity descending and deduplicate overlapping doc regions
    matches.sort(key=lambda m: m["similarity"], reverse=True)
    print(f"[Netra] Found {len(matches)} matches above threshold {THRESHOLD_LOW}")
    return matches


def find_self_similar_chunks(
    doc_embeddings: np.ndarray,
    doc_chunks: List[dict],
    threshold: float = SELF_SIMILARITY_THRESHOLD,
) -> List[Dict]:
    """
    Find chunks within the document that are highly similar to each other.
    This detects internal duplication / self-plagiarism.

    Skips self-matches and adjacent chunks (which naturally have high
    overlap due to the sliding window chunking).
    """
    if doc_embeddings.shape[0] < 3:
        return []

    # Compute full similarity matrix
    sim_matrix = doc_embeddings @ doc_embeddings.T

    matches = []
    seen_pairs = set()

    for i in range(doc_embeddings.shape[0]):
        for j in range(doc_embeddings.shape[0]):
            # Skip self and adjacent chunks (within ±2 window)
            if abs(i - j) <= 2:
                continue

            # Skip already-seen pairs
            pair = (min(i, j), max(i, j))
            if pair in seen_pairs:
                continue

            similarity = float(sim_matrix[i][j])
            if similarity >= threshold:
                seen_pairs.add(pair)

                if similarity >= THRESHOLD_HIGH:
                    match_type = "direct"
                elif similarity >= THRESHOLD_MEDIUM:
                    match_type = "paraphrased"
                else:
                    match_type = "similar"

                matches.append({
                    "doc_chunk_index": i,
                    "source_chunk_index": j,
                    "similarity": round(similarity, 4),
                    "match_type": match_type,
                    "doc_text": doc_chunks[i]["text"],
                    "doc_start": doc_chunks[i].get("start", 0),
                    "doc_end": doc_chunks[i].get("end", 0),
                    "source_text": doc_chunks[j]["text"],
                    "source_title": f"Internal Duplicate (chunk {j + 1})",
                    "source_url": "self://internal-duplicate",
                })

    matches.sort(key=lambda m: m["similarity"], reverse=True)
    print(f"[Netra] Found {len(matches)} self-similar chunk pairs above {threshold}")
    return matches
