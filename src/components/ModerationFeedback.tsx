import { Alert, Badge, Box, Button, Card, Group, List, Stack, Text, Title, Accordion, Code } from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconEdit, IconX } from '@tabler/icons-react';
import type { IModerationResult } from '../types';

interface ModerationFeedbackProps {
  result: IModerationResult;
  onEdit?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
}

export function ModerationFeedback({ 
  result, 
  onEdit, 
  onDismiss, 
  showDetails = true 
}: ModerationFeedbackProps) {
  const getStatusColor = (decision: string) => {
    switch (decision) {
      case 'APPROVE': return 'green';
      case 'HOLD': return 'yellow';
      case 'REJECT': return 'red';
      default: return 'gray';
    }
  };

  const getStatusIcon = (decision: string) => {
    switch (decision) {
      case 'APPROVE': return <IconCheck size={16} />;
      case 'HOLD': return <IconAlertTriangle size={16} />;
      case 'REJECT': return <IconX size={16} />;
      default: return null;
    }
  };

  const hasHighRiskCategories = Object.entries(result.scores).some(
    ([_, score]) => score > 0.6
  );

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack spacing="md">
        {/* Status Header */}
        <Group position="apart" align="center">
          <Group>
            <Badge 
              color={getStatusColor(result.decision)} 
              leftSection={getStatusIcon(result.decision)}
              size="lg"
              variant="light"
            >
              {result.decision}
            </Badge>
            <Text size="sm" color="dimmed">
              Risk Score: {(result.risk * 100).toFixed(1)}%
            </Text>
          </Group>
          
          {onDismiss && (
            <Button variant="subtle" size="xs" onClick={onDismiss}>
              Dismiss
            </Button>
          )}
        </Group>

        {/* Main Alert */}
        <Alert 
          color={getStatusColor(result.decision)}
          title={
            result.decision === 'APPROVE' ? 'Campaign Approved' :
            result.decision === 'HOLD' ? 'Manual Review Required' :
            'Campaign Rejected'
          }
          icon={getStatusIcon(result.decision)}
        >
          {result.decision === 'APPROVE' && 
            'Your campaign meets our community guidelines and is ready to go live.'
          }
          {result.decision === 'HOLD' && 
            'Your campaign needs human review. This typically takes 24-48 hours. You\'ll be notified via email once reviewed.'
          }
          {result.decision === 'REJECT' && 
            'Your campaign violates our community guidelines. Please address the issues below and resubmit.'
          }
        </Alert>

        {/* Issues Found */}
        {result.rationale.length > 0 && (
          <Box>
            <Title order={5} mb="xs">Issues Found:</Title>
            <List spacing="xs" size="sm">
              {result.rationale.map((reason, index) => (
                <List.Item key={index}>{reason}</List.Item>
              ))}
            </List>
          </Box>
        )}

        {/* Required Edits */}
        {result.requiredEdits.length > 0 && (
          <Box>
            <Title order={5} mb="xs">Required Changes:</Title>
            <List spacing="xs" size="sm" type="ordered">
              {result.requiredEdits.map((edit, index) => (
                <List.Item key={index}>
                  <Text>{edit}</Text>
                </List.Item>
              ))}
            </List>
          </Box>
        )}

        {/* Highlighted Problematic Text */}
        {result.highlightedSpans.length > 0 && (
          <Box>
            <Title order={5} mb="xs">Problematic Content:</Title>
            <Stack spacing="xs">
              {result.highlightedSpans.map((span, index) => (
                <Group key={index} spacing="xs">
                  <Badge size="xs" variant="outline">
                    {span.field}
                  </Badge>
                  <Code color="red">{span.text}</Code>
                </Group>
              ))}
            </Stack>
          </Box>
        )}

        {/* Detailed Scores - Only show if requested and has issues */}
        {showDetails && hasHighRiskCategories && (
          <Accordion variant="contained">
            <Accordion.Item value="scores">
              <Accordion.Control>
                <Text size="sm" fw={500}>Detailed Risk Analysis</Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack spacing="xs">
                  {Object.entries(result.scores).map(([category, score]) => (
                    <Group key={category} position="apart">
                      <Text size="sm" transform="capitalize">
                        {category.toLowerCase().replace(/_/g, ' ')}
                      </Text>
                      <Group spacing="xs">
                        <Badge 
                          color={score > 0.6 ? 'red' : score > 0.3 ? 'yellow' : 'green'}
                          variant="light"
                          size="sm"
                        >
                          {(score * 100).toFixed(0)}%
                        </Badge>
                      </Group>
                    </Group>
                  ))}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            {/* Image Findings */}
            {result.imageFindings && result.imageFindings.length > 0 && (
              <Accordion.Item value="images">
                <Accordion.Control>
                  <Text size="sm" fw={500}>Image Analysis</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack spacing="xs">
                    {result.imageFindings.map((finding) => (
                      <Group key={finding.imageId} position="apart">
                        <Text size="sm">{finding.imageId}</Text>
                        <Group spacing="xs">
                          <Badge 
                            color={finding.score > 0.6 ? 'red' : finding.score > 0.3 ? 'yellow' : 'green'}
                            size="sm"
                          >
                            {(finding.score * 100).toFixed(0)}%
                          </Badge>
                          {finding.labels.length > 0 && (
                            <Text size="xs" color="dimmed">
                              {finding.labels.join(', ')}
                            </Text>
                          )}
                        </Group>
                      </Group>
                    ))}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            )}
          </Accordion>
        )}

        {/* Action Buttons */}
        {(result.decision === 'REJECT' || result.decision === 'HOLD') && onEdit && (
          <Group position="right">
            <Button 
              leftIcon={<IconEdit size={16} />}
              onClick={onEdit}
              variant="outline"
            >
              Edit Campaign
            </Button>
          </Group>
        )}
      </Stack>
    </Card>
  );
}
