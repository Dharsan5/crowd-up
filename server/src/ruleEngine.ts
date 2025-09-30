import type { Campaign } from './types.js';

// Deterministic rule-based checks (fast and cheap)
export function performRuleChecks(campaign: Campaign) {
  const rules: string[] = [];
  let score = 0;

  const text = `${campaign.title}\n${campaign.description}`.toLowerCase();

  // Financial scam patterns
  const bannedFinancialPhrases = [
    'guaranteed returns', 'double your money', 'send crypto to',
    'limited time giveaway', 'multi level marketing', 'mlm',
    'pyramid scheme', 'get rich quick', 'investment opportunity',
    'financial freedom', 'passive income guaranteed', 'no risk investment'
  ];

  if (bannedFinancialPhrases.some(phrase => text.includes(phrase))) {
    score = Math.max(score, 0.7);
    rules.push('Detected financial scam language (guaranteed returns, MLM, etc.)');
  }

  // Payment bypass detection
  const paymentBypassRegex = /(upi|paytm|gpay|phonepe|bitcoin|btc|eth|wallet|ifsc|account number|a\/c|bank transfer|direct payment|whatsapp|telegram|phone:\s*\+?\d+)/i;
  const imageOcrText = campaign.images.map(img => img.ocrText || '').join(' ');
  
  if (paymentBypassRegex.test(text) || paymentBypassRegex.test(imageOcrText)) {
    score = Math.max(score, 0.9);
    rules.push('Direct payment instructions found (bypassing platform fees)');
  }

  // Medical claims without verification
  const medicalKeywords = ['surgery', 'treatment', 'hospital', 'medical', 'cancer', 'tumor', 'disease'];
  const hasVerificationDocs = /hospital.*letter|doctor.*certificate|medical.*report/i.test(text);
  
  if (medicalKeywords.some(keyword => text.includes(keyword)) && !hasVerificationDocs) {
    score = Math.max(score, 0.4);
    rules.push('Medical fundraising without verification documents');
  }

  // New account with high goal (suspicious)
  if (campaign.creator.accountAgeDays < 3 && campaign.goal > 200000) {
    score = Math.max(score, 0.4);
    rules.push('New account (<3 days) requesting high amount (>₹200k)');
  }

  // Unverified account with high goal
  if (!campaign.creator.verifiedEmail && campaign.goal > 100000) {
    score = Math.max(score, 0.3);
    rules.push('Unverified email with high goal amount');
  }

  // Duplicate/spam content detection (simple)
  const duplicatePatterns = [
    /(.{10,})\1{2,}/g, // Repeated text patterns
    /^(.+)$\n^\1$/gm  // Exact duplicate lines
  ];

  if (duplicatePatterns.some(pattern => pattern.test(text))) {
    score = Math.max(score, 0.3);
    rules.push('Potential duplicate or spam content detected');
  }

  // Low quality indicators
  const wordCount = text.split(/\s+/).length;
  const uniqueWords = new Set(text.toLowerCase().split(/\s+/)).size;
  const uniqueRatio = uniqueWords / wordCount;

  if (wordCount < 50 || uniqueRatio < 0.6) {
    score = Math.max(score, 0.2);
    rules.push('Low quality content (too short or repetitive)');
  }

  // Impersonation indicators
  const impersonationKeywords = [
    'official', 'endorsed by', 'sponsored by', 'on behalf of',
    'government approved', 'celebrity', 'famous person'
  ];

  if (impersonationKeywords.some(keyword => text.includes(keyword)) && !campaign.creator.verifiedIdentity) {
    score = Math.max(score, 0.5);
    rules.push('Potential impersonation without identity verification');
  }

  // Urgency/pressure tactics
  const urgencyPhrases = [
    'limited time', 'act now', 'hurry', 'urgent', 'emergency',
    'will expire', 'last chance', 'today only'
  ];

  if (urgencyPhrases.some(phrase => text.includes(phrase))) {
    score = Math.max(score, 0.3);
    rules.push('High-pressure urgency tactics detected');
  }

  return { score, rules };
}

// URL safety checks
export async function checkUrlSafety(urls: string[]) {
  const findings: Array<{ url: string; risk: number; reason: string }> = [];

  for (const url of urls) {
    try {
      const urlObj = new URL(url);
      
      // Check for URL shorteners
      const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly'];
      if (shorteners.some(shortener => urlObj.hostname.includes(shortener))) {
        findings.push({
          url,
          risk: 0.4,
          reason: 'URL shortener detected - potential redirect hiding'
        });
      }

      // Check for suspicious TLDs
      const suspiciousTlds = ['.tk', '.ml', '.ga', '.cf', '.click', '.download'];
      if (suspiciousTlds.some(tld => urlObj.hostname.endsWith(tld))) {
        findings.push({
          url,
          risk: 0.5,
          reason: 'Suspicious top-level domain'
        });
      }

      // Check for IP addresses instead of domains
      if (/^\d+\.\d+\.\d+\.\d+/.test(urlObj.hostname)) {
        findings.push({
          url,
          risk: 0.6,
          reason: 'Direct IP address instead of domain name'
        });
      }

    } catch (error) {
      findings.push({
        url,
        risk: 0.3,
        reason: 'Malformed URL'
      });
    }
  }

  return findings;
}
