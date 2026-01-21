# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Plan Viewer is a web-based viewer for Claude Code plan files (`~/.claude/plans/*.md`). It provides a React frontend with a Bun-powered backend that serves plan metadata and content via REST API.

**Website:** https://claudeplans.dev

## Commands

```bash
bun install              # Install dependencies
bun run dev              # Development server with HMR
bun run test             # Run all tests (NOT `bun test`)
bun run test:api         # Run API tests only
bun run test:e2e         # Run Playwright E2E tests
bun run build            # Build standalone binary for current platform
bun run build:all        # Build for all platforms
bun run format           # Format code with Prettier
```

To pass CLI flags in dev mode: `bun run index.ts -- --from-file plans.json`

## Architecture

**Single-file server** (`index.ts`): Entry point using `Bun.serve()` with HTML imports. Handles:
- Plan scanning from `~/.claude/plans/` directory
- Project metadata extraction from `~/.claude/projects/` JSONL files
- In-memory caching with file watching for live updates
- REST API endpoints

**React SPA** (`src/client/`): Client-side rendered app bundled automatically by Bun's HTML imports.
- `App.tsx` - Main component, state management, keyboard shortcuts
- `hooks/usePlans.ts` - SWR-based data fetching with client-side filtering/sorting
- `hooks/useFilters.ts` - URL-synced filter state (search, sort, projects)
- `components/` - UI components (PlansTable, DetailPanel, Markdown, etc.)

**Data flow**:
1. `/api/plans` returns metadata only (no content) for fast initial load
2. `/api/plans/{filename}/content` fetches content on-demand when plan is selected
3. Client caches content locally to persist across filter changes

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/plans` | GET | List all plans (metadata only) |
| `/api/plans/{filename}/content` | GET | Get plan markdown content |
| `/api/projects` | GET | List unique project names |
| `/api/refresh` | POST | Force cache refresh |
| `/api/open` | POST | Open plan in system editor |
| `/api/openapi.json` | GET | OpenAPI 3.0 specification |

## Key Patterns

- **Lazy content loading**: Plan content is fetched separately to keep initial load fast
- **Client-side filtering**: All filtering/sorting happens in browser after initial fetch
- **Granular cache invalidation**: File watcher only invalidates changed files, project mapping cached separately
- **URL state sync**: Selected plan and filters persist in URL query params

## Releasing

Run `/release` for minor bump or `/release patch` for patch release. Uses conventional commits (`feat:`, `fix:`, `chore:`, etc.).
