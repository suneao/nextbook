# Tauri Skill

## Version: 2.11.1

## Architecture

Tauri wraps the Next.js static export as a native desktop application.

- **Frontend**: Next.js static export → `out/` directory
- **Backend**: Rust binary in `src-tauri/`
- **Bridge**: `@tauri-apps/api` for invoking Rust commands from JS

## Key Files

| File | Purpose |
|------|---------|
| `src-tauri/tauri.conf.json` | Window, bundle, security config |
| `src-tauri/Cargo.toml` | Rust dependencies |
| `src-tauri/src/main.rs` | Entry point (`#![windows_subsystem = "windows"]`) |
| `src-tauri/src/lib.rs` | Tauri app builder and plugin setup |
| `src-tauri/build.rs` | Build script |

## Commands

```bash
pnpm tauri:dev      # Dev mode — launches Next.js dev server + desktop window
pnpm tauri:build    # Production build — Next.js static export + Rust compile + bundle
pnpm tauri          # Direct Tauri CLI access
```

## Build Process

1. `pnpm build` (Next.js static export → `out/`)
2. `cargo build --release` (Rust compilation)
3. Bundle packaging (MSI/NSIS on Windows, DMG on macOS, deb/AppImage on Linux)

## Bundle Targets

| Platform | Format |
|----------|--------|
| Windows  | `.msi`, `.exe` (NSIS) |
| macOS    | `.dmg`, `.app` |
| Linux    | `.deb`, `.AppImage` |

## DOs and DON'Ts

✅ DO:
- Test with `pnpm tauri:dev` before building
- Run `pnpm build` first to verify Next.js compiles
- Use `@tauri-apps/api` for native features (file system, shell, etc.)
- Configure CSP in `tauri.conf.json` for production security

❌ DON'T:
- Don't use API routes (static export limitation)
- Don't rely on server-side features in the frontend
- Don't modify `src-tauri/icons/` without regenerating all required sizes
- Don't forget that `frontendDist` in tauri.conf.json is relative to `src-tauri/`

## Adding Rust Commands

```rust
// src-tauri/src/lib.rs
#[tauri::command]
fn my_command() -> String {
    "Hello from Rust!".to_string()
}

// Register in builder:
tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![my_command])
```

## Invoking from Frontend

```typescript
import { invoke } from "@tauri-apps/api/core";
const result = await invoke<string>("my_command");
```
