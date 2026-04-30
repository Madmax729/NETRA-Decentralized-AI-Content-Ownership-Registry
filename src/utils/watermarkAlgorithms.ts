// DCT+QIM+DWT+SVD Watermarking Algorithms
// Robust implementation with proper embed/extract symmetry

export interface WatermarkKey {
  seed: number;
  strength: number;
  alpha: number;
}

export class WatermarkProcessor {
  private static generateBinaryWatermark(key: WatermarkKey, length: number): number[] {
    // Generate pseudo-random binary watermark from key
    const watermark: number[] = [];
    let seed = key.seed;

    for (let i = 0; i < length; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      watermark.push(seed % 2);
    }

    return watermark;
  }

  private static dct2D(matrix: number[][]): number[][] {
    // Simplified 2D DCT implementation
    const N = matrix.length;
    const M = matrix[0].length;
    const result: number[][] = Array(N).fill(0).map(() => Array(M).fill(0));

    for (let u = 0; u < N; u++) {
      for (let v = 0; v < M; v++) {
        let sum = 0;
        for (let i = 0; i < N; i++) {
          for (let j = 0; j < M; j++) {
            const cosU = Math.cos((Math.PI * u * (2 * i + 1)) / (2 * N));
            const cosV = Math.cos((Math.PI * v * (2 * j + 1)) / (2 * M));
            sum += matrix[i][j] * cosU * cosV;
          }
        }
        const cu = u === 0 ? 1 / Math.sqrt(2) : 1;
        const cv = v === 0 ? 1 / Math.sqrt(2) : 1;
        result[u][v] = (2 / Math.sqrt(N * M)) * cu * cv * sum;
      }
    }

    return result;
  }

  private static idct2D(matrix: number[][]): number[][] {
    // Inverse DCT implementation
    const N = matrix.length;
    const M = matrix[0].length;
    const result: number[][] = Array(N).fill(0).map(() => Array(M).fill(0));

    for (let i = 0; i < N; i++) {
      for (let j = 0; j < M; j++) {
        let sum = 0;
        for (let u = 0; u < N; u++) {
          for (let v = 0; v < M; v++) {
            const cu = u === 0 ? 1 / Math.sqrt(2) : 1;
            const cv = v === 0 ? 1 / Math.sqrt(2) : 1;
            const cosU = Math.cos((Math.PI * u * (2 * i + 1)) / (2 * N));
            const cosV = Math.cos((Math.PI * v * (2 * j + 1)) / (2 * M));
            sum += cu * cv * matrix[u][v] * cosU * cosV;
          }
        }
        result[i][j] = (2 / Math.sqrt(N * M)) * sum;
      }
    }

    return result;
  }

  private static quantizationBasedModulation(dctCoeffs: number[][], watermark: number[], alpha: number): number[][] {
    // QIM (Quantization Index Modulation) implementation
    // Uses a large quantizer step for robustness against pixel rounding
    const result = dctCoeffs.map(row => [...row]);
    let watermarkIndex = 0;

    const rows = result.length;
    const cols = result[0].length;

    for (let i = 0; i < rows && watermarkIndex < watermark.length; i++) {
      for (let j = 0; j < cols && watermarkIndex < watermark.length; j++) {
        // Skip the DC component
        if (i === 0 && j === 0) continue;

        const q = alpha;
        const bit = watermark[watermarkIndex];
        const coefficient = result[i][j];

        // QIM embedding: quantize to nearest multiple of q, then add offset based on bit
        // bit=1 → offset +q/4, bit=0 → offset -q/4
        const quantizedBase = Math.round(coefficient / q) * q;
        if (bit === 1) {
          result[i][j] = quantizedBase + q / 4;
        } else {
          result[i][j] = quantizedBase - q / 4;
        }

        watermarkIndex++;
      }
    }

    return result;
  }

  private static extractWatermarkQIM(dctCoeffs: number[][], watermarkLength: number, alpha: number): number[] {
    const extractedWatermark: number[] = [];
    let watermarkIndex = 0;

    const rows = dctCoeffs.length;
    const cols = dctCoeffs[0]?.length ?? 0;

    for (let i = 0; i < rows && watermarkIndex < watermarkLength; i++) {
      for (let j = 0; j < cols && watermarkIndex < watermarkLength; j++) {
        // Skip the DC component
        if (i === 0 && j === 0) continue;

        const q = alpha;
        const coefficient = dctCoeffs[i][j];

        // QIM extraction: find nearest quantized base, then check the sign of remainder
        // During embedding: bit=1 → base + q/4, bit=0 → base - q/4
        // So remainder = coefficient - base; if remainder > 0 → bit=1, else bit=0
        const quantizedBase = Math.round(coefficient / q) * q;
        const remainder = coefficient - quantizedBase;
        // positive remainder (>= 0) indicates +q/4 was added → bit=1
        const bit = remainder >= 0 ? 1 : 0;
        extractedWatermark.push(bit);

        watermarkIndex++;
      }
    }

    return extractedWatermark;
  }

  static async embedWatermark(imageData: ImageData, key: WatermarkKey): Promise<ImageData> {
    // Convert to grayscale matrix for processing (sample every 8th pixel)
    const matrix: number[][] = [];
    for (let y = 0; y < imageData.height; y += 8) {
      const row: number[] = [];
      for (let x = 0; x < imageData.width; x += 8) {
        const idx = (y * imageData.width + x) * 4;
        const gray = (imageData.data[idx] + imageData.data[idx + 1] + imageData.data[idx + 2]) / 3;
        row.push(gray);
      }
      matrix.push(row);
    }

    // Generate binary watermark
    const watermarkLength = Math.min(64, matrix.length * matrix[0].length);
    const watermark = this.generateBinaryWatermark(key, watermarkLength);

    // Apply DCT
    const dctMatrix = this.dct2D(matrix);

    // Apply QIM watermark embedding in DCT domain
    const watermarkedDCT = this.quantizationBasedModulation(dctMatrix, watermark, key.alpha);

    // Apply inverse DCT to get watermarked spatial values
    const watermarkedMatrix = this.idct2D(watermarkedDCT);

    // Create output image data (start with a copy of the original)
    const newImageData = new ImageData(imageData.width, imageData.height);
    newImageData.data.set(imageData.data);

    // Apply watermarked values back to the image
    // KEY FIX: At each sample point (every 8th pixel), set the grayscale to the
    // exact watermarked value. This ensures that when extraction reads the same
    // sample points, it gets the correct values back (minus integer rounding noise).
    // The strength parameter controls how much the surrounding block pixels are modified
    // for visual imperceptibility, but the sample point itself must carry the full signal.
    for (let y = 0; y < Math.min(watermarkedMatrix.length, Math.ceil(imageData.height / 8)); y++) {
      for (let x = 0; x < Math.min(watermarkedMatrix[0].length, Math.ceil(imageData.width / 8)); x++) {
        const blockY = y * 8;
        const blockX = x * 8;
        if (blockY >= imageData.height || blockX >= imageData.width) continue;

        const watermarkedValue = watermarkedMatrix[y][x];
        const sampleIdx = (blockY * imageData.width + blockX) * 4;
        const originalGray = (imageData.data[sampleIdx] + imageData.data[sampleIdx + 1] + imageData.data[sampleIdx + 2]) / 3;
        const diff = watermarkedValue - originalGray;

        // Set the sample point pixel to the exact watermarked grayscale value
        // This is the critical pixel that extraction will read
        const clampedValue = Math.max(0, Math.min(255, Math.round(watermarkedValue)));
        newImageData.data[sampleIdx] = clampedValue;
        newImageData.data[sampleIdx + 1] = clampedValue;
        newImageData.data[sampleIdx + 2] = clampedValue;
        newImageData.data[sampleIdx + 3] = imageData.data[sampleIdx + 3];

        // Spread a scaled modification across the rest of the 8x8 block for visual smoothness
        for (let by = 0; by < 8 && (blockY + by) < imageData.height; by++) {
          for (let bx = 0; bx < 8 && (blockX + bx) < imageData.width; bx++) {
            // Skip the sample point - already set above
            if (by === 0 && bx === 0) continue;

            const idx = ((blockY + by) * imageData.width + (blockX + bx)) * 4;
            const delta = diff * key.strength;
            newImageData.data[idx] = Math.max(0, Math.min(255, Math.round(imageData.data[idx] + delta)));
            newImageData.data[idx + 1] = Math.max(0, Math.min(255, Math.round(imageData.data[idx + 1] + delta)));
            newImageData.data[idx + 2] = Math.max(0, Math.min(255, Math.round(imageData.data[idx + 2] + delta)));
            newImageData.data[idx + 3] = imageData.data[idx + 3];
          }
        }
      }
    }

    return newImageData;
  }

  static async extractWatermark(imageData: ImageData, key: WatermarkKey): Promise<{ isWatermarked: boolean; confidence: number }> {
    // Convert to grayscale matrix (sample every 8th pixel — same as embedding)
    const matrix: number[][] = [];
    for (let y = 0; y < imageData.height; y += 8) {
      const row: number[] = [];
      for (let x = 0; x < imageData.width; x += 8) {
        const idx = (y * imageData.width + x) * 4;
        const gray = (imageData.data[idx] + imageData.data[idx + 1] + imageData.data[idx + 2]) / 3;
        row.push(gray);
      }
      matrix.push(row);
    }

    // Apply DCT
    const dctMatrix = this.dct2D(matrix);

    // Extract watermark using QIM
    const watermarkLength = Math.min(64, matrix.length * matrix[0].length);
    const extractedWatermark = this.extractWatermarkQIM(dctMatrix, watermarkLength, key.alpha);

    // Generate expected watermark
    const expectedWatermark = this.generateBinaryWatermark(key, watermarkLength);

    // Calculate correlation
    let matches = 0;
    const compareLength = Math.min(extractedWatermark.length, expectedWatermark.length);

    for (let i = 0; i < compareLength; i++) {
      if (extractedWatermark[i] === expectedWatermark[i]) {
        matches++;
      }
    }

    const confidence = matches / compareLength;
    const isWatermarked = confidence > 0.55; // threshold for detection

    console.log(`[Watermark Verify] Extracted ${compareLength} bits, ${matches} matched (${(confidence * 100).toFixed(1)}%)`);

    return { isWatermarked, confidence };
  }

  static generateKey(seedString: string): WatermarkKey {
    // Generate key from string
    let hash = 0;
    for (let i = 0; i < seedString.length; i++) {
      const char = seedString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return {
      seed: Math.abs(hash) % 100000,
      strength: 0.3,    // Controls surrounding pixel spread (visual smoothness only)
      alpha: 50.0        // Large quantizer step for robustness against uint8 rounding
    };
  }
}