# 🛡️ CrowdUp Moderation System

A production-ready LLM-powered fraud and content moderation system for the CrowdUp crowdfunding platform.

## 🌟 Features

### Automated Moderation Pipeline
- **Rule-based pre-checks** (fast, deterministic)
- **LLM policy enforcement** (contextual, intelligent)
- **Image moderation** with OCR text extraction
- **URL safety verification**
- **Real-time risk scoring**

### Multi-layered Detection
- 🚨 **Financial Scams**: Guaranteed returns, MLM, crypto schemes
- 👤 **Impersonation**: Fake brands, celebrities, organizations
- 🏥 **Medical Claims**: Unverified medical fundraising
- 💳 **Payment Bypass**: Direct UPI/crypto instructions
- 🔞 **Content Safety**: Violence, adult content, hate speech
- 📄 **Document Fraud**: Sensitive ID/bank document detection
- 🤖 **Spam/Low Quality**: Duplicate content, link farms

### Human-in-the-Loop
- **Moderation Dashboard** for manual review
- **Risk-based routing** (auto-approve, hold, reject)
- **Audit trail** for all decisions
- **Appeal system** for rejected campaigns

## 🚀 Quick Start

### 1. Backend Setup (Node.js API)

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your OpenAI API key
npm run dev
```

The API will run on `http://localhost:3001`

### 2. Frontend Integration

```bash
# In your main React project
npm install  # Dependencies already included
cp .env.example .env
# Edit .env if needed
npm run dev
```

### 3. Basic Usage

```tsx
import { useModeration } from './src/hooks/useModeration';
import { ModerationFeedback } from './src/components/ModerationFeedback';

function CampaignForm() {
  const moderation = useModeration({
    onApprove: (result) => console.log('Approved!', result),
    onReject: (result) => console.log('Rejected', result),
  });

  const handleSubmit = async (campaignData, creatorInfo) => {
    await moderation.moderateCampaign(campaignData, creatorInfo);
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        {/* Your form fields */}
      </form>
      
      {moderation.result && (
        <ModerationFeedback 
          result={moderation.result}
          onEdit={() => moderation.clearResult()}
        />
      )}
    </div>
  );
}
```

## 📊 API Endpoints

### Moderation
- `POST /api/moderate` - Analyze campaign content
- `GET /api/moderation-queue` - Get pending reviews
- `POST /api/moderation-queue/:id/review` - Submit human review

### Health
- `GET /health` - Service health check

## 🔧 Configuration

### Environment Variables

**Backend (`server/.env`)**
```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4
AUTO_APPROVE_THRESHOLD=0.3
MANUAL_REVIEW_THRESHOLD=0.6
AUTO_REJECT_THRESHOLD=0.6
```

**Frontend (`.env`)**
```env
VITE_MODERATION_API_URL=http://localhost:3001/api
VITE_ENABLE_MODERATION=true
```

### Thresholds

- **< 0.3**: Auto-approve ✅
- **0.3 - 0.6**: Manual review ⏳
- **> 0.6**: Auto-reject ❌

## 🎯 Policy Categories

| Category | Examples | Action |
|----------|----------|---------|
| **SCAM_FINANCIAL** | "Guaranteed returns", MLM schemes | High risk |
| **PAYMENT_BYPASS** | Direct UPI/crypto instructions | Auto-reject |
| **IMPERSONATION** | Fake celebrity/brand campaigns | High risk |
| **MEDICAL_CLAIMS** | Surgery funding without docs | Manual review |
| **VIOLENT_ADULT_HATE** | Inappropriate content | Auto-reject |
| **SENSITIVE_DOCS** | ID/bank statement images | High risk |
| **LOW_QUALITY_SPAM** | Duplicate/meaningless content | Low-medium risk |

## 🧪 Testing

### Test Categories

```bash
# Backend tests
cd server
npm test

# Test with sample campaigns
curl -X POST http://localhost:3001/api/moderate \\
  -H "Content-Type: application/json" \\
  -d @test-data/sample-campaign.json
```

### Sample Test Cases

**Clean Campaign (Should Approve)**
```json
{
  "campaign": {
    "title": "Help rebuild local school library",
    "description": "Our community school's library was damaged in the recent floods. We need funds to buy new books and furniture.",
    "goal": 50000,
    "category": "Education",
    "creator": {
      "displayName": "Sarah Johnson",
      "accountAgeDays": 120,
      "verifiedEmail": true
    }
  }
}
```

**Scam Campaign (Should Reject)**
```json
{
  "campaign": {
    "title": "Investment opportunity - guaranteed returns!",
    "description": "Send money to UPI ID 98765xxx and double your investment in 30 days. Limited time offer!",
    "goal": 1000000,
    "category": "Other",
    "creator": {
      "displayName": "Quick Money",
      "accountAgeDays": 1,
      "verifiedEmail": false
    }
  }
}
```

## 🔒 Security

- All inputs validated with Zod schemas
- Rate limiting on API endpoints
- Sanitized error messages
- No sensitive data in logs
- CORS protection

## 📈 Production Deployment

### Backend
1. Deploy to your preferred platform (AWS, Heroku, etc.)
2. Set up proper database (PostgreSQL recommended)
3. Configure monitoring (health checks, error tracking)
4. Set up rate limiting and DDoS protection

### Frontend
1. Build and deploy React app
2. Update API URLs in environment variables
3. Configure CDN for static assets

### Database Schema (Optional)
```sql
CREATE TABLE moderation_events (
  id UUID PRIMARY KEY,
  campaign_id VARCHAR(255),
  decision VARCHAR(20),
  risk_score DECIMAL(3,2),
  reasons JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Add tests for new functionality
4. Update documentation
5. Submit pull request

## 📝 License

MIT License - see LICENSE file for details

---

**⚠️ Important Notes:**
- This system requires an OpenAI API key
- LLM costs scale with usage - monitor your API usage
- Always test thoroughly before production deployment
- Consider implementing caching for better performance
- Set up proper monitoring and alerting
