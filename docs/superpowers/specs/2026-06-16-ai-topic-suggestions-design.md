# AI Topic Suggestions

## Overview

Add an "Inspire me" button to the Create Room form that generates 4–6 creative draft topic ideas via OpenAI and lets the user select one with a single click.

## Architecture

### AI Layer (`features/ai/`)

**`features/ai/prompts/topics.ts`**
- System prompt: creative brainstorming assistant for a draft game
- User prompt: asks for 6 diverse, interesting draft topics across categories
- Output: array of 4-6 strings (each 2-80 chars)

**`features/ai/schemas.ts`** — add `topicsOutputSchema`
- `z.object({ topics: z.array(z.string().min(1).max(80)).min(4).max(6) })`

**`features/ai/client.ts`** — add `suggestTopics(): Promise<string[]>`
- No input parameters needed
- Calls OpenAI with structured output using `topicsOutputSchema`
- Returns the topics array

**`features/ai/topics.ts`** — barrel re-export of `suggestTopics`

### API Layer

**`app/api/ai/topics/route.ts`**
- `POST /api/ai/topics`
- Requires guest session
- Rate limited: 20 requests/minute per guest
- Returns `{ topics: string[] }`
- Error handling follows existing pattern in `pool/route.ts`

### UI Layer

**`components/lobby/topic-suggestions.tsx`**
- Renders an "Inspire me" ghost button next to the topic label
- States: idle, loading, loaded, error
- On click: calls API, shows spinner in popover
- On success: popover with 4-6 chip buttons
- On error: popover with error message + retry
- Click chip → calls `onSelect(topic)` prop
- Popover closes on chip click or outside click

**`components/lobby/create-room-form.tsx`**
- Import `TopicSuggestions`
- Render next to the "Draft topic" field
- `onSelect` sets the topic input value

## Data Flow

```
CreateRoomForm
  └─ TopicSuggestions
       └─ click "Inspire me"
            └─ fetch POST /api/ai/topics
                 └─ requireGuestSession()
                 └─ checkRateLimit()
                 └─ suggestTopics() → OpenAI → structured output
                 └─ return { topics: [...] }
            └─ popover renders chips
            └─ click chip → onSelect(topic) → fill field
```

## Files

| File | Action |
|---|---|
| `features/ai/prompts/topics.ts` | Create |
| `features/ai/schemas.ts` | Edit (add schema) |
| `features/ai/client.ts` | Edit (add function) |
| `features/ai/topics.ts` | Create |
| `app/api/ai/topics/route.ts` | Create |
| `components/lobby/topic-suggestions.tsx` | Create |
| `components/lobby/create-room-form.tsx` | Edit (integrate) |
