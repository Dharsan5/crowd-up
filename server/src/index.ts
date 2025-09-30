import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import { performRuleChecks, checkUrlSafety } from './ruleEngine.js';
import { performLLMModeration } from './llmModeration.js';
import { analyzeImages } from './imageModeration.js';
import { CampaignSchema } from './types.js';
import type { Campaign } from './types.js';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// File upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
    files: 10
  },
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedTypes = (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/webp').split(',');
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// In-memory storage for demo (use database in production)
const moderationQueue: Array<{
  id: string;
  campaignId: string;
  campaign: Campaign;
  moderationResult: any;
  status: 'PENDING' | 'REVIEWED';
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}> = [];

// Main moderation endpoint
app.post('/api/moderate', upload.array('images'), async (req, res) => {
  try {
    console.log('Received moderation request');
    
    // Parse and validate campaign data
    const campaignData = JSON.parse(req.body.campaign || '{}');
    const parse = CampaignSchema.safeParse(campaignData);
    
    if (!parse.success) {
      return res.status(400).json({ 
        error: 'Invalid campaign data', 
        details: parse.error.flatten() 
      });
    }

    const campaign = parse.data;
    const uploadedFiles = req.files as Express.Multer.File[] || [];

    console.log(`Moderating campaign: "${campaign.title}"`);

    // Step 1: Rule-based checks (fast)
    const ruleResults = performRuleChecks(campaign);
    console.log(`Rule check score: ${ruleResults.score}`);

    // Step 2: URL safety checks
    const urlFindings = await checkUrlSafety(campaign.links || []);
    const urlRisk = Math.max(0, ...urlFindings.map(f => f.risk));

    // Step 3: Image analysis
    const imageResults = [];
    if (uploadedFiles.length > 0) {
      const imageData = uploadedFiles.map((file, index) => ({
        id: `img_${index}`,
        mime: file.mimetype,
        buffer: file.buffer
      }));
      
      const imageAnalysis = await analyzeImages(imageData);
      imageResults.push(...imageAnalysis.map((result, index) => ({
        imageId: `img_${index}`,
        ...result
      })));
    }

    const imageRisk = imageResults.reduce((max, result) => Math.max(max, result.score), 0);

    // Step 4: Build signals for LLM
    const signals = {
      containsPII: /upi|ifsc|account.*number|phone.*\+?\d{10}/i.test(campaign.description),
      duplicateTextScore: 0.0, // Placeholder - implement similarity check
      similarityToKnownScams: 0.0, // Placeholder - implement vector similarity
      urlReputation: urlFindings.reduce((acc, finding) => {
        acc[finding.url] = finding.reason;
        return acc;
      }, {} as Record<string, string>),
      imageOcrFindings: imageResults.filter(r => r.ocrText).map(r => r.ocrText)
    };

    // Step 5: LLM moderation
    console.log('Performing LLM moderation...');
    const llmResult = await performLLMModeration(campaign, signals);

    // Step 6: Calculate final risk score
    const risk = Math.max(
      ruleResults.score,
      urlRisk,
      imageRisk,
      ...Object.values(llmResult.scores).map(s => typeof s === 'number' ? s : 0)
    );

    // Step 7: Make final decision
    const autoApproveThreshold = parseFloat(process.env.AUTO_APPROVE_THRESHOLD || '0.3');
    const manualReviewThreshold = parseFloat(process.env.MANUAL_REVIEW_THRESHOLD || '0.6');

    let decision: 'APPROVE' | 'HOLD' | 'REJECT' = 
      risk < autoApproveThreshold ? 'APPROVE' : 
      risk < manualReviewThreshold ? 'HOLD' : 'REJECT';

    // LLM can override for explicit violations
    if (llmResult.decision === 'REJECT') decision = 'REJECT';
    if (llmResult.decision === 'HOLD' && decision === 'APPROVE') decision = 'HOLD';

    const moderationResult = {
      decision,
      risk,
      scores: llmResult.scores,
      rationale: [
        ...ruleResults.rules,
        ...llmResult.rationale,
        ...urlFindings.map(f => `URL risk: ${f.reason}`),
        ...imageResults.filter(r => r.labels.length > 0).map(r => `Image: ${r.labels.join(', ')}`)
      ],
      requiredEdits: llmResult.requiredEdits || [],
      highlightedSpans: llmResult.highlightedSpans || [],
      ruleReasons: ruleResults.rules,
      imageFindings: imageResults.map(r => ({
        imageId: r.imageId || 'unknown',
        score: r.score,
        labels: r.labels
      })),
      urlFindings
    };

    // Add to moderation queue if needs review
    if (decision === 'HOLD') {
      const queueItem = {
        id: `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        campaignId: campaign.id || 'new_campaign',
        campaign,
        moderationResult,
        status: 'PENDING' as const,
        createdAt: new Date().toISOString()
      };
      moderationQueue.push(queueItem);
      console.log(`Added to moderation queue: ${queueItem.id}`);
    }

    console.log(`Moderation complete: ${decision} (risk: ${risk.toFixed(3)})`);
    
    res.json(moderationResult);

  } catch (error) {
    console.error('Moderation error:', error);
    res.status(500).json({ 
      error: 'Moderation failed', 
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Moderation queue endpoints
app.get('/api/moderation-queue', (req, res) => {
  const pendingItems = moderationQueue
    .filter(item => item.status === 'PENDING')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  res.json(pendingItems);
});

app.post('/api/moderation-queue/:id/review', (req, res) => {
  const { id } = req.params;
  const { decision, notes, reviewerId } = req.body;

  const item = moderationQueue.find(i => i.id === id);
  if (!item) {
    return res.status(404).json({ error: 'Moderation item not found' });
  }

  if (!['APPROVE', 'REJECT'].includes(decision)) {
    return res.status(400).json({ error: 'Invalid decision' });
  }

  item.status = 'REVIEWED';
  item.reviewedBy = reviewerId;
  item.reviewedAt = new Date().toISOString();
  item.reviewNotes = notes;
  item.moderationResult.decision = decision;

  res.json({ success: true, item });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    queueSize: moderationQueue.filter(i => i.status === 'PENDING').length
  });
});

// Error handling
app.use((error: any, req: any, res: any, next: any) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🛡️  Moderation API server running on port ${PORT}`);
  console.log(`📊 Queue endpoint: http://localhost:${PORT}/api/moderation-queue`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
});

export default app;
