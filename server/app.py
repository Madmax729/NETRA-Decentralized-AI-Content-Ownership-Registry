"""
Netra – Stateless Flask backend
Generates NFT metadata JSON and uploads it to IPFS via Pinata.
"""

import os
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


# ── Run ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if not PINATA_JWT:
        print("WARNING: PINATA_JWT not set in server/.env")
    print("Netra backend starting on http://localhost:5000")
    app.run(host="0.0.0.0", port=5000, debug=True)
