import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import BlockchainBackground from "@/components/BlockchainBackground";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";
import {
    CheckCircle,
    Copy,
    ExternalLink,
    Fuel,
    Loader2,
    FileJson,
    Upload,
    Coins,
    Wallet,
    ArrowRight,
    Shield,
    Link as LinkIcon,
} from "lucide-react";
import { CONTRACT_ADDRESS, CONTRACT_ABI, ROOTSTOCK_TESTNET_CHAIN_ID, isContractConfigured } from "@/config/contract";
import { saveMintedNFT } from "@/utils/mintedNFTs";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AssetInfo {
    imageCID: string;
    contentHash: string;
    aiFingerprint: string;
    watermarkType: string;
}

interface MetadataFields {
    name: string;
    description: string;
    royaltyPercent: number;
}

interface MetadataJSON {
    name: string;
    description: string;
    image: string;
    external_url: string;
    attributes: { trait_type: string; value: string }[];
}

interface MintResult {
    tokenId: string;
    txHash: string;
}

type Step = 1 | 2 | 3 | 4;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

const shortenHash = (hash: string, chars = 8) =>
    hash.length > chars * 2 + 2
        ? `${hash.slice(0, chars + 2)}...${hash.slice(-chars)}`
        : hash;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const Mint = () => {
    const { isConnected, address, connect, isConnecting } = useWallet();
    const { toast } = useToast();

    // Step management
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [completedSteps, setCompletedSteps] = useState<Set<Step>>(new Set());

    // Step 1 – Asset details
    const [asset, setAsset] = useState<AssetInfo>({
        imageCID: "",
        contentHash: "",
        aiFingerprint: "",
        watermarkType: "Invisible",
    });

    // Auto-populate AI Fingerprint from connected wallet address
    useEffect(() => {
        if (address && !asset.aiFingerprint) {
            setAsset((a) => ({ ...a, aiFingerprint: address }));
        }
    }, [address]);

    // Step 2 – Metadata
    const [meta, setMeta] = useState<MetadataFields>({
        name: "",
        description: "",
        royaltyPercent: 5,
    });
    const [metadata, setMetadata] = useState<MetadataJSON | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Step 3 – IPFS upload
    const [metadataCID, setMetadataCID] = useState("");
    const [metadataGateway, setMetadataGateway] = useState("");
    const [isUploadingMeta, setIsUploadingMeta] = useState(false);

    // Step 4 – Mint
    const [gasEstimate, setGasEstimate] = useState("");
    const [isMinting, setIsMinting] = useState(false);
    const [mintResult, setMintResult] = useState<MintResult | null>(null);
    const [isEstimating, setIsEstimating] = useState(false);

    /* ────────────────────── Step navigation ────────────────────── */

    const markComplete = (step: Step) => {
        setCompletedSteps((prev) => new Set(prev).add(step));
        if (step < 4) setCurrentStep((step + 1) as Step);
    };

    const canProceed = (step: Step): boolean => {
        switch (step) {
            case 1:
                return !!(asset.imageCID && asset.contentHash && asset.aiFingerprint);
            case 2:
                return !!(meta.name && meta.description && metadata);
            case 3:
                return !!metadataCID;
            default:
                return false;
        }
    };

    /* ────────────────────── Step 1 handlers ────────────────────── */

    const handleConfirmAsset = () => {
        if (!asset.imageCID || !asset.contentHash || !asset.aiFingerprint) {
            toast({ title: "Missing fields", description: "Please fill all asset fields", variant: "destructive" });
            return;
        }
        markComplete(1);
        toast({ title: "Asset details confirmed" });
    };

    /* ────────────────────── Step 2 – Generate metadata (client-side) ── */

    const handleGenerateMetadata = useCallback(() => {
        setIsGenerating(true);
        try {
            const md: MetadataJSON = {
                name: meta.name,
                description: meta.description,
                image: `ipfs://${asset.imageCID}`,
                external_url: `https://gateway.pinata.cloud/ipfs/${asset.imageCID}`,
                attributes: [
                    { trait_type: "Content Hash", value: asset.contentHash },
                    { trait_type: "AI Fingerprint", value: asset.aiFingerprint },
                    { trait_type: "Watermark Type", value: asset.watermarkType },
                    { trait_type: "Royalty %", value: String(meta.royaltyPercent) },
                    { trait_type: "Registry", value: "Netra" },
                    { trait_type: "Created", value: new Date().toISOString() },
                ],
            };
            setMetadata(md);
            toast({ title: "Metadata generated successfully" });
        } catch (err: any) {
            toast({ title: "Generation failed", description: err.message, variant: "destructive" });
        } finally {
            setIsGenerating(false);
        }
    }, [meta, asset, toast]);

    const handleConfirmMetadata = () => {
        if (!metadata) return;
        markComplete(2);
    };

    /* ────────────────────── Step 3 – Upload to IPFS (Pinata direct) ── */

    const handleUploadMetadata = useCallback(async () => {
        if (!metadata) return;

        const pinataJwt = import.meta.env.VITE_PINATA_JWT as string | undefined;
        if (!pinataJwt) {
            toast({ title: "Pinata JWT missing", description: "Set VITE_PINATA_JWT in your .env file", variant: "destructive" });
            return;
        }

        setIsUploadingMeta(true);
        try {
            const payload = {
                pinataContent: metadata,
                pinataMetadata: {
                    name: `netra-metadata-${metadata.name || "untitled"}-${Date.now()}`,
                },
                pinataOptions: { cidVersion: 1 },
            };

            const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${pinataJwt}`,
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errText = await res.text().catch(() => "");
                throw new Error(`Pinata upload failed (${res.status}): ${errText}`);
            }

            const data = await res.json();
            const cid = data.IpfsHash;

            setMetadataCID(cid);
            setMetadataGateway(`https://gateway.pinata.cloud/ipfs/${cid}`);
            markComplete(3);
            toast({ title: "Metadata uploaded to IPFS", description: `CID: ${cid}` });
        } catch (err: any) {
            toast({ title: "Upload failed", description: err.message, variant: "destructive" });
        } finally {
            setIsUploadingMeta(false);
        }
    }, [metadata, toast]);

    /* ────────────────────── Step 4 – Mint ─────────────────────── */

    const ensureSepolia = useCallback(async () => {
        const eth = (window as any).ethereum;
        if (!eth) return false;
        const chainId = await eth.request({ method: "eth_chainId" });
        if (chainId === ROOTSTOCK_TESTNET_CHAIN_ID) return true;
        try {
            await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: ROOTSTOCK_TESTNET_CHAIN_ID }] });
            return true;
        } catch (switchError: any) {
            if (switchError.code === 4902) {
                try {
                    await eth.request({
                        method: "wallet_addEthereumChain",
                        params: [{
                            chainId: ROOTSTOCK_TESTNET_CHAIN_ID,
                            chainName: "Rootstock Testnet",
                            nativeCurrency: { name: "Test RBTC", symbol: "tRBTC", decimals: 18 },
                            rpcUrls: ["https://public-node.testnet.rsk.co"],
                            blockExplorerUrls: ["https://explorer.testnet.rootstock.io"],
                        }],
                    });
                    return true;
                } catch {
                    return false;
                }
            }
            return false;
        }
    }, []);

    const estimateGas = useCallback(async () => {
        if (!isConnected || !metadataCID || !address) return;
        if (!isContractConfigured()) {
            setGasEstimate("Contract address not configured");
            return;
        }
        setIsEstimating(true);
        try {
            const { BrowserProvider, Contract } = await import("ethers");
            const provider = new BrowserProvider((window as any).ethereum);
            const signer = await provider.getSigner();
            const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

            const metadataURI = `ipfs://${metadataCID}`;
            // Hash the content hash (IPFS CID) to produce a valid bytes32
            const { keccak256, toUtf8Bytes } = await import("ethers");
            const hashBytes = keccak256(toUtf8Bytes(asset.contentHash));
            const royaltyBps = Math.round(meta.royaltyPercent * 100);

            const gasEst = await contract.mintNFT.estimateGas(metadataURI, hashBytes, royaltyBps);
            const feeData = await provider.getFeeData();
            const gasPrice = feeData.gasPrice ?? 0n;
            const totalWei = gasEst * gasPrice;
            const ethCost = Number(totalWei) / 1e18;
            setGasEstimate(`~${ethCost.toFixed(6)} tRBTC (${gasEst.toString()} gas)`);
        } catch (err: any) {
            console.error("Gas estimation failed:", err);
            setGasEstimate("Unable to estimate (check contract deployment)");
        } finally {
            setIsEstimating(false);
        }
    }, [isConnected, metadataCID, address, asset.contentHash, meta.royaltyPercent]);

    useEffect(() => {
        if (currentStep === 4 && isConnected && metadataCID) {
            ensureSepolia().then((ok) => ok && estimateGas());
        }
    }, [currentStep, isConnected, metadataCID, ensureSepolia, estimateGas]);

    const handleMint = useCallback(async () => {
        if (!isConnected) {
            await connect();
            return;
        }
        if (!isContractConfigured()) {
            toast({ title: "Contract not configured", description: "Set VITE_CONTRACT_ADDRESS in your .env file", variant: "destructive" });
            return;
        }
        const sepoliaOk = await ensureSepolia();
        if (!sepoliaOk) {
            toast({ title: "Wrong network", description: "Please switch to Rootstock Testnet", variant: "destructive" });
            return;
        }

        setIsMinting(true);
        try {
            const { BrowserProvider, Contract } = await import("ethers");
            const provider = new BrowserProvider((window as any).ethereum);
            const signer = await provider.getSigner();
            const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

            const metadataURI = `ipfs://${metadataCID}`;
            // Hash the content hash (IPFS CID) to produce a valid bytes32
            const { keccak256, toUtf8Bytes } = await import("ethers");
            const hashBytes = keccak256(toUtf8Bytes(asset.contentHash));
            const royaltyBps = Math.round(meta.royaltyPercent * 100);

            const tx = await contract.mintNFT(metadataURI, hashBytes, royaltyBps);
            toast({ title: "Transaction submitted", description: `Tx: ${shortenHash(tx.hash)}` });

            const receipt = await tx.wait();

            // Parse NFTMinted event to get tokenId
            let tokenId = "–";
            for (const log of receipt.logs) {
                try {
                    const parsed = contract.interface.parseLog({ topics: [...log.topics], data: log.data });
                    if (parsed?.name === "NFTMinted") {
                        tokenId = parsed.args.tokenId.toString();
                        break;
                    }
                } catch {
                    // not our event
                }
            }

            setMintResult({ tokenId, txHash: tx.hash });
            markComplete(4);

            // Save to localStorage so Marketplace can display it
            saveMintedNFT({
                tokenId,
                txHash: tx.hash,
                name: meta.name,
                description: meta.description,
                imageCID: asset.imageCID,
                metadataCID,
                contentHash: asset.contentHash,
                aiFingerprint: asset.aiFingerprint,
                watermarkType: asset.watermarkType,
                royaltyPercent: meta.royaltyPercent,
                owner: address || "",
                mintedAt: new Date().toISOString(),
            });

            toast({ title: "NFT Minted!", description: `Token #${tokenId} created successfully` });
        } catch (err: any) {
            console.error("Mint failed:", err);
            const msg = err?.reason || err?.message || "Unknown error";
            toast({ title: "Minting failed", description: msg, variant: "destructive" });
        } finally {
            setIsMinting(false);
        }
    }, [isConnected, connect, ensureSepolia, metadataCID, address, asset, meta, toast]);

    /* ────────────────────── Step indicator ─────────────────────── */

    const steps: { num: Step; label: string; icon: typeof Coins }[] = [
        { num: 1, label: "Asset Details", icon: Shield },
        { num: 2, label: "Metadata", icon: FileJson },
        { num: 3, label: "Upload IPFS", icon: Upload },
        { num: 4, label: "Mint NFT", icon: Coins },
    ];

    /* ────────────────────── Render ─────────────────────────────── */

    return (
        <div className="min-h-screen blockchain-bg relative">
            <BlockchainBackground />

            <div className="relative pt-24 pb-16 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <h1 className="text-4xl font-bold text-foreground mb-3">Mint NFT</h1>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            Register your content on-chain with ERC-721 + ERC-2981 royalty support
                        </p>
                    </div>

                    {/* ── Step Indicator ───────────────────────────────────── */}
                    <div className="flex items-center justify-between mb-10 px-2">
                        {steps.map((s, i) => {
                            const done = completedSteps.has(s.num);
                            const active = currentStep === s.num;
                            return (
                                <div key={s.num} className="flex items-center flex-1 last:flex-initial">
                                    <button
                                        onClick={() => {
                                            if (done || active || s.num <= currentStep) setCurrentStep(s.num);
                                        }}
                                        className={`flex flex-col items-center gap-1.5 transition-all ${active ? "scale-110" : ""
                                            }`}
                                    >
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${done
                                                ? "bg-green-500 text-white shadow-md shadow-green-500/30"
                                                : active
                                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                                                    : "bg-muted text-muted-foreground"
                                                }`}
                                        >
                                            {done ? <CheckCircle className="w-5 h-5" /> : <s.icon className="w-4 h-4" />}
                                        </div>
                                        <span
                                            className={`text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground"
                                                }`}
                                        >
                                            {s.label}
                                        </span>
                                    </button>
                                    {i < steps.length - 1 && (
                                        <div
                                            className={`flex-1 h-px mx-3 mt-[-18px] transition-colors duration-300 ${completedSteps.has(s.num) ? "bg-green-500" : "bg-border"
                                                }`}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Step 1: Asset Details ────────────────────────────── */}
                    {currentStep === 1 && (
                        <Card className="glass-card animate-fade-in">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="w-5 h-5" />
                                    Asset Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <p className="text-sm text-muted-foreground">
                                    Enter the details from your IPFS upload and watermarking process.
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <Label htmlFor="imageCID">Image CID *</Label>
                                        <Input
                                            id="imageCID"
                                            placeholder="bafybei..."
                                            value={asset.imageCID}
                                            onChange={(e) => setAsset((a) => ({ ...a, imageCID: e.target.value }))}
                                            className="glass font-mono text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="contentHash">Content Hash (SHA-256) *</Label>
                                        <Input
                                            id="contentHash"
                                            placeholder="e3b0c442..."
                                            value={asset.contentHash}
                                            onChange={(e) => setAsset((a) => ({ ...a, contentHash: e.target.value }))}
                                            className="glass font-mono text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="aiFingerprint">AI Fingerprint *</Label>
                                        <Input
                                            id="aiFingerprint"
                                            placeholder="fp_abc123..."
                                            value={asset.aiFingerprint}
                                            onChange={(e) => setAsset((a) => ({ ...a, aiFingerprint: e.target.value }))}
                                            className="glass font-mono text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="watermarkType">Watermark Type</Label>
                                        <Input
                                            id="watermarkType"
                                            value={asset.watermarkType}
                                            onChange={(e) => setAsset((a) => ({ ...a, watermarkType: e.target.value }))}
                                            className="glass text-sm"
                                        />
                                    </div>
                                </div>

                                <Button
                                    onClick={handleConfirmAsset}
                                    disabled={!canProceed(1)}
                                    className="w-full btn-primary"
                                >
                                    Continue to Metadata
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* ── Step 2: Generate Metadata ────────────────────────── */}
                    {currentStep === 2 && (
                        <Card className="glass-card animate-fade-in">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileJson className="w-5 h-5" />
                                    Generate NFT Metadata
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="nft-name">NFT Name *</Label>
                                        <Input
                                            id="nft-name"
                                            placeholder="My Digital Artwork"
                                            value={meta.name}
                                            onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))}
                                            className="glass"
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="nft-desc">Description *</Label>
                                        <Textarea
                                            id="nft-desc"
                                            placeholder="Describe your digital content..."
                                            value={meta.description}
                                            onChange={(e) => setMeta((m) => ({ ...m, description: e.target.value }))}
                                            className="glass min-h-[80px]"
                                        />
                                    </div>
                                    <div className="space-y-3 md:col-span-2">
                                        <div className="flex items-center justify-between">
                                            <Label>Royalty</Label>
                                            <span className="text-sm font-semibold text-primary">
                                                {meta.royaltyPercent}%
                                            </span>
                                        </div>
                                        <Slider
                                            min={0}
                                            max={10}
                                            step={0.5}
                                            value={[meta.royaltyPercent]}
                                            onValueChange={([v]) => setMeta((m) => ({ ...m, royaltyPercent: v }))}
                                            className="w-full"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            On-chain royalty via ERC-2981 (0-10%). Set 0 to disable.
                                        </p>
                                    </div>
                                </div>

                                <Button
                                    onClick={handleGenerateMetadata}
                                    disabled={!meta.name || !meta.description || isGenerating}
                                    className="w-full btn-primary"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…
                                        </>
                                    ) : (
                                        <>
                                            <FileJson className="w-4 h-4 mr-2" /> Generate Metadata
                                        </>
                                    )}
                                </Button>

                                {/* Generated JSON preview */}
                                {metadata && (
                                    <div className="space-y-3">
                                        <Label className="text-sm font-medium">Metadata Preview</Label>
                                        <pre className="glass rounded-xl p-4 text-xs font-mono overflow-x-auto max-h-64 leading-relaxed">
                                            {JSON.stringify(metadata, null, 2)}
                                        </pre>
                                        <Button
                                            onClick={handleConfirmMetadata}
                                            className="w-full btn-primary"
                                        >
                                            Confirm & Continue
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* ── Step 3: Upload Metadata to IPFS ──────────────────── */}
                    {currentStep === 3 && (
                        <Card className="glass-card animate-fade-in">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Upload className="w-5 h-5" />
                                    Upload Metadata to IPFS
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                {!metadataCID ? (
                                    <>
                                        <p className="text-sm text-muted-foreground">
                                            Your metadata JSON will be pinned to IPFS via Pinata to generate a
                                            permanent metadataCID.
                                        </p>
                                        <div className="glass rounded-xl p-4">
                                            <pre className="text-xs font-mono overflow-x-auto max-h-40 leading-relaxed">
                                                {JSON.stringify(metadata, null, 2)}
                                            </pre>
                                        </div>
                                        <Button
                                            onClick={handleUploadMetadata}
                                            disabled={isUploadingMeta}
                                            className="w-full btn-primary"
                                        >
                                            {isUploadingMeta ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading to
                                                    IPFS…
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="w-4 h-4 mr-2" /> Upload to IPFS
                                                </>
                                            )}
                                        </Button>
                                    </>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 p-4 rounded-xl bg-green-50 border border-green-200">
                                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                            <p className="text-green-800 font-medium text-sm">
                                                Metadata uploaded to IPFS successfully
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <Label className="text-sm">Metadata CID</Label>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Input
                                                        value={metadataCID}
                                                        readOnly
                                                        className="glass font-mono text-sm"
                                                    />
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="btn-glass"
                                                        onClick={() => {
                                                            copyToClipboard(metadataCID);
                                                            toast({ title: "Copied!" });
                                                        }}
                                                    >
                                                        <Copy className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-sm">Metadata URI</Label>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Input
                                                        value={`ipfs://${metadataCID}`}
                                                        readOnly
                                                        className="glass font-mono text-sm"
                                                    />
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="btn-glass"
                                                        onClick={() =>
                                                            window.open(metadataGateway, "_blank")
                                                        }
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={() => setCurrentStep(4)}
                                            className="w-full btn-primary"
                                        >
                                            <Coins className="w-4 h-4 mr-2" /> Proceed to Mint
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* ── Step 4: Mint NFT ─────────────────────────────────── */}
                    {currentStep === 4 && (
                        <Card className="glass-card animate-fade-in">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Coins className="w-5 h-5" />
                                    Mint NFT
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                {/* Wallet Status */}
                                <div className="flex items-center justify-between p-4 rounded-xl glass">
                                    <div className="flex items-center gap-3">
                                        <Wallet className="w-5 h-5 text-primary" />
                                        <div>
                                            <p className="text-sm font-medium text-foreground">
                                                {isConnected ? "Wallet Connected" : "Connect Wallet"}
                                            </p>
                                            <p className="text-xs text-muted-foreground font-mono">
                                                {isConnected ? address : "MetaMask required"}
                                            </p>
                                        </div>
                                    </div>
                                    {isConnected ? (
                                        <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                                            Rootstock
                                        </Badge>
                                    ) : (
                                        <Button
                                            size="sm"
                                            onClick={connect}
                                            disabled={isConnecting}
                                            className="btn-primary"
                                        >
                                            {isConnecting ? "Connecting…" : "Connect"}
                                        </Button>
                                    )}
                                </div>

                                {/* Summary */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="glass rounded-xl p-3">
                                        <p className="text-xs text-muted-foreground mb-1">Metadata CID</p>
                                        <p className="font-mono text-xs truncate">{metadataCID}</p>
                                    </div>
                                    <div className="glass rounded-xl p-3">
                                        <p className="text-xs text-muted-foreground mb-1">Content Hash</p>
                                        <p className="font-mono text-xs truncate">{shortenHash(asset.contentHash)}</p>
                                    </div>
                                    <div className="glass rounded-xl p-3">
                                        <p className="text-xs text-muted-foreground mb-1">Royalty</p>
                                        <p className="text-sm font-semibold">{meta.royaltyPercent}%</p>
                                    </div>
                                    <div className="glass rounded-xl p-3">
                                        <p className="text-xs text-muted-foreground mb-1">Network</p>
                                        <p className="text-sm font-semibold">Rootstock Testnet</p>
                                    </div>
                                </div>

                                {/* Gas Estimate */}
                                <div className="flex items-center justify-between p-3 rounded-xl glass">
                                    <div className="flex items-center gap-2">
                                        <Fuel className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">Estimated Gas</span>
                                    </div>
                                    {isEstimating ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                    ) : (
                                        <span className="text-sm font-mono">
                                            {gasEstimate || "–"}
                                        </span>
                                    )}
                                </div>

                                {/* Mint Button */}
                                {!mintResult ? (
                                    <Button
                                        onClick={handleMint}
                                        disabled={isMinting || !isConnected}
                                        className="w-full btn-primary py-6 text-base"
                                    >
                                        {isMinting ? (
                                            <>
                                                <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Minting…
                                            </>
                                        ) : (
                                            <>
                                                <Coins className="w-5 h-5 mr-2" /> Mint NFT
                                            </>
                                        )}
                                    </Button>
                                ) : (
                                    /* Mint Success */
                                    <div className="space-y-4">
                                        <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-green-50 border border-green-200">
                                            <CheckCircle className="w-12 h-12 text-green-600" />
                                            <h3 className="text-xl font-bold text-green-800">
                                                NFT Minted Successfully!
                                            </h3>
                                            <Badge className="bg-green-100 text-green-700 text-lg px-4 py-1">
                                                Token #{mintResult.tokenId}
                                            </Badge>
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <Label className="text-sm">Transaction Hash</Label>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Input
                                                        value={mintResult.txHash}
                                                        readOnly
                                                        className="glass font-mono text-sm"
                                                    />
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="btn-glass"
                                                        onClick={() => {
                                                            copyToClipboard(mintResult.txHash);
                                                            toast({ title: "Copied!" });
                                                        }}
                                                    >
                                                        <Copy className="w-3 h-3" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="btn-glass"
                                                        onClick={() =>
                                                            window.open(
                                                                `https://explorer.testnet.rootstock.io/tx/${mintResult.txHash}`,
                                                                "_blank"
                                                            )
                                                        }
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-sm">Metadata URI</Label>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Input
                                                        value={`ipfs://${metadataCID}`}
                                                        readOnly
                                                        className="glass font-mono text-sm"
                                                    />
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="btn-glass"
                                                        onClick={() =>
                                                            window.open(metadataGateway, "_blank")
                                                        }
                                                    >
                                                        <LinkIcon className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Mint;
