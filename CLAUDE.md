# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Plan Viewer is a web-based viewer for Claude Code plan files (`~/.claude/plans/*.md`) and per-project auto memory (`~/.claude/projects/*/memory/*.md`). It provides a React frontend with a Bun-powered backend that serves plan metadata and content via REST API.

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

**Server** (`index.ts`): Entry point using `Bun.serve()` with HTML imports. Handles:
- Plan scanning from `~/.claude/plans/` directory
- Project metadata extraction from `~/.claude/projects/` JSONL files
- In-memory caching with file watching for live updates
- REST API endpoints

**Session log helpers** (`src/server/projects.ts`): `extractProjectName`, cwd/slug/session matchers and the streaming JSONL reader, shared by plan mapping and the memory scanner.

**Memory scanner** (`src/server/memory.ts`): pure, unit-tested module that reads memory dirs (plus `autoMemoryDirectory` settings), parses frontmatter, resolves links/backlinks, and computes the MEMORY.md load budget. `index.ts` caches its snapshot for 5s.

**React SPA** (`src/client/`): Client-side rendered app bundled automatically by Bun's HTML imports.
- `App.tsx` - Main component, state management, keyboard shortcuts
- `hooks/usePlans.ts` - SWR-based data fetching with client-side filtering/sorting
- `hooks/usePlanContent.ts` - SWR content fetch keyed on filename + modified
- `hooks/useMemory.ts` / `useMemoryContent.ts` - memory list (grouped, filtered) and content
- `App.tsx` switches between the Plans and Memory views (`?view=memory`)
- `hooks/useFilters.ts` - URL-synced filter state (search, sort, projects)
- `components/` - UI components (PlansTable, DetailPanel, Markdown, etc.)

**Data flow**:
1. `/api/plans` returns metadata only (no content) for fast initial load
2. `/api/plans/{filename}/content` fetches content on-demand when plan is selected
3. Content search goes through `/api/search` (the client never holds all content); title/filename/project matching is client-side

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/plans` | GET | List all plans (metadata only) |
| `/api/plans/{filename}/content` | GET | Get plan markdown content |
| `/api/search?q=` | GET | Filenames of plans whose content matches |
| `/api/memory` | GET | Memory sources and entries (metadata only) |
| `/api/memory/content?id=` | GET | Raw memory markdown |
| `/api/memory/search?q=` | GET | Ids of memory entries whose content matches |
| `/api/projects` | GET | List unique project names |
| `/api/refresh` | POST | Force cache refresh |
| `/api/open` | POST | Open a known plan or memory file in system editor |
| `/api/openapi.json` | GET | OpenAPI 3.0 specification |

## Key Patterns

- **Lazy content loading**: Plan content is fetched separately to keep initial load fast
- **Client-side filtering**: All filtering/sorting happens in browser after initial fetch
- **Granular cache invalidation**: File watcher only invalidates changed files, project mapping cached separately
- **URL state sync**: Selected plan and filters persist in URL query params

## Releasing

Run `/release` for minor bump or `/release patch` for patch release. Uses conventional commits (`feat:`, `fix:`, `chore:`, etc.).
