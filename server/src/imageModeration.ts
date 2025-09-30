import { createWorker } from 'tesseract.js';
import type { ImageModerationResult } from './types.js';

// Image moderation using vision models (placeholder for actual implementation)
export async function moderateImage(image: {
  id: string;
  mime: string;
  url?: string;
  buffer?: Buffer;
}): Promise<ImageModerationResult> {
  try {
    const labels: string[] = [];
    let score = 0;

    // Basic MIME type checks
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(image.mime)) {
      return {
        score: 0.3,
        labels: ['unsupported_format']
      };
    }

    // Size-based risk (if we have the buffer)
    if (image.buffer && image.buffer.length > 10 * 1024 * 1024) { // 10MB
      labels.push('large_file_size');
      score = Math.max(score, 0.2);
    }

    // Placeholder for actual image moderation
    // In production, you'd integrate with:
    // - OpenAI Vision API
    // - Google Cloud Vision API
    // - AWS Rekognition
    // - Azure Computer Vision
    
    // For now, return safe default
    return {
      score,
      labels,
      ocrText: undefined // Will be filled by OCR if needed
    };

  } catch (error) {
    console.error('Image moderation error:', error);
    return {
      score: 0.1, // Low risk on error
      labels: ['moderation_error']
    };
  }
}

// OCR text extraction from images
export async function extractTextFromImage(imageBuffer: Buffer): Promise<string> {
  let worker: any = null;
  
  try {
    worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize(imageBuffer);
    return text.trim();
  } catch (error) {
    console.error('OCR error:', error);
    return '';
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
}

// Combined image analysis
export async function analyzeImage(image: {
  id: string;
  mime: string;
  buffer: Buffer;
}): Promise<ImageModerationResult> {
  // Get moderation result
  const moderationResult = await moderateImage(image);
  
  // Extract text via OCR
  const ocrText = await extractTextFromImage(image.buffer);
  
  // Additional risk based on OCR content
  if (ocrText) {
    const riskyPatterns = [
      /upi.*id|paytm|gpay|phonepe/i,
      /account.*number|ifsc|bank/i,
      /bitcoin|btc|crypto|wallet/i,
      /whatsapp|telegram/i,
      /guaranteed.*return|double.*money/i
    ];

    const hasRiskyText = riskyPatterns.some(pattern => pattern.test(ocrText));
    if (hasRiskyText) {
      moderationResult.score = Math.max(moderationResult.score, 0.7);
      moderationResult.labels.push('risky_text_in_image');
    }
  }

  return {
    ...moderationResult,
    ocrText
  };
}

// Batch image processing
export async function analyzeImages(images: Array<{
  id: string;
  mime: string;
  buffer: Buffer;
}>): Promise<ImageModerationResult[]> {
  const results = [];
  
  // Process images sequentially to avoid memory issues
  for (const image of images) {
    const result = await analyzeImage(image);
    results.push(result);
  }
  
  return results;
}
