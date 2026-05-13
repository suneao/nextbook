# shadcn/ui Skill

## Based on: @base-ui/react (NOT @radix-ui/react)

## Important — Breaking Change

shadcn/ui has migrated from Radix UI to **Base UI** (@base-ui/react). The API is similar but types and certain props differ.

## Component Locations

- `src/components/ui/` — shadcn/ui components (24+ installed)
- `components.json` — shadcn CLI configuration

## Installing New Components

```bash
pnpm dlx shadcn@latest add <component-name>
```

## Installed UI Components

`accordion`, `alert`, `avatar`, `badge`, `button`, `button-group`, `card`, `carousel`,
`collapsible`, `command`, `dialog`, `dropdown-menu`, `hover-card`, `input`, `input-group`,
`popover`, `progress`, `scroll-area`, `select`, `separator`, `spinner`, `switch`,
`tabs`, `textarea`, `tooltip`

## Key Patterns

### Imports

```typescript
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
```

### Component Variants (CVA)

Components use `class-variance-authority` for variant props:

```typescript
<Button variant="outline" size="sm">Click</Button>
```

### Composing with Base UI

Base UI components use render props and compound components:

```typescript
import { Menu } from "@base-ui/react/menu";
import { PreviewCard } from "@base-ui/react/preview-card";
import { Collapsible } from "@base-ui/react/collapsible";
```

## Known Type Incompatibilities

When using `@base-ui/react` with older patterns:

1. **Event types**: `BaseUIEvent<SyntheticEvent>` instead of plain `Event`
2. **CollapsibleTrigger + Button render prop**: Types may conflict — use className instead of spreading Button props into `render`
3. **HoverCard `openDelay`/`closeDelay`**: Not on Root — must be handled at Trigger level

## CN Utility

```typescript
import { cn } from "@/lib/utils";  // clsx + tailwind-merge
```
