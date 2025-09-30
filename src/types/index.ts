export interface ICampaign {
    id: string
    title: string
    description: string
    createdAt: string
    mainImage: string
    createdBy: string
    daysLeft: number
    amountRaised: string
    goal: string
    contributors: number
    createdByImage: string
    category: string
    country: string
    type: string | null
    moderationStatus?: 'PENDING' | 'APPROVED' | 'HOLD' | 'REJECTED'
    moderationRisk?: number
    moderationReasons?: string[]
}

export interface ITestimonial {
    id: string
    testimonial: string
    createdBy: string
    createdByImage: string
    company: string
    jobPosition: string
}

// Moderation types
export interface IModerationResult {
    decision: 'APPROVE' | 'HOLD' | 'REJECT'
    risk: number
    scores: {
        SCAM_FINANCIAL: number
        IMPERSONATION: number
        MEDICAL_CLAIMS: number
        PAYMENT_BYPASS: number
        VIOLENT_ADULT_HATE: number
        SENSITIVE_DOCS: number
        LOW_QUALITY_SPAM: number
    }
    rationale: string[]
    requiredEdits: string[]
    highlightedSpans: Array<{
        field: string
        text: string
        start?: number
        end?: number
    }>
    ruleReasons: string[]
    imageFindings: Array<{
        imageId: string
        score: number
        labels: string[]
    }>
}

export interface ICampaignImage {
    id: string
    mime: string
    url?: string
    ocrText?: string
    moderationScore?: number
    moderationLabels?: string[]
}

export interface ICampaignCreator {
    displayName: string
    accountAgeDays: number
    pastCampaigns: number
    verifiedEmail: boolean
    verifiedIdentity: boolean
    userId: string
    profileImage?: string
}

export interface IModerationQueue {
    id: string
    campaignId: string
    campaign: ICampaign
    moderationResult: IModerationResult
    status: 'PENDING' | 'REVIEWED'
    reviewedBy?: string
    reviewedAt?: string
    reviewNotes?: string
    createdAt: string
}

export interface ICountry {
    name: string
    code: string
    emoji: string
    unicode: string
    image: string
}

export interface ICurrency {
    cc: string
    symbol: string
    name: string
}
