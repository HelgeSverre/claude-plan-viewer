---
title: CLI Reference
description: Complete reference for all Claude Plan Viewer command-line options
---

# CLI Reference

## Usage

```bash
claude-plan-viewer [options]
```

When run without arguments, Claude Plan Viewer starts a web server on port 3000 and opens the browser interface for browsing plans from `~/.claude/plans`.

## Options

### `--port`, `-p`

**Type:** `number`
**Default:** `3000`

Port to start the server on. If the specified port is in use, the server automatically finds the next available port.

### `--host`, `-H`

**Type:** `string`
**Default:** `localhost`

Host address to bind the server to. Use `0.0.0.0` to listen on all network interfaces, making the server accessible from other devices on the network.

### `--claude-dir`, `-c`

**Type:** `string`
**Default:** `~/.claude`

Path to the `.claude` directory containing your plans and project metadata.

::: info
This can also be set via the `CLAUDE_DIR` environment variable. The CLI flag takes precedence over the environment variable.
:::

### `--json`, `-j`

**Type:** `boolean`

Export all plans as JSON and exit immediately. Does not start the web server.

### `--output`, `-o`

**Type:** `string`

Output file path for JSON export. If omitted, JSON is printed to stdout.

### `--from-file`, `-f`

**Type:** `string`

Load plans from a JSON file instead of scanning `~/.claude/plans`. Useful for viewing exported plans or working offline.

### `--version`, `-v`

**Type:** `boolean`

Show the version number and exit.

### `--help`, `-h`

**Type:** `boolean`

Show the help message and exit.

---

## Examples

### Start the Server

Start the viewer on the default port (3000):

```bash
claude-plan-viewer
```

Start the viewer on a custom port:

::: code-group

```bash [Long form]
claude-plan-viewer --port 8080
```

```bash [Short form]
claude-plan-viewer -p 8080
```

:::

### Listen on All Interfaces

Make the server accessible from other devices on the network:

::: code-group

```bash [Long form]
claude-plan-viewer --host 0.0.0.0
```

```bash [Short form]
claude-plan-viewer -H 0.0.0.0
```

```bash [Combined with port]
claude-plan-viewer --host 0.0.0.0 --port 8080
```

:::

::: warning
Binding to `0.0.0.0` exposes the server to your local network. Only use this on trusted networks.
:::

### Custom Claude Directory

Use a different `.claude` directory location:

::: code-group

```bash [CLI Flag]
claude-plan-viewer --claude-dir /path/to/.claude
```

```bash [Environment Variable]
CLAUDE_DIR=/path/to/.claude claude-plan-viewer
```

```bash [Short form]
claude-plan-viewer -c /path/to/.claude
```

:::

::: info
When both the environment variable and CLI flag are provided, the CLI flag takes precedence.
:::

### Export Plans to JSON

Export all plans to a file for backup or sharing:

::: code-group

```bash [Export to file]
claude-plan-viewer --json --output plans.json
```

```bash [Export to stdout]
claude-plan-viewer --json
```

```bash [Short form]
claude-plan-viewer -j -o plans.json
```

:::

The exported JSON includes full plan content and metadata:

```json
[
  {
    "filename": "abc123def.md",
    "filepath": "/Users/you/.claude/plans/abc123def.md",
    "title": "Implement user authentication",
    "size": 2048,
    "modified": "2025-01-15T10:30:00.000Z",
    "created": "2025-01-15T09:00:00.000Z",
    "lineCount": 45,
    "wordCount": 320,
    "project": "my-app",
    "sessionId": "session-xyz",
    "content": "# Plan: Implement user authentication\n\n..."
  }
]
```

### Load Plans from File

View previously exported plans without accessing the original directory:

::: code-group

```bash [Long form]
claude-plan-viewer --from-file plans.json
```

```bash [Short form]
claude-plan-viewer -f plans.json
```

:::

::: tip
This is useful for sharing plans with team members or viewing plans on a machine without Claude Code installed.
:::

### Combining Options

Run on a custom port with a custom directory:

```bash
claude-plan-viewer --port 4000 --claude-dir ~/backup/.claude
```

Export plans from a custom directory to a file:

```bash
claude-plan-viewer --claude-dir ~/work/.claude --json --output work-plans.json
```

### Development Mode

When running in development, pass CLI flags after `--`:

```bash
bun run dev -- --port 8080
bun run dev -- --from-file plans.json
```

---

## Environment Variables

### `CLAUDE_DIR`

**Type:** `string`

Alternative way to set the `.claude` directory path. The `--claude-dir` CLI flag takes precedence if both are set.

::: code-group

```bash [Set for single command]
CLAUDE_DIR=/custom/path claude-plan-viewer
```

```bash [Export for session]
export CLAUDE_DIR=/custom/path
claude-plan-viewer
```

:::

---

## Exit Codes

| Code | Description |
|------|-------------|
| `0`  | Success (server started, or export/help/version completed) |
| `1`  | Error (file not found, invalid arguments) |

---

## Quick Reference

| Flag | Short | Argument | Description |
|------|-------|----------|-------------|
| `--port` | `-p` | `<number>` | Server port (default: 3000) |
| `--host` | `-H` | `<address>` | Host to bind to (default: localhost) |
| `--claude-dir` | `-c` | `<path>` | Claude directory path |
| `--json` | `-j` | - | Export plans as JSON |
| `--output` | `-o` | `<file>` | Output file for export |
| `--from-file` | `-f` | `<file>` | Load plans from JSON file |
| `--version` | `-v` | - | Show version |
| `--help` | `-h` | - | Show help |
