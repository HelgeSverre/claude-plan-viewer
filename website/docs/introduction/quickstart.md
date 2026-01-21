---
title: Quickstart
description: Get Claude Plan Viewer running in under 5 minutes
---

# Quickstart

## Prerequisites

Before you begin, make sure you have:

- [Claude Code](https://claude.ai/code) installed and configured
- At least one plan file in `~/.claude/plans/` (created automatically when Claude generates plans)

::: tip
Not sure if you have plans? Run `ls ~/.claude/plans/` to check. If the directory is empty, use Claude Code to create a few plans first.
:::

## Quick Install

### 1. Run the viewer

Open your terminal and run:

```bash
npx claude-plan-viewer
```

This downloads and starts the viewer in one command. No global installation required.

### 2. Open your browser

Navigate to [http://localhost:3000](http://localhost:3000)

The server starts on port 3000 by default. If that port is busy, it automatically finds the next available port and displays the URL in your terminal.

### 3. Browse your plans

You should see a list of all your Claude Code plans. Click any plan to view its content in the detail panel on the right.

## UI Walkthrough

![Claude Plan Viewer interface](/screenshot.png)

### Search and Filter

Use the search bar at the top to filter plans by title or content. You can also filter by project using the dropdown.

### Sorting

Click the column headers to sort by:
- **Title** - alphabetical
- **Project** - group by project name
- **Modified** - most recently updated first
- **Size** - largest plans first

### Viewing Plans

Click a plan row to load its markdown content in the detail panel. The content is rendered with full markdown support including syntax highlighting for code blocks.

## Keyboard Shortcuts

Navigate efficiently without touching your mouse:

| Shortcut | Action |
|----------|--------|
| `Cmd + K` | Focus and select search bar |
| `↑` / `↓` | Navigate up/down through plan list |
| `Enter` | Open selected plan in default editor |
| `F` | Toggle fullscreen reading mode |
| `?` | Show keyboard shortcuts help |
| `Esc` | Clear search / close modals |

::: info
On Windows and Linux, use `Ctrl` instead of `Cmd`.
:::

## Next Steps

- [Installation Options](/introduction/installation) - Install globally or download standalone binaries
- [CLI Reference](/integrations/cli) - Explore all command-line options
- [JSON Export](/guides/json-export) - Export your plans for backup or processing
- [API Reference](/integrations/api) - Integrate with the REST API
