@AGENTS.md

# NextBook — Project Context

## Active Skills

This project uses Claude Code skills. The following skill files are always active:

- [Next.js 16](.claude/rules/nextjs.md) — App Router, static export, Turbopack
- [Tauri v2](.claude/rules/tauri.md) — Desktop bundling, Rust backend
- [shadcn/ui](.claude/rules/shadcn-ui.md) — @base-ui/react based components
- [AI Elements](.claude/rules/ai-elements.md) — AI-native UI components (48+)
- [Tailwind v4](.claude/rules/tailwind-v4.md) — CSS-first config, @theme
- [Project Conventions](.claude/rules/project-conventions.md) — structure, naming, patterns

## Quick Reference

- Package manager: `pnpm`
- Dev server: `pnpm dev` (web) / `pnpm tauri:dev` (desktop)
- Build: `pnpm build` (web) / `pnpm tauri:build` (desktop bundle)
- Components: `src/components/ui/` (shadcn), `src/components/ai-elements/` (AI)
- Config: `next.config.ts`, `src-tauri/tauri.conf.json`, `components.json`
- Aliases: `@/` → `src/`

## Critical Constraints

1. **Static export only** — no API routes, no SSR, no middleware
2. **@base-ui/react** (not @radix-ui) — type incompatibilities may occur
3. **Tailwind v4** — CSS-based config, no `tailwind.config.ts`
4. **All `Image` must have `unoptimized`** — static export limitation
