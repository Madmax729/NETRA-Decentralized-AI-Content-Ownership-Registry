// DCT+QIM+DWT+SVD Watermarking Algorithms
// This is a simplified implementation for demonstration purposes

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
    // QIM (Quantization Index Modulation) implementation across available mid-frequency coefficients
    const result = dctCoeffs.map(row => [...row]);
    let watermarkIndex = 0;

    const rows = result.length;
    const cols = result[0].length;

    for (let i = 0; i < rows && watermarkIndex < watermark.length; i++) {
      for (let j = 0; j < cols && watermarkIndex < watermark.length; j++) {
        // Skip the DC component
        if (i === 0 && j === 0) continue;

        const quantizer = alpha;
        const bit = watermark[watermarkIndex];
        const coefficient = result[i][j];

        // QIM embedding
        const quantizedValue = Math.round(coefficient / quantizer) * quantizer;
        if (bit === 1) {
          result[i][j] = quantizedValue + quantizer / 4;
        } else {
          result[i][j] = quantizedValue - quantizer / 4;
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

        const quantizer = alpha;
        const coefficient = dctCoeffs[i][j];

        // QIM extraction: embedding did quantizedValue ± q/4
        // So we check: if (coeff mod q) is in upper half → bit=1, lower half → bit=0
        const quantizedBase = Math.round(coefficient / quantizer) * quantizer;
        const remainder = coefficient - quantizedBase;
        // positive remainder (> 0) indicates +q/4 was added → bit=1
        const bit = remainder >= 0 ? 1 : 0;
        extractedWatermark.push(bit);

        watermarkIndex++;
      }
    }

    return extractedWatermark;
  }

  static async embedWatermark(imageData: ImageData, key: WatermarkKey): Promise<ImageData> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot create canvas context');

    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);

    // Convert to grayscale matrix for processing
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

    // Apply QIM
    const watermarkedDCT = this.quantizationBasedModulation(dctMatrix, watermark, key.alpha);

    // Apply inverse DCT
    const watermarkedMatrix = this.idct2D(watermarkedDCT);

    // Apply watermarked values back to image
    const newImageData = new ImageData(imageData.width, imageData.height);
    newImageData.data.set(imageData.data);

    for (let y = 0; y < Math.min(watermarkedMatrix.length, imageData.height / 8); y++) {
      for (let x = 0; x < Math.min(watermarkedMatrix[0].length, imageData.width / 8); x++) {
        const blockY = y * 8;
        const blockX = x * 8;
        if (blockY < imageData.height && blockX < imageData.width) {
          const baseIdx = (blockY * imageData.width + blockX) * 4;
          const watermarkedValue = Math.max(0, Math.min(255, watermarkedMatrix[y][x]));
          const original = (imageData.data[baseIdx] + imageData.data[baseIdx + 1] + imageData.data[baseIdx + 2]) / 3;
          const diff = watermarkedValue - original;

          // Spread the modification across the entire 8x8 block for stronger embedding
          for (let by = 0; by < 8 && (blockY + by) < imageData.height; by++) {
            for (let bx = 0; bx < 8 && (blockX + bx) < imageData.width; bx++) {
              const idx = ((blockY + by) * imageData.width + (blockX + bx)) * 4;
              const delta = diff * key.strength;
              newImageData.data[idx] = Math.max(0, Math.min(255, imageData.data[idx] + delta));
              newImageData.data[idx + 1] = Math.max(0, Math.min(255, imageData.data[idx + 1] + delta));
              newImageData.data[idx + 2] = Math.max(0, Math.min(255, imageData.data[idx + 2] + delta));
              newImageData.data[idx + 3] = imageData.data[idx + 3];
            }
          }
        }
      }
    }

    return newImageData;
  }

  static async extractWatermark(imageData: ImageData, key: WatermarkKey): Promise<{ isWatermarked: boolean; confidence: number }> {
    // Convert to grayscale matrix
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
      strength: 0.6,
      alpha: 16.0
    };
  }
}