# AI Integration Guide

## Overview

The AI module uses a **provider-agnostic strategy pattern**. The backend communicates with an LLM provider (currently Google Gemini) through a common interface, so switching providers requires only an environment variable change — no code changes.

### Architecture

```
Client (Next.js)
  │
  ├── POST /api/v1/ai/sessions/:id/messages       ── Non-streaming (full response)
  ├── POST /api/v1/ai/sessions/:id/messages/stream ── Streaming (SSE, token-by-token)
  │
  ▼
Express Server
  │
  ├── ai.controller.ts    ── HTTP handlers
  ├── ai.service.ts       ── Business logic + DB operations
  └── lib/ai/providers/   ── AI provider implementations
       ├── types.ts        ── AIProvider interface
       ├── factory.ts      ── createProvider()
       └── gemini.provider.ts  ── Gemini implementation
  │
  ▼
AI Provider API (Gemini, OpenAI, etc.)
```

---

## Setup

### 1. Environment Variables

Add to `smart-nub-campus-server/.env`:

```env
AI_PROVIDER=gemini
AI_PROVIDER_API_KEY=AIzaSy...
AI_PROVIDER_MODEL=gemini-1.5-flash
```

### 2. Get a Gemini API Key

1. Go to https://aistudio.google.com/apikey
2. Click **"Get API key"** → **"Create API key"**
3. Copy the key and paste it as `AI_PROVIDER_API_KEY`

### 3. Verify Installation

```bash
cd smart-nub-campus-server
npm run dev
```

The server will initialize the Gemini provider on startup. If the API key is invalid, you'll see an error immediately.

---

## API Endpoints

### Chat Endpoints

#### Create Session
```
POST /api/v1/ai/sessions
Body: { "title?" : "optional title" }
Response: { id, userId, title, createdAt }
```

#### List Sessions
```
GET /api/v1/ai/sessions?page=1&limit=20
Response: { sessions: [...], meta: { page, limit, total, totalPages } }
```

#### Send Message (non-streaming)
```
POST /api/v1/ai/sessions/:sessionId/messages
Body: { "content": "Explain binary search" }
Response: { userMessage: {...}, aiMessage: { id, role, content, model, createdAt } }
```

#### Send Message (streaming — SSE)
```
POST /api/v1/ai/sessions/:sessionId/messages/stream
Body: { "content": "Explain binary search" }
Content-Type: text/event-stream

event: token
data: {"token": "Binary"}

event: token
data: {"token": " search"}

event: token
data: {"token": " is..."}

event: done
data: {"id": "uuid", "content": "Binary search is...", "createdAt": "2026-..."}

event: error
data: {"error": "Rate limit exceeded. Try again in 30 seconds."}
```

#### Get Messages
```
GET /api/v1/ai/sessions/:sessionId/messages?page=1&limit=50
```

#### Delete Session
```
DELETE /api/v1/ai/sessions/:sessionId
```

#### Mark Message Helpful
```
PATCH /api/v1/ai/messages/:messageId/helpful
Body: { "isHelpful": true }
```

### Study Stats

```
GET /api/v1/ai/stats
GET /api/v1/ai/stats/history?weeks=4
```

### Tool Endpoints

#### Summarize PDF
```
POST /api/v1/ai/tools/summarize-pdf
Body: { "fileUrl": "https://..." }
Response: { summary: "...", keyPoints: ["...", "..."] }
```

#### Generate Quiz
```
POST /api/v1/ai/tools/generate-quiz
Body: { "content": "topic or material", "numQuestions": 5 }
Response: { questions: [{ question, options, correctAnswer }], totalQuestions }
```

#### Generate Flashcards
```
POST /api/v1/ai/tools/generate-flashcards
Body: { "content": "topic or material", "numCards": 10 }
Response: { cards: [{ front, back }], totalCards }
```

#### Explain Code
```
POST /api/v1/ai/tools/explain-code
Body: { "code": "console.log('hello')", "language?": "javascript" }
Response: { language, explanation, complexity, suggestions }
```

---

## Switching Providers

To switch from Gemini to another provider (e.g., OpenAI):

### 1. Create the provider file
```typescript
// src/app/lib/ai/providers/openai.provider.ts
import OpenAI from "openai";
import type { AIProvider, AIProviderConfig, ChatMessage, StreamCallbacks } from "./types";

export class OpenAIProvider implements AIProvider {
  // Implement all 6 interface methods
}
```

### 2. Register in the factory
```typescript
// src/app/lib/ai/providers/factory.ts
import { OpenAIProvider } from "./openai.provider";

export function createProvider(config: AIProviderConfig): AIProvider {
  switch (config.provider) {
    case "gemini": return new GeminiProvider(config);
    case "openai": return new OpenAIProvider(config);
    default: throw new Error(`Unknown AI provider: ${config.provider}`);
  }
}
```

### 3. Update .env
```env
AI_PROVIDER=openai
AI_PROVIDER_API_KEY=sk-...
AI_PROVIDER_MODEL=gpt-4o
```

That's it. **No changes** to `ai.service.ts`, controllers, or routes.

---

## Provider Interface

Any provider must implement this interface:

```typescript
interface AIProvider {
  chat(history: ChatMessage[], message: string): Promise<string>;
  chatStream(history: ChatMessage[], message: string, callbacks: StreamCallbacks): Promise<void>;
  generateQuiz(content: string, numQuestions: number): Promise<QuizResult>;
  generateFlashcards(content: string, numCards: number): Promise<FlashcardResult>;
  summarizeContent(content: string): Promise<SummaryResult>;
  explainCode(code: string, language?: string): Promise<CodeExplanationResult>;
}
```

---

## Rate Limiting

| Endpoint | Limit |
|---|---|
| Chat messages (incl. streaming) | 30/hour per user |
| Tool endpoints (quiz, flashcards, etc.) | 10/hour per user |

Configured in the route middleware. To change, edit the rate limiter values.

---

## Database Schema Additions

This integration added 3 changes to the Prisma schema:

| Model | New Field | Purpose |
|---|---|---|
| `AIChatSession` | `metadata Json?` | Flexible storage for course context, system prompt, tags |
| `AIMessage` | `model String?` | Records which AI model generated this response |
| `AIMessage` | `inputTokens Int?` | Token usage tracking for cost monitoring |
| `AIMessage` | `outputTokens Int?` | Token usage tracking for cost monitoring |
| **New:** `AIAttachment` | — | Tracks files uploaded in a chat session |

Run after pulling changes:
```bash
npx prisma db push
```

---

## Free Tier Limits (Gemini 1.5 Flash)

| Metric | Limit |
|---|---|
| Requests per minute | 60 |
| Requests per day | 1,500 |
| Tokens per minute | 1,000,000 |
| Context window | 1,000,000 tokens |
