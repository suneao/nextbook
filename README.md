# NextBook

An application that can help people study and review a whole subject within their own materials.

## Tech Stack

| Technology | Version | Description |
|------------|---------|-------------|
| **Next.js** | 16.2.6 | React framework with App Router |
| **shadcn/ui** | latest | UI component library (base-ui + tailwind) |
| **AI Elements** | 1.9.0 | AI-native components (conversations, messages, code blocks, etc.) |
| **AI SDK** | 6.x | Vercel AI SDK (@ai-sdk/react, @ai-sdk/openai) |
| **Tauri** | 2.11.1 | Cross-platform desktop app framework |
| **React** | 19.2.4 | UI library |
| **Tailwind CSS** | 4.x | Utility-first CSS framework |
| **TypeScript** | 5.9.3 | Type-safe JavaScript |

## Getting Started

### Prerequisites

- **Node.js** 18+ 
- **pnpm** (recommended package manager)
- **Rust** (for Tauri builds) - install via [rustup](https://rustup.rs/)

### Development (Web)

```bash
# Install dependencies
pnpm install

# Start Next.js dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Development (Desktop with Tauri)

```bash
# Start Tauri dev mode (launches desktop window with hot-reload)
pnpm tauri:dev
```

### Building for Desktop

```bash
# Build for all platforms
pnpm tauri:build
```

Build outputs:
- **Windows**: `.msi` installer + `.exe` NSIS installer
- **macOS**: `.dmg` + `.app` bundle
- **Linux**: `.deb` + `.AppImage`

Build artifacts are located in `src-tauri/target/release/bundle/`.

## Project Structure

```
nextbook/
├── src/
│   ├── app/                  # Next.js App Router pages
│   ├── components/
│   │   ├── ui/               # shadcn/ui components (24+ components)
│   │   └── ai-elements/      # AI Elements components (48+ components)
│   └── lib/                  # Utility functions
├── src-tauri/                # Tauri backend (Rust)
│   ├── src/
│   │   ├── main.rs           # Entry point
│   │   └── lib.rs            # Tauri app setup
│   ├── Cargo.toml            # Rust dependencies
│   └── tauri.conf.json       # Tauri configuration
├── public/                   # Static assets
├── next.config.ts            # Next.js config (static export mode)
└── package.json
```

## AI Elements Components

The project includes 48+ AI-native components from Vercel's AI Elements library:

- **conversation** / **message** - Chat interfaces
- **code-block** / **snippet** - Code display with syntax highlighting
- **reasoning** / **chain-of-thought** - AI reasoning visualization
- **prompt-input** / **prompt-form** - Advanced input components
- **tool** / **task** / **plan** - Agent tool usage display
- **sources** / **inline-citation** - Source attribution
- **web-preview** / **jsx-preview** - Live previews
- **canvas** / **file-tree** / **terminal** - Development tools UI
- And many more...

## Configuration

### AI SDK

Set up your AI provider in `.env.local`:

```bash
OPENAI_API_KEY=your_key_here
```

### Tauri

Configure window settings, bundle options, and platform-specific settings in `src-tauri/tauri.conf.json`.

## License

MIT
