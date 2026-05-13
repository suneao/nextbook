# Next.js Skill

## Version: 16.2.6 (App Router)

## Key Characteristics

- **Turbopack only** — No webpack, always uses Turbopack for dev and build
- **React Server Components** by default — all components in `app/` are Server Components unless marked with `"use client"`
- **Static Export** — this project uses `output: "export"` for Tauri compatibility
- **Server Actions** — use `"use server"` for mutations
- **Route Groups** — `(group)/` for organizing without affecting URL
- **Dynamic Routes** — `[param]/` for dynamic segments
- **Loading UI** — `loading.tsx` for Suspense boundaries
- **Error UI** — `error.tsx` for Error boundaries

## Project-Specific Config

```typescript
// next.config.ts — static export mode
const nextConfig = {
  output: "export",
  images: { unoptimized: true }
};
```

## DOs and DON'Ts

✅ DO:
- Read `node_modules/next/dist/docs/` before writing Next.js code
- Use `"use client"` only when needed (state, effects, browser APIs)
- Use Server Components for data fetching
- Use the `src/` directory convention (already configured)
- Import from `@/` alias

❌ DON'T:
- Don't use `next/image` with external URLs in static export
- Don't use API Routes or Middleware (not compatible with static export)
- Don't use `next/headers` or `next/cookies` in client components
- Don't use `getServerSideProps` or `getStaticProps` (Pages Router APIs)

## File Structure

```
src/app/
├── layout.tsx      # Root layout
├── page.tsx        # Home page (/)
├── globals.css     # Tailwind + CSS variables
└── (routes)/       # Route groups
```

## Import Alias

```
@/components/*   →   src/components/*
@/lib/*          →   src/lib/*
@/app/*          →   src/app/*
```
