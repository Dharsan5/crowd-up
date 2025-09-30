import { useState } from 'react';
import { Container, Tabs, Title, Text, Alert, Button, Group } from '@mantine/core';
import { IconShield, IconDashboard, IconPlus, IconInfoCircle } from '@tabler/icons-react';
import { ModerationDashboard } from '../components/ModerationDashboard';
import { CampaignCreationWithModeration } from '../components/CampaignCreationWithModeration';
import { ModerationService } from '../services/moderationService';

export default function ModerationDemo() {
  const [activeTab, setActiveTab] = useState<string | null>('create');
  const [serviceHealth, setServiceHealth] = useState<any>(null);

  const checkHealth = async () => {
    const health = await ModerationService.checkServiceHealth();
    setServiceHealth(health);
  };

  return (
    <Container size="xl" py="xl">
      <div style={{ marginBottom: '2rem' }}>
        <Title order={1} mb="xs">
          🛡️ Moderation System Demo
        </Title>
        <Text color="dimmed" size="lg">
          Production-ready LLM-powered fraud detection and content moderation
        </Text>
        
        <Group mt="md">
          <Button 
            variant="outline" 
            leftIcon={<IconInfoCircle size={16} />}
            onClick={checkHealth}
          >
            Check Service Health
          </Button>
        </Group>

        {serviceHealth && (
          <Alert 
            color={serviceHealth.status === 'ok' ? 'green' : 'red'} 
            mt="md"
          >
            <Text size="sm">
              <strong>Service Status:</strong> {serviceHealth.status === 'ok' ? 'Healthy' : 'Unavailable'}
              {serviceHealth.queueSize !== undefined && (
                <> | Queue Size: {serviceHealth.queueSize}</>
              )}
            </Text>
          </Alert>
        )}
      </div>

      <Tabs value={activeTab} onTabChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="create" icon={<IconPlus size={16} />}>
            Create Campaign (with Moderation)
          </Tabs.Tab>
          <Tabs.Tab value="dashboard" icon={<IconDashboard size={16} />}>
            Moderation Dashboard
          </Tabs.Tab>
          <Tabs.Tab value="info" icon={<IconShield size={16} />}>
            System Info
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="create" pt="lg">
          <CampaignCreationWithModeration 
            onSuccess={(data) => {
              console.log('Campaign created successfully:', data);
              // In real app, redirect to campaign page
            }}
          />
        </Tabs.Panel>

        <Tabs.Panel value="dashboard" pt="lg">
          <ModerationDashboard />
        </Tabs.Panel>

        <Tabs.Panel value="info" pt="lg">
          <div style={{ maxWidth: '800px' }}>
            <Title order={3} mb="lg">How It Works</Title>
            
            <Alert color="blue" mb="lg">
              <Text size="sm" fw={500} mb="xs">🚀 Quick Start</Text>
              <Text size="sm">
                1. Start the backend server: <code>cd server && npm run dev</code><br/>
                2. Set your OpenAI API key in <code>server/.env</code><br/>
                3. Try creating a campaign above to see moderation in action!
              </Text>
            </Alert>

            <Title order={4} mb="md">Detection Categories</Title>
            <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
              {[
                { 
                  title: '🚨 Financial Scams', 
                  desc: 'Guaranteed returns, MLM schemes, crypto giveaways' 
                },
                { 
                  title: '💳 Payment Bypass', 
                  desc: 'Direct UPI/bank transfer instructions (bypassing platform)' 
                },
                { 
                  title: '👤 Impersonation', 
                  desc: 'Fake celebrities, brands, or organizations' 
                },
                { 
                  title: '🏥 Medical Claims', 
                  desc: 'Medical fundraising without proper documentation' 
                },
                { 
                  title: '🔞 Content Safety', 
                  desc: 'Violence, adult content, hate speech' 
                },
                { 
                  title: '📄 Document Fraud', 
                  desc: 'Sensitive IDs, bank statements in images' 
                },
                { 
                  title: '🤖 Spam/Low Quality', 
                  desc: 'Duplicate content, meaningless text, link farms' 
                }
              ].map((item, index) => (
                <Alert key={index} variant="light">
                  <Text size="sm" fw={500}>{item.title}</Text>
                  <Text size="xs" color="dimmed">{item.desc}</Text>
                </Alert>
              ))}
            </div>

            <Title order={4} mb="md">Risk Thresholds</Title>
            <Alert color="green" mb="xs">
              <Text size="sm"><strong>&lt; 30%:</strong> Auto-approve ✅</Text>
            </Alert>
            <Alert color="yellow" mb="xs">
              <Text size="sm"><strong>30-60%:</strong> Manual review required ⏳</Text>
            </Alert>
            <Alert color="red" mb="lg">
              <Text size="sm"><strong>&gt; 60%:</strong> Auto-reject ❌</Text>
            </Alert>

            <Title order={4} mb="md">Test Examples</Title>
            <Alert color="blue" variant="light">
              <Text size="sm" fw={500} mb="xs">Try these test cases:</Text>
              <Text size="xs" mb="xs">
                <strong>Should be approved:</strong> "Help rebuild our local school library after flood damage"
              </Text>
              <Text size="xs" mb="xs">
                <strong>Should be rejected:</strong> "Guaranteed returns! Send money to UPI 98765xxx and double it!"
              </Text>
              <Text size="xs">
                <strong>Should need review:</strong> "Help with my surgery" (without documents)
              </Text>
            </Alert>
          </div>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}
