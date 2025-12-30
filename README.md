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

## Development

```bash
# Install dependencies
bun install

# Run in development mode with hot reload
bun --hot index.ts
```

## Requirements

- [Bun](https://bun.sh) runtime
- Claude Code with plan files in `~/.claude/plans`

## License

MIT
