# claude-plan-viewer

A web-based viewer for Claude Code plan files stored in `~/.claude/plans`.

![screenshot](https://github.com/helgesverre/claude-plan-viewer/raw/main/screenshot.png)

## Features

- Browse and search all your Claude Code plans
- Sort by title, project, modified date, or size
- Full markdown rendering with syntax highlighting
- Keyboard navigation (arrow keys, Cmd+K for search)
- Dark theme UI

## Installation

### Using npx (recommended)

```bash
npx claude-plan-viewer
```

### Using bunx

```bash
bunx claude-plan-viewer
```

### Global installation

```bash
# With npm
npm install -g claude-plan-viewer

# With bun
bun install -g claude-plan-viewer
```

Then run:

```bash
claude-plan-viewer
```

### Standalone Binary

Download a pre-built binary from the [releases page](https://github.com/helgesverre/claude-plan-viewer/releases) or build your own:

```bash
bun run build
./dist/plans-viewer
```

The binary is fully self-contained (~57MB) and works offline.

## Usage

```bash
# Start on auto-assigned port
claude-plan-viewer

# Start on specific port
claude-plan-viewer --port 8080
```

The server will automatically find an available port if the requested port is in use.

## Development

```bash
# Install dependencies
bun install

# Run in development mode with hot reload
bun run dev
```

## Building

Build standalone binaries for different platforms:

```bash
bun run build              # Current platform
bun run build:macos-arm64  # macOS Apple Silicon
bun run build:macos-x64    # macOS Intel
bun run build:linux-x64    # Linux x64
bun run build:linux-arm64  # Linux ARM64
bun run build:windows      # Windows x64
bun run build:all          # All platforms
```

## Requirements

- [Bun](https://bun.sh) runtime (for development/npx usage)
- Claude Code with plan files in `~/.claude/plans`

Standalone binaries have no external dependencies.

## License

MIT
