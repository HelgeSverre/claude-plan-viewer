---
title: Custom Directory
description: Configure Claude Plan Viewer to use a non-standard .claude directory location
---

# Custom Directory

## Overview

By default, Claude Plan Viewer looks for plans in `~/.claude/plans/`. If your Claude Code installation uses a different location, you can specify a custom path using the `--claude-dir` flag or the `CLAUDE_DIR` environment variable.

## CLI Flag

Use `--claude-dir` (or `-c`) to specify a custom `.claude` directory:

```bash
claude-plan-viewer --claude-dir /path/to/.claude
```

Short form:

```bash
claude-plan-viewer -c /path/to/.claude
```

## Environment Variable

Set the `CLAUDE_DIR` environment variable for persistent configuration:

::: code-group

```bash [Export (session)]
export CLAUDE_DIR=/path/to/.claude
claude-plan-viewer
```

```bash [Inline (one-time)]
CLAUDE_DIR=/path/to/.claude claude-plan-viewer
```

```bash [Shell Profile (~/.bashrc or ~/.zshrc)]
export CLAUDE_DIR=/path/to/.claude
```

:::

## Precedence

When both the CLI flag and environment variable are set, the CLI flag takes precedence:

| Configuration | Source Used |
|--------------|-------------|
| Neither set | `~/.claude` (default) |
| Only `CLAUDE_DIR` set | `CLAUDE_DIR` value |
| Only `--claude-dir` set | `--claude-dir` value |
| Both set | `--claude-dir` value |

## Use Cases

- **Non-Standard Installation** - Point to a Claude Code installation in a custom location
- **Multiple Installations** - Switch between different Claude Code configurations
- **Network Storage** - Access plans stored on a mounted network drive or shared filesystem
- **Docker/Container** - Mount and access plans from a containerized environment

## Examples

::: code-group

```bash [Work with external drive]
claude-plan-viewer --claude-dir /Volumes/External/.claude
```

```bash [Access shared team plans]
claude-plan-viewer --claude-dir /mnt/shared/team-claude
```

```bash [Use with export]
claude-plan-viewer --claude-dir /custom/path/.claude --json -o backup.json
```

:::

::: tip
The specified directory should contain `plans/` and optionally `projects/` subdirectories matching the standard Claude Code structure.
:::
