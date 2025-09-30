import OpenAI from 'openai';
import type { Campaign, ModerationResult } from './types.js';

// Initialize OpenAI client only if API key is provided
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

const MODERATION_SYSTEM_PROMPT = `You are a strict trust & safety reviewer for a crowdfunding platform in India. 
Analyze campaigns for policy violations and return a JSON verdict with category scores (0-1) and reasoning.
If evidence is weak, lower the score. Prefer HOLD when unsure.

POLICY CATEGORIES:

SCAM_FINANCIAL: Guaranteed returns, lotteries, crypto giveaways, MLM/pyramid schemes, get-rich-quick promises, investment "opportunities"

IMPERSONATION: Pretending to be a brand/NGO/celebrity; unverifiable identities claiming authority/endorsement

MEDICAL_CLAIMS: Medical fundraising without hospital documents, doctor letters, or verifiable medical institution info

PAYMENT_BYPASS: Asking for direct payments (UPI/crypto/bank transfer/WhatsApp/Telegram) in description or images, bypassing platform

VIOLENT_ADULT_HATE: Violence, sexual content, hate speech, illegal activities

SENSITIVE_DOCS: Images of government IDs, bank statements, account details, passports

LOW_QUALITY_SPAM: Near-empty content, copy-paste text, link spam, meaningless repetition

SCORING GUIDELINES:
- 0.0-0.2: Minor concerns or false positives
- 0.3-0.5: Moderate risk, needs human review
- 0.6-0.8: High risk, likely violation
- 0.9-1.0: Clear violation, auto-reject

DECISION LOGIC:
- APPROVE: All categories < 0.3
- HOLD: Any category 0.3-0.6, needs human review
- REJECT: Any category > 0.6

Return ONLY valid JSON matching this exact structure:
{
  "scores": {
    "SCAM_FINANCIAL": 0.0,
    "IMPERSONATION": 0.0,
    "MEDICAL_CLAIMS": 0.0,
    "PAYMENT_BYPASS": 0.0,
    "VIOLENT_ADULT_HATE": 0.0,
    "SENSITIVE_DOCS": 0.0,
    "LOW_QUALITY_SPAM": 0.0
  },
  "decision": "APPROVE|HOLD|REJECT",
  "rationale": ["Brief reason for each flagged category"],
  "requiredEdits": ["Specific actions needed to fix violations"],
  "highlightedSpans": [
    {"field": "title|description", "text": "problematic text span"}
  ]
}`;

export async function performLLMModeration(campaign: Campaign, signals: any): Promise<any> {
  // If OpenAI is not configured, return a mock response for demo purposes
  if (!openai) {
    console.log('🤖 OpenAI not configured - using mock LLM response for demo');
    return getMockLLMResponse(campaign, signals);
  }

  try {
    const payload = {
      campaign,
      signals
    };

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: MODERATION_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: JSON.stringify(payload, null, 2)
        }
      ],
      temperature: 0.1, // Low temperature for consistent results
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from LLM');
    }

    const result = JSON.parse(content);
    
    // Validate and clamp scores to 0-1 range
    for (const [key, value] of Object.entries(result.scores)) {
      if (typeof value !== 'number' || isNaN(value)) {
        result.scores[key] = 0;
      } else {
        result.scores[key] = Math.max(0, Math.min(1, value));
      }
    }

    // Ensure required fields exist
    result.rationale = result.rationale || [];
    result.requiredEdits = result.requiredEdits || [];
    result.highlightedSpans = result.highlightedSpans || [];

    // Validate decision
    if (!['APPROVE', 'HOLD', 'REJECT'].includes(result.decision)) {
      // Fallback decision based on scores
      const maxScore = Math.max(...Object.values(result.scores).map(score => 
        typeof score === 'number' ? score : 0
      ));
      result.decision = maxScore < 0.3 ? 'APPROVE' : maxScore < 0.6 ? 'HOLD' : 'REJECT';
    }

    return result;

  } catch (error) {
    console.error('LLM moderation error:', error);
    
    // Fallback response on error
    return {
      scores: {
        SCAM_FINANCIAL: 0.0,
        IMPERSONATION: 0.0,
        MEDICAL_CLAIMS: 0.0,
        PAYMENT_BYPASS: 0.0,
        VIOLENT_ADULT_HATE: 0.0,
        SENSITIVE_DOCS: 0.0,
        LOW_QUALITY_SPAM: 0.0
      },
      decision: 'HOLD', // Default to manual review on error
      rationale: ['LLM analysis failed - manual review required'],
      requiredEdits: [],
      highlightedSpans: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Optional: Batch moderation for multiple campaigns
export async function performBatchLLMModeration(campaigns: Campaign[]): Promise<any[]> {
  const results = [];
  
  // Process in batches to avoid rate limits
  for (let i = 0; i < campaigns.length; i += 5) {
    const batch = campaigns.slice(i, i + 5);
    const batchPromises = batch.map(campaign => 
      performLLMModeration(campaign, {
        containsPII: false,
        duplicateTextScore: 0.0,
        similarityToKnownScams: 0.0,
        urlReputation: {}
      })
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Small delay between batches
    if (i + 5 < campaigns.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

// Mock LLM response for demo purposes when OpenAI is not configured
function getMockLLMResponse(campaign: Campaign, signals: any) {
  const text = `${campaign.title} ${campaign.description}`.toLowerCase();
  
  // Simple rule-based mock scoring
  const scores = {
    SCAM_FINANCIAL: 0.0,
    IMPERSONATION: 0.0,
    MEDICAL_CLAIMS: 0.0,
    PAYMENT_BYPASS: 0.0,
    VIOLENT_ADULT_HATE: 0.0,
    SENSITIVE_DOCS: 0.0,
    LOW_QUALITY_SPAM: 0.0
  };

  let rationale: string[] = [];
  let requiredEdits: string[] = [];
  let highlightedSpans: Array<{field: string; text: string}> = [];

  // Check for financial scam patterns
  if (text.includes('guaranteed') || text.includes('double your money') || text.includes('investment')) {
    scores.SCAM_FINANCIAL = 0.8;
    rationale.push('Contains financial scam language (guaranteed returns)');
    requiredEdits.push('Remove promises of guaranteed returns or investment opportunities');
    highlightedSpans.push({field: 'description', text: 'guaranteed'});
  }

  // Check for payment bypass
  if (text.includes('upi') || text.includes('send money to') || text.includes('paytm')) {
    scores.PAYMENT_BYPASS = 0.9;
    rationale.push('Contains direct payment instructions bypassing platform');
    requiredEdits.push('Remove direct payment instructions - use platform payment system only');
  }

  // Check for medical claims
  if (text.includes('surgery') || text.includes('medical') || text.includes('treatment')) {
    if (!text.includes('hospital') && !text.includes('doctor')) {
      scores.MEDICAL_CLAIMS = 0.5;
      rationale.push('Medical fundraising without proper verification documents');
      requiredEdits.push('Provide hospital documents or doctor verification for medical campaigns');
    }
  }

  // Check for low quality content
  if (campaign.description.length < 50 || text.split(' ').length < 20) {
    scores.LOW_QUALITY_SPAM = 0.4;
    rationale.push('Content appears to be low quality or too brief');
    requiredEdits.push('Provide more detailed description of your campaign');
  }

  // Determine decision based on highest score
  const maxScore = Math.max(...Object.values(scores));
  const decision = maxScore < 0.3 ? 'APPROVE' : maxScore < 0.6 ? 'HOLD' : 'REJECT';

  return {
    scores,
    decision,
    rationale,
    requiredEdits,
    highlightedSpans
  };
}
