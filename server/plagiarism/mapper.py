"""
Match Mapper
────────────
Maps raw similarity matches back to exact character positions
in the original document text. Merges overlapping regions.
"""

from typing import List, Dict


def map_matches(
    raw_matches: List[Dict],
    doc_chunks: List[dict],
) -> List[Dict]:
    """
    Merge overlapping matches and produce clean match objects
    with precise character positions.

    Returns:
        Sorted, deduplicated list of {
            text, start, end, similarity,
            source, source_title, match_type
        }
    """
    if not raw_matches:
        return []

    # Group by doc_chunk_index, keep best match per chunk
    best_per_chunk: Dict[int, Dict] = {}
    for m in raw_matches:
        idx = m["doc_chunk_index"]
        if idx not in best_per_chunk or m["similarity"] > best_per_chunk[idx]["similarity"]:
            best_per_chunk[idx] = m

    # Convert to position-based matches
    positional: List[Dict] = []
    for m in best_per_chunk.values():
        positional.append({
            "text": m["doc_text"],
            "start": m["doc_start"],
            "end": m["doc_end"],
            "similarity": m["similarity"],
            "source": m["source_url"],
            "source_title": m["source_title"],
            "match_type": m["match_type"],
            "source_text": m["source_text"],
        })

    # Sort by start position
    positional.sort(key=lambda m: m["start"])

    # Merge overlapping regions
    merged = _merge_overlapping(positional)

    return merged


def _merge_overlapping(matches: List[Dict]) -> List[Dict]:
    """Merge matches that overlap in character positions."""
    if not matches:
        return []

    merged: List[Dict] = [matches[0]]

    for current in matches[1:]:
        prev = merged[-1]

        # Check if current overlaps with previous
        if current["start"] <= prev["end"]:
            # Merge: extend the range, keep the higher similarity
            if current["similarity"] > prev["similarity"]:
                # Replace with higher-similarity match but extend range
                merged[-1] = {
                    **current,
                    "start": min(prev["start"], current["start"]),
                    "end": max(prev["end"], current["end"]),
                    "text": prev["text"] if len(prev["text"]) > len(current["text"]) else current["text"],
                }
            else:
                merged[-1]["end"] = max(prev["end"], current["end"])
        else:
            merged.append(current)

    return merged
