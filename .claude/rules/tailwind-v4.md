# Tailwind CSS v4 Skill

## Version: 4.3.0

Tailwind v4 is a major rewrite with significant differences from v3.

## Key Differences from v3

### No `tailwind.config.ts`
Configuration is now CSS-based using `@theme` directives in `globals.css`.

### CSS-first Configuration

```css
@import "tailwindcss";

@theme {
  --color-primary: #123456;
  --font-size-hero: 4rem;
}
```

### @apply Anywhere
Can use `@apply` in any CSS file, not just components layer.

### Simplified Setup
- `@tailwindcss/postcss` plugin in PostCSS config
- No separate `tailwind.config.ts` file (unless needed for content paths)

## shadcn/ui Integration

shadcn/ui v4 works with Tailwind v4 through CSS variables:

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  /* ... all shadcn tokens ... */
}
```

## Utility Classes

Same utility-first approach:
```html
<div className="flex items-center gap-4 p-6 bg-background text-foreground rounded-lg shadow-md">
```

## DOs

✅ DO:
- Use `@theme` in CSS for custom values
- Use CSS variables for dynamic theming (dark/light mode)
- Use `@apply` sparingly, prefer composition
- Use `cn()` utility for merging classes
- Use `dark:` variant for dark mode

## DON'Ts

❌ DON'T:
- Don't create `tailwind.config.ts` unless absolutely necessary
- Don't use `@layer` directives (v4 handles this differently)
- Don't use v3-only plugins without checking compatibility
