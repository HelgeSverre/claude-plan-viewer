---
title: What is Claude Plan Viewer?
description: A web-based viewer for browsing, searching, and reading Claude Code plans
---

# What is Claude Plan Viewer?

Claude Plan Viewer is a lightweight web application for browsing, searching, and reading your [Claude Code](https://claude.ai/code) plan files.

## What are Plan Files?

When you ask Claude Code to create a plan, it saves the plan as a markdown file in `~/.claude/plans/`. These files contain structured outlines of tasks, goals, and implementation steps that Claude generates to help you work through complex problems.

Over time, you accumulate many plan files. Claude Plan Viewer makes it easy to browse, search, and revisit them.

## What This Tool Does

- **Browse** all your plan files in a clean, searchable table
- **Search** by title, filename, or project name
- **Filter** by project to focus on specific work
- **Sort** by title, project, size, line count, modified date, or created date
- **View** rendered markdown with syntax highlighting
- **Export** plans to JSON via CLI for backup or sharing
- **Open** plans in your default editor with one click
- **Keyboard navigation** — use arrow keys, `j`/`k`, `Cmd+K` to search, `?` for help

## What This Tool Does NOT Do

Claude Plan Viewer is read-only. It does not:

- Create new plans (use Claude Code for that)
- Edit or modify existing plans
- Sync plans across machines (you can export JSON and view it on another machine with `--from-file`)
- Connect to Claude's API

## Quick Look

![Claude Plan Viewer interface](/screenshot.png)

The interface shows your plans in a sortable table on the left, with a detail panel on the right for viewing plan content.

## Next Steps

- [Quick Start](/introduction/quickstart) — Get running in under 5 minutes
- [Installation](/introduction/installation) — Choose your preferred installation method
