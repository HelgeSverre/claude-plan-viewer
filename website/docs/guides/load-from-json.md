---
title: Load Plans from a File
description: View plans from an exported JSON file instead of the live plans directory
---

# Load Plans from a File

## Overview

The `--from-file` flag allows you to load plans from a previously exported JSON file rather than scanning the live `~/.claude/plans/` directory. This enables offline viewing and sharing plans across machines.

## Usage

```bash
claude-plan-viewer --from-file plans.json
```

Or using the short flag:

```bash
claude-plan-viewer -f plans.json
```

## Workflow Example

### 1. Export plans on Machine A

```bash
claude-plan-viewer --json --output plans.json
```

### 2. Transfer the file

Copy `plans.json` to Machine B via USB, cloud storage, or any file transfer method.

### 3. View plans on Machine B

```bash
claude-plan-viewer --from-file plans.json
```

## Behavior Differences

When loading from a file, the following behaviors change:

::: warning
**File watching is disabled** when using `--from-file`. The viewer displays a static snapshot of plans from the JSON file. Changes to the source file after startup are not detected.
:::

| Feature | Normal Mode | From File Mode |
|---------|-------------|----------------|
| File watching | Enabled | Disabled |
| Live updates | Yes | No |
| Refresh API | Reloads from disk | Reloads from disk (not JSON file) |
| Open in editor | Works | May fail if paths differ |

::: warning
Calling the refresh API (`POST /api/refresh`) in from-file mode will reload plans from the default `~/.claude/plans` directory, replacing your JSON snapshot.
:::

## Use Cases

- **Offline Viewing** - View plans without access to the original Claude Code installation
- **Team Sharing** - Share a snapshot of plans with colleagues for review or collaboration
- **Historical Review** - Load older backups to review past planning sessions
- **Demo Mode** - Present plans in environments without Claude Code installed

::: info
The JSON file must match the format produced by `--json` export. See [JSON Export](/guides/json-export) for details on the expected structure.
:::
