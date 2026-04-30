"""
Netra – Stateless Flask backend
Generates NFT metadata JSON and uploads it to IPFS via Pinata.
"""

import os

# ── Force transformers to use PyTorch only (skip TensorFlow / Keras) ────────
os.environ["USE_TORCH"] = "1"
os.environ["USE_TF"] = "0"
os.environ["TRANSFORMERS_NO_TF"] = "1"
import json
import requests
from datetime import datetime, timezone
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

PINATA_JWT = os.getenv("PINATA_JWT", "")
PINATA_PIN_JSON_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS"


def pinata_headers():
    return {
        "Authorization": f"Bearer {PINATA_JWT}",
        "Content-Type": "application/json",
    }


# ── Health check ────────────────────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "netra-backend"})


# ── Generate metadata JSON ────────────────────────────────────────────────

@app.route("/api/metadata/generate", methods=["POST"])
def generate_metadata():
    """
    Build an ERC-721-compatible metadata JSON from the supplied fields.
    Expects JSON body: {
        name, description, imageCID, contentHash,
        aiFingerprint, watermarkType, royaltyPercent (0-100, optional)
    }
    """
    data = request.get_json(force=True)

    required = ["name", "description", "imageCID", "contentHash", "aiFingerprint", "watermarkType"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    royalty_pct = float(data.get("royaltyPercent", 0))

    metadata = {
        "name": data["name"],
        "description": data["description"],
        "image": f"ipfs://{data['imageCID']}",
        "external_url": f"https://gateway.pinata.cloud/ipfs/{data['imageCID']}",
        "attributes": [
            {"trait_type": "Content Hash", "value": data["contentHash"]},
            {"trait_type": "AI Fingerprint", "value": data["aiFingerprint"]},
            {"trait_type": "Watermark Type", "value": data["watermarkType"]},
            {"trait_type": "Royalty %", "value": str(royalty_pct)},
            {"trait_type": "Registry", "value": "Netra"},
            {"trait_type": "Created", "value": datetime.now(timezone.utc).isoformat()},
        ],
    }

    return jsonify({"metadata": metadata}), 200


# ── Upload metadata JSON to IPFS via Pinata ───────────────────────────────

@app.route("/api/metadata/upload", methods=["POST"])
def upload_metadata():
    """
    Pin the supplied metadata JSON to IPFS using Pinata pinJSONToIPFS.
    Expects JSON body: { metadata: { ... } }
    Returns: { metadataCID, metadataURI, gatewayUrl }
    """
    data = request.get_json(force=True)
    metadata = data.get("metadata")

    if not metadata:
        return jsonify({"error": "Missing 'metadata' object in request body"}), 400

    payload = {
        "pinataContent": metadata,
        "pinataMetadata": {
            "name": f"netra-metadata-{metadata.get('name', 'untitled')}-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')}",
        },
        "pinataOptions": {
            "cidVersion": 1,
        },
    }

    try:
        res = requests.post(
            PINATA_PIN_JSON_URL,
            headers=pinata_headers(),
            data=json.dumps(payload),
            timeout=30,
        )
        res.raise_for_status()
        result = res.json()
        cid = result["IpfsHash"]

        return jsonify({
            "metadataCID": cid,
            "metadataURI": f"ipfs://{cid}",
            "gatewayUrl": f"https://gateway.pinata.cloud/ipfs/{cid}",
        }), 200

    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Pinata upload failed: {str(e)}"}), 502


# ── IPFS File Upload (Proxy for browser CORS) ──────────────────────────────

@app.route("/api/ipfs/auth", methods=["GET"])
def ipfs_auth_check():
    """Check if the Pinata JWT is valid."""
    if not PINATA_JWT:
        return jsonify({"error": "PINATA_JWT not configured on server"}), 500
    try:
        res = requests.get(
            "https://api.pinata.cloud/data/testAuthentication",
            headers={"Authorization": f"Bearer {PINATA_JWT}"},
            timeout=10,
        )
        if res.ok:
            return jsonify({"authenticated": True}), 200
        return jsonify({"authenticated": False, "error": res.text}), 401
    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 502


@app.route("/api/ipfs/upload", methods=["POST"])
def ipfs_upload_file():
    """
    Proxy file uploads to Pinata pinFileToIPFS.
    Accepts multipart form with field 'file'.
    Optional form fields: 'description' (string).
    Returns: { ipfsHash, gatewayUrl, pinata: { id, name, pinnedAt, isDuplicate } }
    """
    if not PINATA_JWT:
        return jsonify({"error": "PINATA_JWT not configured on server"}), 500

    if "file" not in request.files:
        return jsonify({"error": "No file provided. Use field name 'file'."}), 400

    uploaded_file = request.files["file"]
    if not uploaded_file.filename:
        return jsonify({"error": "Empty filename."}), 400

    description = request.form.get("description", "")

    try:
        # Build the multipart request to Pinata
        pinata_metadata = json.dumps({
            "name": f"{uploaded_file.filename} • {datetime.now(timezone.utc).isoformat()}",
            "keyvalues": {
                "description": description,
                "uploadTime": datetime.now(timezone.utc).isoformat(),
            },
        })
        pinata_options = json.dumps({"cidVersion": 1})

        res = requests.post(
            "https://api.pinata.cloud/pinning/pinFileToIPFS",
            headers={"Authorization": f"Bearer {PINATA_JWT}"},
            files={
                "file": (uploaded_file.filename, uploaded_file.stream, uploaded_file.mimetype),
            },
            data={
                "pinataMetadata": pinata_metadata,
                "pinataOptions": pinata_options,
            },
            timeout=120,
        )

        if not res.ok:
            return jsonify({"error": f"Pinata upload failed ({res.status_code}): {res.text}"}), 502

        data = res.json()
        ipfs_hash = data.get("IpfsHash", "")

        # Optionally check pinList
        pin_list_count = None
        try:
            list_res = requests.get(
                f"https://api.pinata.cloud/data/pinList?hashContains={ipfs_hash}&status=pinned",
                headers={"Authorization": f"Bearer {PINATA_JWT}"},
                timeout=10,
            )
            if list_res.ok:
                list_data = list_res.json()
                pin_list_count = list_data.get("count")
        except Exception:
            pass

        return jsonify({
            "ipfsHash": ipfs_hash,
            "gatewayUrl": f"https://gateway.pinata.cloud/ipfs/{ipfs_hash}",
            "pinata": {
                "id": data.get("ID"),
                "name": data.get("Name"),
                "pinnedAt": data.get("Timestamp"),
                "isDuplicate": bool(data.get("isDuplicate")),
                "pinListCount": pin_list_count,
            },
        }), 200

    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Upload request failed: {str(e)}"}), 502


# ── Reverse Image Search via Google Cloud Vision ───────────────────────────

GOOGLE_VISION_API_KEY = os.getenv("GOOGLE_VISION_API_KEY", "")
VISION_API_URL = "https://vision.googleapis.com/v1/images:annotate"


@app.route("/api/search", methods=["POST"])
def reverse_image_search():
    """
    Reverse-search an image across the web using Google Cloud Vision API.
    Expects JSON body: { imageBase64: "<base64-string>" }
    Returns structured results with pages, matches, similar images,
    web entities, best-guess labels, and a risk assessment.
    """
    # ── Validate API key ────────────────────────────────────────────────
    if not GOOGLE_VISION_API_KEY:
        return jsonify({
            "error": "GOOGLE_VISION_API_KEY is not configured. "
                     "Add it to server/.env and restart the server."
        }), 500

    data = request.get_json(force=True)
    image_b64 = data.get("imageBase64", "")

    if not image_b64:
        return jsonify({"error": "imageBase64 is required"}), 400

    # Strip the data-URL prefix if present (e.g. "data:image/jpeg;base64,")
    if "," in image_b64:
        image_b64 = image_b64.split(",", 1)[1]

    # ── Call Google Cloud Vision API ────────────────────────────────────
    payload = {
        "requests": [
            {
                "image": {"content": image_b64},
                "features": [{"type": "WEB_DETECTION", "maxResults": 20}],
            }
        ]
    }

    try:
        res = requests.post(
            f"{VISION_API_URL}?key={GOOGLE_VISION_API_KEY}",
            json=payload,
            timeout=30,
        )

        # Handle invalid / exhausted API key
        if res.status_code == 403:
            return jsonify({
                "error": "Google Cloud Vision API returned 403 Forbidden. "
                         "Check that your API key is valid and the Cloud Vision "
                         "API is enabled in your Google Cloud project."
            }), 403

        res.raise_for_status()
        vision_result = res.json()

    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Vision API request failed: {str(e)}"}), 502

    # ── Parse response ─────────────────────────────────────────────────
    annotations = (
        vision_result.get("responses", [{}])[0].get("webDetection", {})
    )

    pages_with_matching = []
    for page in annotations.get("pagesWithMatchingImages", []):
        pages_with_matching.append({
            "url": page.get("url", ""),
            "pageTitle": page.get("pageTitle", ""),
            "fullMatchingImages": [
                {"url": img.get("url", "")}
                for img in page.get("fullMatchingImages", [])
            ],
            "partialMatchingImages": [
                {"url": img.get("url", "")}
                for img in page.get("partialMatchingImages", [])
            ],
        })

    full_matching = [
        {"url": img.get("url", "")}
        for img in annotations.get("fullMatchingImages", [])
    ]

    partial_matching = [
        {"url": img.get("url", "")}
        for img in annotations.get("partialMatchingImages", [])
    ]

    visually_similar = [
        {"url": img.get("url", "")}
        for img in annotations.get("visuallySimilarImages", [])
    ]

    web_entities = [
        {
            "entityId": e.get("entityId", ""),
            "description": e.get("description", ""),
            "score": e.get("score", 0),
        }
        for e in annotations.get("webEntities", [])
    ]

    best_guess_labels = [
        lbl.get("label", "")
        for lbl in annotations.get("bestGuessLabels", [])
    ]

    # ── Risk assessment ────────────────────────────────────────────────
    total_matches = (
        len(pages_with_matching) + len(full_matching) + len(partial_matching)
    )

    if total_matches > 10 or len(full_matching) > 3:
        risk_level = "HIGH"
    elif total_matches > 5 or len(full_matching) > 1:
        risk_level = "MEDIUM"
    elif total_matches >= 1:
        risk_level = "LOW"
    else:
        risk_level = "NONE"

    return jsonify({
        "pagesWithMatchingImages": pages_with_matching,
        "fullMatchingImages": full_matching,
        "partialMatchingImages": partial_matching,
        "visuallySimilarImages": visually_similar,
        "webEntities": web_entities,
        "bestGuessLabels": best_guess_labels,
        "totalMatches": total_matches,
        "riskLevel": risk_level,
    }), 200


# ── Plagiarism Detection ────────────────────────────────────────────────────

import uuid
import threading

# In-memory job store  {job_id: {status, progress, result, error}}
_plagiarism_jobs: dict = {}


def _run_plagiarism_pipeline(job_id: str, pdf_bytes: bytes):
    """Run the full plagiarism detection pipeline in a background thread."""
    try:
        from plagiarism.extractor import extract_text_from_pdf, chunk_text
        from plagiarism.embeddings import get_embeddings
        from plagiarism.sources import fetch_sources
        from plagiarism.similarity import find_similar_chunks, find_self_similar_chunks
        from plagiarism.mapper import map_matches
        from plagiarism.report import build_report

        job = _plagiarism_jobs[job_id]
        print(f"\n[Netra] ═══════════════════════════════════════════════════════")
        print(f"[Netra] Starting plagiarism pipeline for job {job_id}")
        print(f"[Netra] PDF size: {len(pdf_bytes)} bytes")

        # Step 1: Extract text
        job["progress"] = 10
        job["stage"] = "Extracting text from PDF…"
        print(f"[Netra] Step 1: Extracting text from PDF…")
        full_text, page_count = extract_text_from_pdf(pdf_bytes)
        print(f"[Netra]   → Extracted {len(full_text)} chars, {page_count} pages")

        if not full_text or len(full_text.strip()) < 50:
            job["status"] = "error"
            job["error"] = "Could not extract meaningful text from the PDF."
            print(f"[Netra]   → ERROR: Not enough text extracted")
            return

        # Step 2: Chunk
        job["progress"] = 20
        job["stage"] = "Splitting document into chunks…"
        print(f"[Netra] Step 2: Splitting into chunks…")
        doc_chunks = chunk_text(full_text, chunk_words=200, overlap_words=50)
        print(f"[Netra]   → Created {len(doc_chunks)} chunks")

        if not doc_chunks:
            job["status"] = "error"
            job["error"] = "Document too short to analyze."
            print(f"[Netra]   → ERROR: No chunks created")
            return

        # Step 3: Embed document chunks
        job["progress"] = 30
        job["stage"] = "Generating document embeddings…"
        print(f"[Netra] Step 3: Generating document embeddings…")
        doc_texts = [c["text"] for c in doc_chunks]
        doc_embeddings = get_embeddings(doc_texts)
        print(f"[Netra]   → Embeddings shape: {doc_embeddings.shape}")

        # Step 4: Fetch external sources
        job["progress"] = 45
        job["stage"] = "Searching academic databases…"
        print(f"[Netra] Step 4: Fetching external sources…")
        sources = fetch_sources(full_text, max_sources=10)
        print(f"[Netra]   → Got {len(sources)} sources")

        # Step 5: Build source chunks and embeddings
        job["progress"] = 60
        job["stage"] = "Analyzing source documents…"
        print(f"[Netra] Step 5: Building source chunks…")
        source_chunks = []
        source_texts = []

        for src in sources:
            abstract = src.get("abstract", "")
            if abstract:
                # Treat each source abstract as one or more chunks
                words = abstract.split()
                for i in range(0, len(words), 150):
                    chunk_text_str = " ".join(words[i:i + 200])
                    source_chunks.append({
                        "text": chunk_text_str,
                        "source_title": src.get("title", ""),
                        "source_url": src.get("url", ""),
                    })
                    source_texts.append(chunk_text_str)

        print(f"[Netra]   → {len(source_chunks)} source chunks from {len(sources)} sources")

        all_matches = []

        # External source comparison
        if source_texts:
            print(f"[Netra] Step 6a: Computing external similarity…")
            source_embeddings = get_embeddings(source_texts)

            job["progress"] = 70
            job["stage"] = "Computing similarity scores…"
            raw_matches = find_similar_chunks(
                doc_embeddings, doc_chunks,
                source_embeddings, source_chunks,
                top_k=3,
            )
            print(f"[Netra]   → {len(raw_matches)} raw external matches")

            if raw_matches:
                mapped = map_matches(raw_matches, doc_chunks)
                all_matches.extend(mapped)
                print(f"[Netra]   → {len(mapped)} mapped external matches")

        # Self-similarity detection (always run)
        job["progress"] = 80
        job["stage"] = "Checking for internal duplicates…"
        print(f"[Netra] Step 6b: Computing self-similarity…")
        self_matches = find_self_similar_chunks(doc_embeddings, doc_chunks)
        print(f"[Netra]   → {len(self_matches)} self-similar matches")

        if self_matches:
            self_mapped = map_matches(self_matches, doc_chunks)
            all_matches.extend(self_mapped)
            print(f"[Netra]   → {len(self_mapped)} mapped self-similar matches")

        # Deduplicate overlapping matches (keep highest similarity)
        job["progress"] = 90
        job["stage"] = "Merging results…"
        all_matches.sort(key=lambda m: m["start"])
        if len(all_matches) > 1:
            deduped = [all_matches[0]]
            for m in all_matches[1:]:
                prev = deduped[-1]
                if m["start"] < prev["end"]:
                    # Overlapping — keep the one with higher similarity
                    if m["similarity"] > prev["similarity"]:
                        deduped[-1] = {
                            **m,
                            "start": min(prev["start"], m["start"]),
                            "end": max(prev["end"], m["end"]),
                        }
                    else:
                        deduped[-1]["end"] = max(prev["end"], m["end"])
                else:
                    deduped.append(m)
            all_matches = deduped

        print(f"[Netra]   → {len(all_matches)} total matches after dedup")

        # Step 8: Build report
        job["progress"] = 95
        job["stage"] = "Generating report…"
        print(f"[Netra] Step 7: Building report…")
        report = build_report(full_text, page_count, all_matches, sources)

        job["status"] = "complete"
        job["progress"] = 100
        job["stage"] = "Complete"
        job["result"] = report
        print(f"[Netra] ✓ Pipeline complete! Similarity: {report['similarity_index']}%")
        print(f"[Netra] ═══════════════════════════════════════════════════════\n")

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[Netra] ✗ Pipeline CRASHED: {e}")
        _plagiarism_jobs[job_id]["status"] = "error"
        _plagiarism_jobs[job_id]["error"] = str(e)


@app.route("/api/plagiarism/analyze", methods=["POST"])
def plagiarism_analyze():
    """
    Upload a PDF and start plagiarism analysis.
    Accepts multipart form with file field 'pdf'.
    Returns: { jobId }
    """
    if "pdf" not in request.files:
        return jsonify({"error": "No PDF file provided. Use field name 'pdf'."}), 400

    pdf_file = request.files["pdf"]
    if not pdf_file.filename or not pdf_file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "File must be a PDF."}), 400

    pdf_bytes = pdf_file.read()
    if len(pdf_bytes) < 100:
        return jsonify({"error": "PDF file is too small or empty."}), 400

    job_id = str(uuid.uuid4())
    _plagiarism_jobs[job_id] = {
        "status": "processing",
        "progress": 0,
        "stage": "Starting analysis…",
        "result": None,
        "error": None,
    }

    # Run pipeline in background thread
    thread = threading.Thread(
        target=_run_plagiarism_pipeline,
        args=(job_id, pdf_bytes),
        daemon=True,
    )
    thread.start()

    return jsonify({"jobId": job_id}), 202


@app.route("/api/plagiarism/status/<job_id>", methods=["GET"])
def plagiarism_status(job_id: str):
    """
    Poll the status of a plagiarism analysis job.
    Returns: { status, progress, stage, result?, error? }
    """
    job = _plagiarism_jobs.get(job_id)
    if not job:
        return jsonify({"error": "Job not found."}), 404

    response = {
        "status": job["status"],
        "progress": job["progress"],
        "stage": job["stage"],
    }

    if job["status"] == "complete" and job["result"]:
        response["result"] = job["result"]
    elif job["status"] == "error":
        response["error"] = job["error"]

    return jsonify(response), 200


# ── Run ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if not PINATA_JWT:
        print("WARNING: PINATA_JWT not set in server/.env")
    if not GOOGLE_VISION_API_KEY:
        print("WARNING: GOOGLE_VISION_API_KEY not set in server/.env")
    print("Netra backend starting on http://localhost:5000")
    app.run(host="0.0.0.0", port=5000, debug=True)
