import { useState, useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { ModerationService } from '../services/moderationService';
import type { IModerationResult, ICampaign, ICampaignCreator } from '../types';

interface UseModerationOptions {
  onApprove?: (result: IModerationResult) => void;
  onHold?: (result: IModerationResult) => void;
  onReject?: (result: IModerationResult) => void;
  showNotifications?: boolean;
}

export function useModeration(options: UseModerationOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IModerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    onApprove,
    onHold,
    onReject,
    showNotifications = true
  } = options;

  const moderateCampaign = useCallback(async (
    campaign: Partial<ICampaign>,
    creator: Partial<ICampaignCreator>,
    imageFiles?: File[]
  ) => {
    try {
      setLoading(true);
      setError(null);

      const request = ModerationService.createModerationRequest(
        campaign,
        creator,
        imageFiles
      );

      const moderationResult = await ModerationService.moderateCampaign(request);
      setResult(moderationResult);

      // Show notification based on result
      if (showNotifications) {
        const message = ModerationService.getModerationMessage(moderationResult);
        notifications.show({
          title: message.title,
          message: message.message,
          color: message.type === 'success' ? 'green' : 
                 message.type === 'warning' ? 'yellow' : 'red',
          autoClose: message.type === 'success' ? 5000 : false
        });
      }

      // Call appropriate callback
      switch (moderationResult.decision) {
        case 'APPROVE':
          onApprove?.(moderationResult);
          break;
        case 'HOLD':
          onHold?.(moderationResult);
          break;
        case 'REJECT':
          onReject?.(moderationResult);
          break;
      }

      return moderationResult;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Moderation failed';
      setError(errorMessage);

      if (showNotifications) {
        notifications.show({
          title: 'Moderation Error',
          message: errorMessage,
          color: 'red'
        });
      }

      throw err;
    } finally {
      setLoading(false);
    }
  }, [onApprove, onHold, onReject, showNotifications]);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const checkServiceHealth = useCallback(async () => {
    try {
      const health = await ModerationService.checkServiceHealth();
      return health?.status === 'ok';
    } catch {
      return false;
    }
  }, []);

  return {
    moderateCampaign,
    loading,
    result,
    error,
    clearResult,
    checkServiceHealth,
    // Helper methods
    isApproved: result?.decision === 'APPROVE',
    isHeld: result?.decision === 'HOLD',
    isRejected: result?.decision === 'REJECT',
    riskScore: result?.risk || 0,
    hasHighRisk: (result?.risk || 0) > 0.6
  };
}

// Hook for moderation queue management
export function useModerationQueue() {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ModerationService.getModerationQueue();
      setQueue(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load queue';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reviewItem = useCallback(async (
    itemId: string,
    decision: 'APPROVE' | 'REJECT',
    notes?: string,
    reviewerId?: string
  ) => {
    try {
      const result = await ModerationService.reviewModerationItem(
        itemId,
        decision,
        notes,
        reviewerId
      );
      
      // Update local queue
      await loadQueue();
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Review failed';
      setError(errorMessage);
      throw err;
    }
  }, [loadQueue]);

  return {
    queue,
    loading,
    error,
    loadQueue,
    reviewItem,
    // Computed values
    pendingCount: queue.filter(item => item.status === 'PENDING').length,
    reviewedCount: queue.filter(item => item.status === 'REVIEWED').length,
    highRiskCount: queue.filter(item => item.moderationResult?.risk > 0.6).length
  };
}
