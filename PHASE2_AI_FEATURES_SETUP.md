# Phase 2: Enhanced Productivity AI Features Setup

This guide covers the setup for Phase 2 AI features: Enhanced Response Assistant, AI Question Answerer, and AI Insight Generator.

## Overview

### 1. Enhanced Response Assistant ⭐
- **Context-aware responses** - Considers message history
- **Tone matching** - Empathetic, professional, casual, or auto-detect
- **Multi-message support** - Understands conversation context
- **Quality scoring** - Rates response quality

### 2. AI Question Answerer (Q&A) ⭐
- **Answer suggestions** - Generate answers for Q&A sessions
- **Research-based answers** - Comprehensive and accurate
- **Answer quality checking** - Scores accuracy, clarity, completeness

### 3. AI Insight Generator ⭐
- **Weekly/monthly trend reports** - Analyze message patterns
- **Topic clustering** - Group similar messages
- **Sentiment over time** - Track sentiment trends
- **Content opportunities** - Suggestions for engagement

## Prerequisites

1. ✅ OpenAI API key configured in Supabase Edge Functions
2. ✅ Edge Function `openai-ai` deployed and updated
3. ✅ Database schema with message history support

## Setup Steps

### Step 1: Update Edge Function

The Edge Function has been updated with new endpoints. Deploy it:

```bash
# From your project root
supabase functions deploy openai-ai
```

Make sure the Edge Function has these environment variables:
- `OPENAI_API_KEY` - Your OpenAI API key
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon key

### Step 2: Update Client Code

The client-side functions have been added to `src/lib/ai.ts`. Import and use them:

```typescript
import { 
  generateEnhancedReply, 
  generateQAAnswer, 
  generateInsights,
  scoreResponseQuality 
} from '../lib/ai'
```

## Feature Details

### Enhanced Response Assistant

**Usage:**
```typescript
const result = await generateEnhancedReply(messageBody, {
  messageHistory: [
    { body: 'Previous message', created_at: '2024-01-01T00:00:00Z' }
  ],
  tone: 'empathetic' // or 'professional', 'casual', 'auto'
})

// result.replies contains 3 reply options
// result.tone shows the tone used
// result.context_used shows how many previous messages were considered
```

**Features:**
- Automatically considers last 5 messages from the same sender
- Tone options: empathetic, professional, casual, or auto-detect
- Generates 3 distinct reply options
- Each reply is 2-4 sentences

**UI Integration:**
- Add tone selector dropdown in message detail view
- Show "Enhanced Reply" button alongside regular "Generate Reply"
- Display context indicator (e.g., "Using 3 previous messages")

### AI Question Answerer

**Usage:**
```typescript
const result = await generateQAAnswer(questionText, qaSessionContext)

// result.answer contains the generated answer
// result.quality_score contains scoring breakdown
```

**Features:**
- Generates comprehensive answers for Q&A questions
- Considers Q&A session context if provided
- Automatically scores answer quality
- Provides feedback for improvement

**UI Integration:**
- Add "Generate AI Answer" button in Q&A question view
- Show quality score breakdown
- Allow editing before submitting

### AI Insight Generator

**Usage:**
```typescript
const result = await generateInsights(messages, 'week') // or 'month', 'all'

// result.insights contains the full report
// result.time_range shows the range analyzed
// result.message_count shows how many messages were analyzed
```

**Features:**
- Analyzes up to 100 messages
- Time range options: week, month, or all time
- Generates comprehensive insights report
- Includes themes, sentiment trends, topic clustering, and opportunities

**UI Integration:**
- Add "Generate Insights" button in Dashboard
- Time range selector (week/month/all)
- Display insights in formatted report view
- Export insights as markdown/text

### Quality Scoring

**Usage:**
```typescript
const score = await scoreResponseQuality(responseText)

// score.overall_score (1-10)
// score.empathy, score.clarity, score.appropriateness, score.tone
// score.feedback for improvement suggestions
```

**Features:**
- Scores responses on multiple dimensions
- Provides actionable feedback
- Can be used before sending responses

**UI Integration:**
- Add "Check Quality" button in response composer
- Show score breakdown with visual indicators
- Display feedback suggestions

## UI Implementation Examples

### Enhanced Reply in Dashboard

```typescript
// In Dashboard.tsx, add to message detail view:
const [enhancedReplies, setEnhancedReplies] = useState<string | null>(null)
const [selectedTone, setSelectedTone] = useState<'empathetic' | 'professional' | 'casual' | 'auto'>('auto')
const [loadingEnhanced, setLoadingEnhanced] = useState(false)

async function handleGenerateEnhancedReply() {
  if (!selectedMessage) return
  
  setLoadingEnhanced(true)
  try {
    // Get message history for this sender (if available)
    const messageHistory = messages
      .filter(m => m.vent_link_id === selectedMessage.vent_link_id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(-5)
      .map(m => ({ body: m.body, created_at: m.created_at }))
    
    const result = await generateEnhancedReply(selectedMessage.body, {
      messageHistory,
      tone: selectedTone,
    })
    
    setEnhancedReplies(result.replies)
  } catch (error: any) {
    alert(error.message || 'Failed to generate enhanced reply')
  } finally {
    setLoadingEnhanced(false)
  }
}
```

### Q&A Answer Generation

```typescript
// In Dashboard.tsx, in Q&A section:
const [aiAnswer, setAiAnswer] = useState<string | null>(null)
const [answerQuality, setAnswerQuality] = useState<any>(null)
const [loadingAnswer, setLoadingAnswer] = useState(false)

async function handleGenerateQAAnswer(questionId: string, questionText: string, sessionId: string) {
  setLoadingAnswer(true)
  try {
    const session = qaSessions.find(s => s.id === sessionId)
    const result = await generateQAAnswer(questionText, session?.description || undefined)
    
    setAiAnswer(result.answer)
    setAnswerQuality(result.quality_score)
    setAnswerText(result.answer) // Pre-fill answer field
  } catch (error: any) {
    alert(error.message || 'Failed to generate answer')
  } finally {
    setLoadingAnswer(false)
  }
}
```

### Insights Generation

```typescript
// In Dashboard.tsx, add insights section:
const [insights, setInsights] = useState<string | null>(null)
const [insightsTimeRange, setInsightsTimeRange] = useState<'week' | 'month' | 'all'>('month')
const [loadingInsights, setLoadingInsights] = useState(false)

async function handleGenerateInsights() {
  setLoadingInsights(true)
  try {
    const now = new Date()
    const cutoffDate = insightsTimeRange === 'week'
      ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      : insightsTimeRange === 'month'
      ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      : new Date(0)
    
    const filteredMessages = messages
      .filter(m => new Date(m.created_at) >= cutoffDate)
      .map(m => ({ body: m.body, created_at: m.created_at, mood: m.mood || undefined }))
    
    const result = await generateInsights(filteredMessages, insightsTimeRange)
    setInsights(result.insights)
  } catch (error: any) {
    alert(error.message || 'Failed to generate insights')
  } finally {
    setLoadingInsights(false)
  }
}
```

## Cost Estimates

Using `gpt-4o-mini`:
- **Enhanced Reply**: ~$0.003 per use (slightly more than basic reply due to context)
- **Q&A Answer**: ~$0.004 per use (includes quality scoring)
- **Insights**: ~$0.01 per report (analyzes up to 100 messages)
- **Quality Score**: ~$0.002 per use

**For typical usage**:
- 50 enhanced replies/month: ~$0.15
- 20 Q&A answers/month: ~$0.08
- 4 insight reports/month: ~$0.04
- 30 quality checks/month: ~$0.06

**Total: ~$0.33/month** - Very affordable!

## Testing

1. **Test Enhanced Reply**:
   - Select a message in Dashboard
   - Click "Generate Enhanced Reply"
   - Try different tone options
   - Verify context is used when message history exists

2. **Test Q&A Answer**:
   - Go to Q&A section
   - Click "Generate AI Answer" on a question
   - Check quality score
   - Edit and submit answer

3. **Test Insights**:
   - Go to Dashboard overview
   - Click "Generate Insights"
   - Select time range
   - Review generated report

4. **Test Quality Scoring**:
   - Compose a response
   - Click "Check Quality"
   - Review scores and feedback

## Troubleshooting

### Enhanced Reply not using context
- Check that message history is being passed correctly
- Verify messages are from the same sender/vent_link
- Check Edge Function logs for context processing

### Q&A answers seem generic
- Provide Q&A session context (description) for better answers
- Check that question text is clear and specific

### Insights taking too long
- Reduce message count (currently analyzes up to 100)
- Use shorter time ranges for faster processing
- Check Edge Function timeout settings

### Quality scores seem inaccurate
- Quality scoring is subjective - use as guidance, not absolute
- Review feedback suggestions for improvement

## Next Steps

After Phase 2 features are working:
1. Add user preferences for default tone
2. Save insights reports to database
3. Add insights export functionality
4. Create automated weekly/monthly insight reports
5. Add multi-language support for answers

## API Reference

All functions are exported from `src/lib/ai.ts`:

- `generateEnhancedReply(messageBody, options?)` - Enhanced reply generation
- `generateQAAnswer(questionText, qaSessionContext?)` - Q&A answer generation
- `generateInsights(messages, timeRange?)` - Insights generation
- `scoreResponseQuality(responseText)` - Quality scoring

See `src/lib/ai.ts` for full TypeScript interfaces and documentation.
