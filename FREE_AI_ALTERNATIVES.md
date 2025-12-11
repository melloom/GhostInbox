# Free AI Alternatives to OpenAI/ChatGPT

Looking for free alternatives to OpenAI API? Here are the best options:

## 🆓 Completely Free Options

### 1. **Groq** ⭐ RECOMMENDED
**Why it's great**: Super fast, completely free tier, OpenAI-compatible API

- **Free Tier**: Generous free limits
- **Speed**: Extremely fast (uses LPU inference)
- **Models**: Llama 3, Mixtral, Gemma
- **API**: OpenAI-compatible format
- **Website**: https://console.groq.com
- **Setup**: Just swap the API URL and add your Groq API key

**How to use**:
```typescript
// In Edge Function, change:
const API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const API_KEY = Deno.env.get('GROQ_API_KEY') // Free API key from Groq
```

### 2. **Ollama** (Self-Hosted)
**Why it's great**: Run AI models locally, completely free, no API limits

- **Free**: 100% free, runs on your machine
- **Models**: Llama 3, Mistral, Gemma, and more
- **Setup**: Install Ollama, run models locally
- **Website**: https://ollama.ai
- **Best for**: Development, testing, privacy-focused apps

**How to use**:
```typescript
// Local Ollama endpoint
const API_URL = 'http://localhost:11434/api/generate'
// No API key needed for local
```

### 3. **Hugging Face Inference API**
**Why it's great**: Free tier, many models, easy to use

- **Free Tier**: Limited but free
- **Models**: Many open-source models
- **API**: REST API
- **Website**: https://huggingface.co/inference-api
- **Setup**: Get free API token

### 4. **Together AI**
**Why it's great**: Free credits, fast inference

- **Free Tier**: $25 free credits
- **Models**: Llama, Mistral, and more
- **Website**: https://together.ai
- **API**: OpenAI-compatible

### 5. **Anthropic Claude** (Free Tier)
**Why it's great**: High quality, some free usage

- **Free Tier**: Limited free tier available
- **Quality**: Excellent, similar to GPT-4
- **Website**: https://console.anthropic.com
- **Note**: More limited than others

## 🔄 How to Switch to Groq (Easiest Option)

### Step 1: Get Groq API Key
1. Go to https://console.groq.com
2. Sign up (free)
3. Get your API key from the dashboard

### Step 2: Update Edge Function

Create a new Edge Function or modify existing one:

```typescript
// supabase/functions/groq-ai/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

serve(async (req) => {
  // ... same structure as openai-ai function ...
  
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-70b-versatile', // or 'mixtral-8x7b-32768'
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    }),
  })
  
  // ... rest of the code ...
})
```

### Step 3: Set Environment Variable
In Supabase Dashboard → Edge Functions → Secrets:
- Add: `GROQ_API_KEY` = your Groq API key

### Step 4: Update Frontend (Optional)
You can keep using the same frontend code, just change the function name:
```typescript
// In src/lib/ai.ts, change:
supabase.functions.invoke('groq-ai', { ... })
```

## 🏠 Self-Hosted Option: Ollama

### Setup Ollama Locally

1. **Install Ollama**:
   ```bash
   # Windows (PowerShell)
   winget install Ollama.Ollama
   
   # Mac
   brew install ollama
   
   # Linux
   curl -fsSL https://ollama.com/install.sh | sh
   ```

2. **Run a Model**:
   ```bash
   ollama run llama3.1
   ```

3. **Create Edge Function for Ollama**:
   ```typescript
   // supabase/functions/ollama-ai/index.ts
   const OLLAMA_URL = Deno.env.get('OLLAMA_URL') || 'http://localhost:11434'
   
   const response = await fetch(`${OLLAMA_URL}/api/generate`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       model: 'llama3.1',
       prompt: prompt,
       stream: false,
     }),
   })
   ```

**Note**: For production, you'd need to host Ollama on a server (not localhost)

## 📊 Comparison Table

| Service | Free Tier | Speed | Quality | Setup Difficulty |
|---------|-----------|-------|---------|------------------|
| **Groq** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐ Easy |
| **Ollama** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ Medium |
| **Hugging Face** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐ Easy |
| **Together AI** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐ Easy |
| **Anthropic** | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ Easy |

## 🚀 Quick Start: Switch to Groq

1. **Get API Key**: https://console.groq.com
2. **Create new Edge Function**: `supabase/functions/groq-ai/index.ts`
3. **Copy code from** `openai-ai/index.ts` and change:
   - API URL to Groq
   - API key env var to `GROQ_API_KEY`
   - Model to `llama-3.1-70b-versatile` or `mixtral-8x7b-32768`
4. **Deploy**: `supabase functions deploy groq-ai`
5. **Set secret**: Add `GROQ_API_KEY` in Supabase Dashboard
6. **Update frontend**: Change function name from `openai-ai` to `groq-ai`

## 💡 Recommendation

**For production**: Use **Groq** - it's free, fast, and easy to switch
**For development**: Use **Ollama** locally - completely free, no limits
**For best quality**: Stick with OpenAI but use `gpt-4o-mini` (cheaper)

## 🔧 Multi-Provider Support

You could also support multiple providers and let users choose, or use a fallback system:

```typescript
// Try Groq first, fallback to OpenAI
async function callAI(prompt: string) {
  try {
    return await callGroq(prompt)
  } catch {
    return await callOpenAI(prompt)
  }
}
```

## 📝 Notes

- **Groq** is the easiest drop-in replacement
- **Ollama** is best for privacy (runs locally)
- Most free tiers have rate limits
- Quality varies by model - test before switching
- Some models may need prompt adjustments

