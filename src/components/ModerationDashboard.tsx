import { useState, useEffect } from 'react';
import {
  Badge,
  Button,
  Card,
  Container,
  Group,
  Stack,
  Text,
  Title,
  Textarea,
  Modal,
  Alert,
  ScrollArea,
  Grid,
  ActionIcon,
  Tooltip,
  LoadingOverlay
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX, IconEye, IconRefresh, IconAlertTriangle } from '@tabler/icons-react';
import { ModerationService } from '../services/moderationService';
import { ModerationFeedback } from './ModerationFeedback';
import type { IModerationQueue } from '../types';

export function ModerationDashboard() {
  const [queue, setQueue] = useState<IModerationQueue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<IModerationQueue | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [detailsOpened, { open: openDetails, close: closeDetails }] = useDisclosure(false);

  const loadQueue = async () => {
    try {
      setLoading(true);
      const data = await ModerationService.getModerationQueue();
      setQueue(data);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load moderation queue',
        color: 'red'
      });
      console.error('Failed to load queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (decision: 'APPROVE' | 'REJECT') => {
    if (!selectedItem) return;

    try {
      setReviewLoading(true);
      await ModerationService.reviewModerationItem(
        selectedItem.id,
        decision,
        reviewNotes,
        'admin' // In production, get from auth context
      );

      notifications.show({
        title: 'Success',
        message: `Campaign ${decision.toLowerCase()}d successfully`,
        color: 'green'
      });

      // Refresh queue and close modal
      await loadQueue();
      closeDetails();
      setSelectedItem(null);
      setReviewNotes('');
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to submit review',
        color: 'red'
      });
      console.error('Review failed:', error);
    } finally {
      setReviewLoading(false);
    }
  };

  const openItemDetails = (item: IModerationQueue) => {
    setSelectedItem(item);
    setReviewNotes('');
    openDetails();
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const pendingCount = queue.filter(item => item.status === 'PENDING').length;

  return (
    <Container size="xl" py="xl">
      <Stack spacing="lg">
        {/* Header */}
        <Group position="apart">
          <div>
            <Title order={2}>Content Moderation Dashboard</Title>
            <Text color="dimmed" size="sm">
              Review campaigns that require manual attention
            </Text>
          </div>
          <Group>
            <Badge variant="filled" color={pendingCount > 0 ? 'red' : 'green'}>
              {pendingCount} pending
            </Badge>
            <ActionIcon onClick={loadQueue} loading={loading}>
              <IconRefresh size={16} />
            </ActionIcon>
          </Group>
        </Group>

        {/* Queue Stats */}
        <Grid>
          <Grid.Col span={3}>
            <Card withBorder>
              <Text size="sm" color="dimmed">Total Items</Text>
              <Text size="xl" fw={700}>{queue.length}</Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={3}>
            <Card withBorder>
              <Text size="sm" color="dimmed">Pending Review</Text>
              <Text size="xl" fw={700} color="red">{pendingCount}</Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={3}>
            <Card withBorder>
              <Text size="sm" color="dimmed">Reviewed</Text>
              <Text size="xl" fw={700} color="green">
                {queue.filter(item => item.status === 'REVIEWED').length}
              </Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={3}>
            <Card withBorder>
              <Text size="sm" color="dimmed">High Risk</Text>
              <Text size="xl" fw={700} color="orange">
                {queue.filter(item => item.moderationResult.risk > 0.6).length}
              </Text>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Queue Items */}
        <Stack spacing="md">
          {loading && queue.length === 0 ? (
            <Card withBorder>
              <LoadingOverlay visible />
              <div style={{ height: 200 }} />
            </Card>
          ) : queue.length === 0 ? (
            <Alert icon={<IconCheck size={16} />} color="green">
              No items in moderation queue. All campaigns are clean! 🎉
            </Alert>
          ) : (
            queue.map((item) => (
              <Card key={item.id} withBorder shadow="sm">
                <Group position="apart" align="flex-start">
                  <div style={{ flex: 1 }}>
                    <Group spacing="xs" mb="xs">
                      <Badge
                        color={item.status === 'PENDING' ? 'red' : 'green'}
                        variant="light"
                      >
                        {item.status}
                      </Badge>
                      <Badge
                        color={
                          item.moderationResult.risk > 0.6 ? 'red' :
                          item.moderationResult.risk > 0.3 ? 'yellow' : 'green'
                        }
                        variant="outline"
                      >
                        Risk: {(item.moderationResult.risk * 100).toFixed(1)}%
                      </Badge>
                      <Badge
                        color={
                          item.moderationResult.decision === 'REJECT' ? 'red' :
                          item.moderationResult.decision === 'HOLD' ? 'yellow' : 'green'
                        }
                      >
                        {item.moderationResult.decision}
                      </Badge>
                    </Group>

                    <Title order={4} mb="xs">{item.campaign.title}</Title>
                    <Text size="sm" color="dimmed" lineClamp={2} mb="xs">
                      {item.campaign.description}
                    </Text>

                    <Group spacing="sm" mb="xs">
                      <Text size="xs" color="dimmed">
                        Goal: {typeof item.campaign.goal === 'string' 
                          ? item.campaign.goal 
                          : `₹${(item.campaign.goal as number).toLocaleString()}`}
                      </Text>
                      <Text size="xs" color="dimmed">
                        Category: {item.campaign.category}
                      </Text>
                      <Text size="xs" color="dimmed">
                        Creator: {item.campaign.createdBy}
                      </Text>
                    </Group>

                    {item.moderationResult.rationale.length > 0 && (
                      <Group spacing="xs">
                        <IconAlertTriangle size={14} color="orange" />
                        <Text size="xs" color="dimmed">
                          {item.moderationResult.rationale.slice(0, 2).join(', ')}
                          {item.moderationResult.rationale.length > 2 && '...'}
                        </Text>
                      </Group>
                    )}
                  </div>

                  <Group spacing="xs">
                    <Tooltip label="View Details">
                      <ActionIcon
                        variant="outline"
                        onClick={() => openItemDetails(item)}
                      >
                        <IconEye size={16} />
                      </ActionIcon>
                    </Tooltip>
                    
                    {item.status === 'PENDING' && (
                      <>
                        <Tooltip label="Quick Approve">
                          <ActionIcon
                            color="green"
                            onClick={() => {
                              setSelectedItem(item);
                              handleReview('APPROVE');
                            }}
                          >
                            <IconCheck size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Quick Reject">
                          <ActionIcon
                            color="red"
                            onClick={() => {
                              setSelectedItem(item);
                              handleReview('REJECT');
                            }}
                          >
                            <IconX size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </>
                    )}
                  </Group>
                </Group>
              </Card>
            ))
          )}
        </Stack>
      </Stack>

      {/* Details Modal */}
      <Modal
        opened={detailsOpened}
        onClose={closeDetails}
        title="Campaign Review"
        size="xl"
        scrollAreaComponent={ScrollArea.Autosize}
      >
        {selectedItem && (
          <Stack spacing="lg">
            {/* Campaign Info */}
            <Card withBorder>
              <Title order={4} mb="md">{selectedItem.campaign.title}</Title>
              <Text mb="md">{selectedItem.campaign.description}</Text>
              <Group>
                <Text size="sm">
                  <strong>Goal:</strong> {typeof selectedItem.campaign.goal === 'string' 
                    ? selectedItem.campaign.goal 
                    : `₹${(selectedItem.campaign.goal as number).toLocaleString()}`}
                </Text>
                <Text size="sm">
                  <strong>Category:</strong> {selectedItem.campaign.category}
                </Text>
                <Text size="sm">
                  <strong>Creator:</strong> {selectedItem.campaign.createdBy}
                </Text>
              </Group>
            </Card>

            {/* Moderation Analysis */}
            <ModerationFeedback 
              result={selectedItem.moderationResult}
              showDetails={true}
            />

            {/* Review Notes */}
            {selectedItem.status === 'PENDING' && (
              <div>
                <Text size="sm" fw={500} mb="xs">Review Notes (Optional)</Text>
                <Textarea
                  placeholder="Add notes about your decision..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.currentTarget.value)}
                  rows={3}
                />
              </div>
            )}

            {/* Action Buttons */}
            {selectedItem.status === 'PENDING' ? (
              <Group position="right">
                <Button
                  variant="outline"
                  onClick={closeDetails}
                >
                  Cancel
                </Button>
                <Button
                  color="red"
                  leftIcon={<IconX size={16} />}
                  onClick={() => handleReview('REJECT')}
                  loading={reviewLoading}
                >
                  Reject
                </Button>
                <Button
                  color="green"
                  leftIcon={<IconCheck size={16} />}
                  onClick={() => handleReview('APPROVE')}
                  loading={reviewLoading}
                >
                  Approve
                </Button>
              </Group>
            ) : (
              <Alert color="blue">
                <Text size="sm">
                  <strong>Reviewed by:</strong> {selectedItem.reviewedBy} 
                  {selectedItem.reviewedAt && ` on ${new Date(selectedItem.reviewedAt).toLocaleString()}`}
                </Text>
                {selectedItem.reviewNotes && (
                  <Text size="sm" mt="xs">
                    <strong>Notes:</strong> {selectedItem.reviewNotes}
                  </Text>
                )}
              </Alert>
            )}
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
