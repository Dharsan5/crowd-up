import type { IModerationResult, ICampaign, ICampaignCreator } from '../types';

const API_BASE_URL = import.meta.env.VITE_MODERATION_API_URL || 'http://localhost:3001/api';

export interface ModerationRequest {
  campaign: {
    id?: string;
    title: string;
    description: string;
    goal: number;
    category: string;
    links?: string[];
    images?: Array<{
      id: string;
      mime: string;
      url?: string;
    }>;
    creator: ICampaignCreator;
  };
  imageFiles?: File[];
}

export class ModerationService {
  
  static async moderateCampaign(request: ModerationRequest): Promise<IModerationResult> {
    const formData = new FormData();
    
    // Add campaign data
    formData.append('campaign', JSON.stringify(request.campaign));
    
    // Add image files if present
    if (request.imageFiles) {
      request.imageFiles.forEach((file, index) => {
        formData.append('images', file);
      });
    }

    try {
      const response = await fetch(`${API_BASE_URL}/moderate`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type - let browser set it with boundary for multipart
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result as IModerationResult;
      
    } catch (error) {
      console.error('Moderation request failed:', error);
      throw new Error(
        error instanceof Error 
          ? `Moderation failed: ${error.message}`
          : 'Moderation service unavailable'
      );
    }
  }

  static async getModerationQueue() {
    try {
      const response = await fetch(`${API_BASE_URL}/moderation-queue`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch moderation queue: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch moderation queue:', error);
      throw error;
    }
  }

  static async reviewModerationItem(itemId: string, decision: 'APPROVE' | 'REJECT', notes?: string, reviewerId?: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/moderation-queue/${itemId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          decision,
          notes,
          reviewerId: reviewerId || 'anonymous'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Review failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Review submission failed:', error);
      throw error;
    }
  }

  static async checkServiceHealth() {
    try {
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('Health check failed:', error);
      return null;
    }
  }

  // Helper method to extract creator info from campaign data
  static createModerationRequest(
    campaign: Partial<ICampaign>,
    creatorInfo: Partial<ICampaignCreator>,
    imageFiles?: File[]
  ): ModerationRequest {
    return {
      campaign: {
        id: campaign.id,
        title: campaign.title || '',
        description: campaign.description || '',
        goal: typeof campaign.goal === 'string' 
          ? parseFloat(campaign.goal.replace(/[^0-9.]/g, '')) 
          : campaign.goal || 0,
        category: campaign.category || '',
        links: [], // Extract from description if needed
        creator: {
          displayName: creatorInfo.displayName || 'Anonymous',
          accountAgeDays: creatorInfo.accountAgeDays || 0,
          pastCampaigns: creatorInfo.pastCampaigns || 0,
          verifiedEmail: creatorInfo.verifiedEmail || false,
          verifiedIdentity: creatorInfo.verifiedIdentity || false,
          userId: creatorInfo.userId || 'unknown',
          profileImage: creatorInfo.profileImage
        }
      },
      imageFiles
    };
  }

  // Helper to determine display message based on moderation result
  static getModerationMessage(result: IModerationResult): {
    type: 'success' | 'warning' | 'error';
    title: string;
    message: string;
    canEdit: boolean;
  } {
    switch (result.decision) {
      case 'APPROVE':
        return {
          type: 'success',
          title: 'Campaign Approved',
          message: 'Your campaign meets our community guidelines and is ready to go live.',
          canEdit: false
        };
      
      case 'HOLD':
        return {
          type: 'warning',
          title: 'Manual Review Required',
          message: 'Your campaign needs manual review. This typically takes 24-48 hours.',
          canEdit: true
        };
      
      case 'REJECT':
        return {
          type: 'error',
          title: 'Campaign Rejected',
          message: 'Your campaign violates our guidelines. Please review the feedback and try again.',
          canEdit: true
        };
      
      default:
        return {
          type: 'warning',
          title: 'Processing',
          message: 'Your campaign is being processed.',
          canEdit: false
        };
    }
  }
}
