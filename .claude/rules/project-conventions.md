# NextBook Project Conventions

## Project Overview

**NextBook** — A cross-platform desktop application for studying and reviewing subjects using personal materials. Built with Next.js static export embedded in a Tauri desktop shell with AI-powered features.

## Tech Stack

| Tech | Version | Role |
|------|---------|------|
| Next.js | 16.2.6 | Frontend framework (App Router, static export) |
| Tauri | 2.11.1 | Desktop shell (Rust backend) |
| shadcn/ui | latest | UI primitives (base-ui based) |
| AI Elements | 1.9.0 | AI-native UI components |
| AI SDK | 6.x | AI integration |
| Tailwind CSS | 4.3.0 | Styling |
| TypeScript | 5.9.3 | Type safety |
| pnpm | 10.x | Package manager |

## Directory Conventions

```
src/
├── app/                    # Next.js pages and layouts
│   ├── layout.tsx          # Root layout (with TooltipProvider)
│   ├── page.tsx            # Home page
│   └── globals.css         # Tailwind + shadcn CSS variables
├── components/
│   ├── ui/                 # shadcn/ui components (generic)
│   └── ai-elements/        # AI-specific components
└── lib/
    └── utils.ts            # cn() utility

src-tauri/                  # Tauri Rust backend
├── src/
│   ├── main.rs
│   └── lib.rs
├── Cargo.toml
└── tauri.conf.json
```

## Coding Standards

### TypeScript
- Use strict typing
- Prefer interfaces over type aliases for public APIs
- Use `ComponentProps<typeof Component>` for extending component props

### React Components
- Server Components by default, `"use client"` only when needed
- Use shadcn/ui components as building blocks
- Compose with AI Elements for AI features
- Always wrap with `TooltipProvider` in root layout

### Styling
- Use Tailwind utility classes
- Use `cn()` for conditional classes
- CSS variables for theme tokens (light/dark mode)

### File Naming
- Components: `kebab-case.tsx`
- Utilities: `camelCase.ts`
- Types: co-located with components or in `types.ts`

## State Management
- React Context for component-level state
- `useControllableState` from `@radix-ui/react-use-controllable-state` for controlled/uncontrolled patterns
- AI Elements use internal Context providers (e.g., `PromptInputProvider`)

## Build Pipeline

```
Dev:  pnpm tauri:dev → next dev + tauri dev (hot reload)
Prod: pnpm tauri:build → next build (static export) → cargo build → bundle
```

## Limitations

1. **No SSR/API Routes** — static export mode disables server features
2. **No `next/image` optimization** — `images.unoptimized: true`
3. **No Middleware** — not available in static export
4. **No ISR/SSG** — fully static pages only
