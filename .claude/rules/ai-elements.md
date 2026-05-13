# AI Elements Skill

## Version: 1.9.0

AI Elements is a component library built on shadcn/ui for AI-native applications.

## Component Locations

- `src/components/ai-elements/` — 48+ AI-specific components

## Key Components

### Chat & Conversation
- `conversation.tsx` — Conversation container
- `message.tsx` — Individual messages with avatars
- `prompt-input.tsx` — Advanced input with model selection, attachments
- `suggestion.tsx` — Quick action suggestions

### AI Reasoning
- `reasoning.tsx` — AI reasoning/thought process display
- `chain-of-thought.tsx` — Chain-of-thought visualization
- `tool.tsx` — Tool usage visualization
- `task.tsx` — Task completion tracking
- `plan.tsx` — Plan display with collapsible sections

### Code & Content
- `code-block.tsx` — Syntax-highlighted code with copy (uses Shiki)
- `snippet.tsx` — Inline code snippets
- `image.tsx` — AI-generated image display
- `web-preview.tsx` — Embedded web page previews

### Sources & Citations
- `sources.tsx` — Source attribution
- `inline-citation.tsx` — Inline source citations
- `context.tsx` — Context display

### Agent Components
- `agent.tsx` — Agent status/display
- `artifact.tsx` — Artifact display
- `canvas.tsx` — Interactive canvas
- `file-tree.tsx` — File tree visualization
- `terminal.tsx` — Terminal output
- `sandbox.tsx` — Sandbox environment display

### Controls
- `controls.tsx` — Playback controls
- `model-selector.tsx` — AI model selection
- `voice-selector.tsx` — Voice selection
- `mic-selector.tsx` — Microphone selection
- `speech-input.tsx` — Speech-to-text
- `transcription.tsx` — Transcription display

## Usage with AI SDK

```typescript
"use client";
import { useChat } from "@ai-sdk/react";
import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";

export default function Chat() {
  const { messages } = useChat();
  return (
    <Conversation>
      <ConversationContent>
        {messages.map((msg, i) => (
          <Message key={i} from={msg.role}>
            <MessageContent>
              <MessageResponse>{msg.content}</MessageResponse>
            </MessageContent>
          </Message>
        ))}
      </ConversationContent>
    </Conversation>
  );
}
```

## State Management

Components use React Context for internal state:
- `PromptInputProvider` — wraps prompt input with controller
- `usePromptInputController()` — access input state
- `usePromptInputAttachments()` — attachment management

## Dependencies

- `@ai-sdk/react` — AI chat hooks
- `@ai-sdk/openai` — OpenAI provider
- `shiki` — Syntax highlighting
- `@xyflow/react` — Node/flow diagrams
- `motion` — Animations
- `streamdown` — Streaming markdown
- `media-chrome` — Audio/video controls
- `@rive-app/react-webgl2` — Rive animations
