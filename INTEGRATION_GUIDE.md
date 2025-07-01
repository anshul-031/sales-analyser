# Sales Analyzer API Integration Guide

## Overview

The Sales Analyzer API provides comprehensive AI-powered call analysis capabilities that can be seamlessly integrated into your existing systems. Our REST API enables you to upload audio files, perform advanced analysis, and query results using natural language.

## Base URL

**Production:** `https://your-domain.com`  
**Development:** `http://localhost:3000`

## Authentication

All API endpoints (except authentication) require JWT token authentication.

### Getting Started

1. **Register** a new account: `POST /api/auth/register`
2. **Login** to get access token: `POST /api/auth/login`  
3. **Include token** in all subsequent requests: `Authorization: Bearer YOUR_JWT_TOKEN`

## API Workflow

### 1. File Upload → 2. Analysis → 3. Query Results

```
[Audio Files] → [Upload API] → [Analysis API] → [Results] → [Chatbot API]
```

## Core Integration Patterns

### Pattern 1: Simple Call Analysis

**Use Case:** Upload a single call recording and get basic analysis

```javascript
// 1. Upload file
const uploadResponse = await api.post('/api/upload', formData);
const uploadId = uploadResponse.data.uploads[0].id;

// 2. Analyze with default parameters
const analysisResponse = await api.post('/api/analyze', {
  uploadIds: [uploadId],
  analysisType: 'default'
});

// 3. Get results
const results = analysisResponse.data.result;
console.log('Sentiment:', results.sentiment);
console.log('Key Points:', results.key_points);
```

### Pattern 2: Batch Processing

**Use Case:** Process multiple calls simultaneously

```javascript
// Upload multiple files
const uploadResponse = await api.post('/api/upload', formDataWithMultipleFiles);
const uploadIds = uploadResponse.data.uploads.map(u => u.id);

// Analyze all files together
const analysisResponse = await api.post('/api/analyze', {
  uploadIds: uploadIds,
  analysisType: 'parameters',
  customParameters: [
    'sentiment',
    'customer_satisfaction',
    'sales_opportunity',
    'next_steps'
  ]
});
```

### Pattern 3: Custom Analysis Parameters

**Use Case:** Extract specific business metrics

```javascript
const customAnalysis = await api.post('/api/analyze', {
  uploadIds: [uploadId],
  analysisType: 'parameters',
  customParameters: [
    'lead_qualification_score',
    'budget_discussed',
    'decision_maker_identified',
    'timeline_mentioned',
    'objections_raised',
    'competitive_mentions'
  ]
});
```

### Pattern 4: Conversational Insights

**Use Case:** Query analysis results with natural language

```javascript
// Ask specific questions about the analysis
const chatResponse = await api.post('/api/chatbot', {
  question: 'What objections did the customer raise and how were they handled?',
  analysisId: analysisId
});

console.log('AI Answer:', chatResponse.data.answer);
```

## System Integration Scenarios

### CRM Integration

**Salesforce, HubSpot, Pipedrive Integration**

```javascript
class CRMIntegration {
  async processCallRecording(crmCallId, audioFile) {
    // 1. Upload to Sales Analyzer
    const upload = await this.salesAnalyzer.uploadFiles([audioFile]);
    
    // 2. Analyze with CRM-specific parameters
    const analysis = await this.salesAnalyzer.analyzeFiles(
      [upload.uploads[0].id],
      'parameters',
      [
        'lead_score',
        'buying_intent',
        'budget_range',
        'decision_timeline',
        'key_stakeholders',
        'next_actions'
      ]
    );
    
    // 3. Update CRM record
    await this.crm.updateCall(crmCallId, {
      sentiment: analysis.result.sentiment,
      leadScore: analysis.result.lead_score,
      nextActions: analysis.result.next_actions,
      analysisId: analysis.analysisId
    });
    
    return analysis;
  }
}
```

### Call Centers & VoIP Systems

**Twilio, RingCentral, Zoom Phone Integration**

```javascript
// Webhook handler for call completion
app.post('/webhook/call-completed', async (req, res) => {
  const { callId, recordingUrl, participantInfo } = req.body;
  
  try {
    // Download recording
    const audioBuffer = await downloadRecording(recordingUrl);
    
    // Upload to Sales Analyzer
    const upload = await salesAnalyzer.uploadFiles([audioBuffer]);
    
    // Analyze for call center metrics
    const analysis = await salesAnalyzer.analyzeFiles(
      [upload.uploads[0].id],
      'parameters',
      [
        'customer_satisfaction',
        'issue_resolution',
        'agent_performance',
        'escalation_needed',
        'follow_up_required'
      ]
    );
    
    // Store results in your system
    await storeCallAnalysis(callId, analysis.result);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Call analysis failed:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});
```

### Business Intelligence Systems

**Power BI, Tableau, Custom Analytics Integration**

```javascript
class AnalyticsIntegration {
  async generateCallAnalyticsReport(dateRange) {
    // Get analytics data
    const analytics = await this.salesAnalyzer.getAnalytics();
    
    // Enhance with detailed insights
    const detailedInsights = await Promise.all(
      analytics.data.trends.map(async (trend) => {
        const insights = await this.salesAnalyzer.chatAboutAnalysis(
          `Analyze the trends for ${trend.date}. What factors contributed to the sentiment score of ${trend.sentiment}?`,
          null // Query across all data
        );
        
        return {
          ...trend,
          aiInsights: insights.answer
        };
      })
    );
    
    return {
      summary: analytics.data,
      trends: detailedInsights,
      generatedAt: new Date().toISOString()
    };
  }
}
```

## Webhook Integration (Future Feature)

Configure webhooks to receive real-time notifications when analysis completes:

```javascript
// Webhook endpoint configuration
{
  "url": "https://your-system.com/webhook/analysis-complete",
  "events": ["analysis.completed", "analysis.failed"],
  "headers": {
    "Authorization": "Bearer YOUR_WEBHOOK_SECRET"
  }
}

// Webhook payload example
{
  "event": "analysis.completed",
  "analysisId": "analysis_123",
  "uploadIds": ["upload_456"],
  "userId": "user_789",
  "result": {
    "sentiment": "positive",
    "confidence": 0.92,
    // ... full analysis results
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Error Handling Best Practices

### Retry Logic

```javascript
class SalesAnalyzerClient {
  async analyzeWithRetry(uploadIds, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.analyze(uploadIds);
      } catch (error) {
        if (attempt === maxRetries) throw error;
        
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}
```

### Error Categorization

```javascript
function handleAnalysisError(error) {
  switch (error.response?.status) {
    case 400:
      // Bad request - check parameters
      console.error('Invalid request parameters:', error.response.data);
      break;
    case 401:
      // Unauthorized - refresh token
      await refreshAuthToken();
      break;
    case 413:
      // File too large - compress or split
      console.error('File too large, maximum size is 100MB');
      break;
    case 429:
      // Rate limited - back off
      await delay(60000); // Wait 1 minute
      break;
    case 500:
      // Server error - retry later
      console.error('Server error, retrying...');
      break;
  }
}
```

## Rate Limits & Performance

- **Upload API**: 10 requests per minute per user
- **Analysis API**: 5 requests per minute per user  
- **Chatbot API**: 20 requests per minute per user
- **Analytics API**: 30 requests per minute per user

### Optimization Tips

1. **Batch uploads** when possible to reduce API calls
2. **Compress audio files** before upload (we support MP3, WAV, M4A)
3. **Cache analysis results** to avoid re-processing
4. **Use webhooks** (when available) instead of polling
5. **Implement exponential backoff** for failed requests

## Security Considerations

### API Key Management

```javascript
// ❌ Don't do this
const apiClient = new SalesAnalyzer('sk_live_your_secret_key');

// ✅ Use environment variables
const apiClient = new SalesAnalyzer(process.env.SALES_ANALYZER_API_KEY);
```

### Data Privacy

- All audio files are **encrypted in transit** (HTTPS) and **at rest**
- Files are **automatically deleted** after processing (configurable retention)
- Analysis results are **isolated per user** - no cross-tenant access
- **GDPR compliant** - user data can be deleted on request

## SDK Examples

### Node.js SDK

```javascript
const SalesAnalyzer = require('@salesanalyzer/node-sdk');

const client = new SalesAnalyzer({
  apiKey: process.env.SALES_ANALYZER_API_KEY,
  baseUrl: 'https://api.salesanalyzer.com'
});

// Simple usage
const analysis = await client.analyzeCall(audioFile, {
  parameters: ['sentiment', 'key_points', 'action_items']
});
```

### Python SDK

```python
from salesanalyzer import SalesAnalyzer

client = SalesAnalyzer(api_key=os.getenv('SALES_ANALYZER_API_KEY'))

# Simple usage
with open('call.mp3', 'rb') as audio_file:
    analysis = client.analyze_call(
        audio_file,
        parameters=['sentiment', 'key_points', 'action_items']
    )
```

## Support & Resources

- **API Documentation**: `/api/swagger`
- **Status Page**: `status.salesanalyzer.com`
- **Support Email**: `support@salesanalyzer.com`
- **Developer Community**: `discord.gg/salesanalyzer`

---

## Quick Start Checklist

- [ ] Create account and get API credentials
- [ ] Test authentication with `/api/auth/login`
- [ ] Upload a sample audio file
- [ ] Run basic analysis
- [ ] Query results with chatbot
- [ ] Implement error handling
- [ ] Set up monitoring and alerts
- [ ] Go live! 🚀

---

*For more examples and detailed documentation, visit our [Developer Portal](https://developers.salesanalyzer.com)*
