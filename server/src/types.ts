import { z } from 'zod';

// Campaign schema for moderation
export const CampaignSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3).max(200),
  description: z.string().min(20).max(5000),
  goal: z.number().int().positive(),
  category: z.string().min(1),
  links: z.array(z.string().url()).default([]),
  images: z.array(z.object({
    id: z.string(),
    mime: z.string(),
    url: z.string().url().optional(),
    ocrText: z.string().optional()
  })).default([]),
  creator: z.object({
    displayName: z.string().min(1),
    accountAgeDays: z.number().int().nonnegative(),
    pastCampaigns: z.number().int().nonnegative(),
    verifiedEmail: z.boolean(),
    verifiedIdentity: z.boolean(),
    userId: z.string(),
    profileImage: z.string().url().optional()
  })
});

// Moderation result schema
export const ModerationResultSchema = z.object({
  decision: z.enum(['APPROVE', 'HOLD', 'REJECT']),
  risk: z.number().min(0).max(1),
  scores: z.object({
    SCAM_FINANCIAL: z.number().min(0).max(1),
    IMPERSONATION: z.number().min(0).max(1),
    MEDICAL_CLAIMS: z.number().min(0).max(1),
    PAYMENT_BYPASS: z.number().min(0).max(1),
    VIOLENT_ADULT_HATE: z.number().min(0).max(1),
    SENSITIVE_DOCS: z.number().min(0).max(1),
    LOW_QUALITY_SPAM: z.number().min(0).max(1)
  }),
  rationale: z.array(z.string()),
  requiredEdits: z.array(z.string()),
  highlightedSpans: z.array(z.object({
    field: z.string(),
    text: z.string(),
    start: z.number().optional(),
    end: z.number().optional()
  }))
});

export type Campaign = z.infer<typeof CampaignSchema>;
export type ModerationResult = z.infer<typeof ModerationResultSchema>;

// Image moderation result
export interface ImageModerationResult {
  score: number;
  labels: string[];
  ocrText?: string;
}
