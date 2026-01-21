---
title: Export Plans to JSON
description: Export all your Claude Code plans to JSON format for backup, processing, or migration
---

# Export Plans to JSON

## Overview

The `--json` flag exports all plans from your Claude Code plans directory as structured JSON. This is useful for creating backups, processing plans with external tools, or migrating data between machines.

## Usage

::: code-group

```bash [Export to stdout]
claude-plan-viewer --json
```

```bash [Export to file]
claude-plan-viewer --json --output plans.json
```

```bash [Short flags]
claude-plan-viewer -j -o plans.json
```

:::

## Output Format

The exported JSON contains an array of plan objects with full metadata and content:

```json
[
  {
    "filename": "plan-abc123.md",
    "filepath": "/Users/you/.claude/plans/plan-abc123.md",
    "title": "Implement authentication system",
    "size": 2048,
    "modified": "2025-01-15T10:30:00.000Z",
    "created": "2025-01-14T09:00:00.000Z",
    "lineCount": 45,
    "wordCount": 312,
    "project": "my-app",
    "sessionId": "session-xyz789",
    "content": "# Plan: Implement authentication system\n\n..."
  }
]
```

## Use Cases

- **Backup** - Create regular backups of your Claude Code plans for safekeeping
- **Migration** - Transfer plans between machines or share with team members
- **Processing** - Analyze plans with scripts, generate reports, or feed into other tools
- **Version Control** - Store plan snapshots in git alongside your project code

## Options Reference

| Flag | Short | Description |
|------|-------|-------------|
| `--json` | `-j` | Enable JSON export mode (exits after export) |
| `--output <file>` | `-o` | Save output to file instead of stdout |

::: tip
Combine with `--claude-dir` to export plans from a non-standard location:
```bash
claude-plan-viewer --json --claude-dir /path/to/.claude --output backup.json
```
:::
