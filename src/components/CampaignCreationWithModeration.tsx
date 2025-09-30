import { useState } from 'react';
import {
  Button,
  Card,
  Container,
  Group,
  Stack,
  TextInput,
  Textarea,
  NumberInput,
  Select,
  Alert,
  LoadingOverlay,
  Title,
  Text
} from '@mantine/core';
import { useForm } from '@mantine/form';
import FileDropzone from './FileDropzone';
import { ModerationFeedback } from './ModerationFeedback';
import { useModeration } from '../hooks/useModeration';
import { IconAlertTriangle, IconCheck } from '@tabler/icons-react';
import type { ICampaignCreator } from '../types';

interface CampaignFormData {
  title: string;
  description: string;
  goal: number;
  category: string;
}

interface CampaignCreationWithModerationProps {
  onSuccess?: (campaignData: any) => void;
  onCancel?: () => void;
}

export function CampaignCreationWithModeration({ 
  onSuccess, 
  onCancel 
}: CampaignCreationWithModerationProps) {
  const [submitted, setSubmitted] = useState(false);

  // Mock creator data - in real app, get from auth context
  const mockCreator: ICampaignCreator = {
    displayName: 'John Doe',
    accountAgeDays: 30,
    pastCampaigns: 2,
    verifiedEmail: true,
    verifiedIdentity: false,
    userId: 'user_123',
    profileImage: 'https://via.placeholder.com/150'
  };

  const form = useForm<CampaignFormData>({
    initialValues: {
      title: '',
      description: '',
      goal: 0,
      category: ''
    },
    validate: {
      title: (value) => value.length < 3 ? 'Title must be at least 3 characters' : null,
      description: (value) => value.length < 20 ? 'Description must be at least 20 characters' : null,
      goal: (value) => value <= 0 ? 'Goal must be greater than 0' : null,
      category: (value) => !value ? 'Please select a category' : null
    }
  });

  const moderation = useModeration({
    onApprove: (result) => {
      console.log('Campaign approved!', result);
      // In real app, save campaign and redirect
      onSuccess?.({ ...form.values, moderationResult: result });
    },
    onHold: (result) => {
      console.log('Campaign held for review', result);
      // Show user that their campaign is under review
    },
    onReject: (result) => {
      console.log('Campaign rejected', result);
      // User can edit and resubmit
    }
  });

  const handleSubmit = async (values: CampaignFormData) => {
    setSubmitted(true);
    
    try {
      await moderation.moderateCampaign(
        {
          title: values.title,
          description: values.description,
          goal: values.goal.toString(),
          category: values.category
        },
        mockCreator,
        [] // No image files for now - can be enhanced later
      );
    } catch (error) {
      console.error('Moderation failed:', error);
      setSubmitted(false);
    }
  };

  const categories = [
    'Medical',
    'Education',
    'Community',
    'Emergency',
    'Film & Videos',
    'Technology',
    'Sports',
    'Art & Creative',
    'Environment',
    'Other'
  ];

  const canEdit = !moderation.loading && (
    !moderation.result || 
    moderation.result.decision === 'REJECT' || 
    moderation.result.decision === 'HOLD'
  );

  return (
    <Container size="md" py="xl">
      <Stack spacing="lg">
        <div>
          <Title order={2}>Create New Campaign</Title>
          <Text color="dimmed" size="sm">
            All campaigns are automatically reviewed for safety and compliance
          </Text>
        </div>

        <Card withBorder shadow="sm" pos="relative">
          <LoadingOverlay visible={moderation.loading} />
          
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack spacing="md">
              <TextInput
                label="Campaign Title"
                placeholder="Give your campaign a compelling title"
                required
                disabled={!canEdit}
                {...form.getInputProps('title')}
              />

              <Textarea
                label="Description"
                placeholder="Describe your campaign, why you need funds, and how they'll be used..."
                minRows={4}
                required
                disabled={!canEdit}
                {...form.getInputProps('description')}
              />

              <Group grow>
                <NumberInput
                  label="Funding Goal"
                  placeholder="0"
                  min={0}
                  step={1000}
                  parser={(value) => value?.replace(/₹\s?|(,*)/g, '')}
                  formatter={(value) =>
                    !Number.isNaN(parseFloat(value || ''))
                      ? `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                      : '₹ '
                  }
                  required
                  disabled={!canEdit}
                  {...form.getInputProps('goal')}
                />

                <Select
                  label="Category"
                  placeholder="Select category"
                  data={categories}
                  required
                  disabled={!canEdit}
                  {...form.getInputProps('category')}
                />
              </Group>

              <div>
                <FileDropzone
                  label="Campaign Images"
                  description="Upload up to 5 images for your campaign"
                  multiple
                />
                <Text size="xs" color="dimmed" mt="xs">
                  Note: Image moderation will analyze uploaded content
                </Text>
              </div>

              {/* Safety Notice */}
              <Alert icon={<IconAlertTriangle size={16} />} color="blue" variant="light">
                <Text size="sm" fw={500} mb="xs">Content Guidelines</Text>
                <Text size="xs">
                  • No guaranteed returns or investment promises<br/>
                  • Use only platform payments (no direct UPI/bank transfers)<br/>
                  • Provide verification documents for medical campaigns<br/>
                  • Be truthful and don't impersonate others
                </Text>
              </Alert>

              <Group position="right">
                {onCancel && (
                  <Button variant="outline" onClick={onCancel} disabled={moderation.loading}>
                    Cancel
                  </Button>
                )}
                <Button 
                  type="submit" 
                  loading={moderation.loading}
                  disabled={!canEdit && !moderation.loading}
                >
                  {moderation.loading ? 'Reviewing Campaign...' : 'Create Campaign'}
                </Button>
              </Group>
            </Stack>
          </form>
        </Card>

        {/* Moderation Result */}
        {moderation.result && (
          <ModerationFeedback
            result={moderation.result}
            onEdit={() => {
              setSubmitted(false);
              moderation.clearResult();
            }}
            showDetails={true}
          />
        )}

        {/* Success State */}
        {moderation.isApproved && submitted && (
          <Alert icon={<IconCheck size={16} />} color="green">
            <Text fw={500} mb="xs">Campaign Created Successfully!</Text>
            <Text size="sm">
              Your campaign has been approved and is now live. You can share it with potential donors.
            </Text>
          </Alert>
        )}

        {/* Service Health Warning */}
        <Alert color="orange" variant="light" style={{ marginTop: 'auto' }}>
          <Text size="xs">
            <strong>Note:</strong> This is a demo of the moderation system. 
            In production, ensure the moderation API server is running on port 3001.
          </Text>
        </Alert>
      </Stack>
    </Container>
  );
}
