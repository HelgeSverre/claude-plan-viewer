---
title: API Reference
description: REST API endpoints for Claude Plan Viewer
---

# API Reference

Claude Plan Viewer exposes a REST API for programmatic access to your Claude Code plans. The API is designed for fast initial loads with lazy content fetching.

::: tip OpenAPI Specification
The full OpenAPI 3.0 specification is available:
- **Interactive**: [API Playground](/reference/api-playground) - try out endpoints directly
- **Download**: [openapi.json](/openapi.json) (for import into API tools, available on docs site)
- **Live**: `/api/openapi.json` when the server is running
:::

## Base URL

All API endpoints are relative to the server root. By default, the server runs on `http://localhost:3000`.

---

## List Plans

**GET** `/api/plans`

Returns metadata for all plans without content. This endpoint is optimized for fast initial page loads.

### Response

Returns an array of plan metadata objects:

| Field | Type | Description |
|-------|------|-------------|
| `filename` | `string` | Plan filename (e.g., `my-plan.md`) |
| `filepath` | `string` | Absolute path to the plan file |
| `title` | `string` | Plan title extracted from the first markdown heading |
| `size` | `integer` | File size in bytes |
| `modified` | `string` | Last modification timestamp (ISO 8601 format) |
| `created` | `string` | Creation timestamp (ISO 8601 format) |
| `lineCount` | `integer` | Number of lines in the plan |
| `wordCount` | `integer` | Number of words in the plan |
| `project` | `string \| null` | Associated Claude Code project name, if any |
| `sessionId` | `string \| null` | Associated Claude Code session ID, if any |

### Example Response

```json
{
  "plans": [
    {
      "filename": "refactor-auth-module.md",
      "filepath": "/Users/dev/.claude/plans/refactor-auth-module.md",
      "title": "Refactor Authentication Module",
      "size": 4521,
      "modified": "2025-01-15T14:32:00.000Z",
      "created": "2025-01-10T09:15:00.000Z",
      "lineCount": 142,
      "wordCount": 856,
      "project": "my-webapp",
      "sessionId": "abc123-def456"
    },
    {
      "filename": "api-redesign.md",
      "filepath": "/Users/dev/.claude/plans/api-redesign.md",
      "title": "API Redesign Plan",
      "size": 2103,
      "modified": "2025-01-14T11:20:00.000Z",
      "created": "2025-01-14T10:00:00.000Z",
      "lineCount": 67,
      "wordCount": 412,
      "project": null,
      "sessionId": null
    }
  ]
}
```

### Use Cases

- **Initial page load**: Fetch all plan metadata to display in a list or table
- **Building search indexes**: Index plans by title, project, or timestamps
- **Filtering and sorting**: Client-side filtering by project, date range, or size

---

## Get Plan Content

**GET** `/api/plans/{filename}/content`

Returns the full markdown content for a specific plan. Use this endpoint to fetch content on-demand when a user selects a plan.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filename` | `string` | Yes | The plan filename (e.g., `my-plan.md`) |

### Response

| Field | Type | Description |
|-------|------|-------------|
| `content` | `string` | The full markdown content of the plan |

### Example Request

```bash
curl http://localhost:3000/api/plans/refactor-auth-module.md/content
```

### Example Response

```json
{
  "content": "# Refactor Authentication Module\n\n## Goals\n\n- Migrate from session-based to JWT authentication\n- Implement refresh token rotation\n- Add rate limiting to login endpoint\n\n## Tasks\n\n- [ ] Create JWT utility functions\n- [ ] Update user model with refresh token field\n- [ ] Modify login endpoint\n- [ ] Add token refresh endpoint\n- [ ] Update middleware\n\n## Notes\n\nConsider using RS256 for production..."
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| 404 | Plan not found |

### Use Cases

- **Lazy loading**: Fetch content only when a plan is selected
- **Markdown rendering**: Get raw content for client-side rendering
- **Content export**: Download plan content for external use

---

## Search Plan Content

**GET** `/api/search?q={query}`

Returns the filenames of plans whose markdown content contains the query (case-insensitive). The web UI combines this with client-side matching on title, filename, and project.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | `string` | Yes | Search text; an empty query returns no matches |

### Example Request

```bash
curl "http://localhost:3000/api/search?q=jwt"
```

### Example Response

```json
{
  "filenames": ["refactor-auth-module.md"]
}
```

---

## List Memory

**GET** `/api/memory`

Returns Claude Code's auto memory: one source per memory directory and one entry per file, without content. Sources come from `~/.claude/projects/*/memory/` and any `autoMemoryDirectory` setting. Results are cached for 5 seconds; `POST /api/refresh` clears the cache.

### Response

| Field | Type | Description |
|-------|------|-------------|
| `sources` | `MemorySource[]` | Memory directories, sorted by project name |
| `entries` | `MemoryEntry[]` | Files in those directories, including each `MEMORY.md` |

**MemorySource**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Project directory name, or `custom-<hash>` for an `autoMemoryDirectory` |
| `kind` | `"project" \| "custom"` | Default project directory or `autoMemoryDirectory` |
| `project` | `string` | Project name from the session cwd; `All projects` for a user-level `autoMemoryDirectory` |
| `cwd` | `string \| null` | Working directory of the project |
| `dir` | `string` | Absolute path of the memory directory |
| `active` | `boolean` | `false` when an `autoMemoryDirectory` setting means Claude Code no longer reads it |
| `index` | `object \| null` | `MEMORY.md` stats: `lines`, `bytes`, `lineLimit` (200), `byteLimit` (25000), `danglingLinks` |
| `orphans` | `string[]` | Topic files `MEMORY.md` doesn't link to |
| `entryCount` | `number` | Topic files, excluding `MEMORY.md` |
| `modified` | `string` | Latest modification of any entry (ISO 8601) |

**MemoryEntry**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | `<sourceId>/<filename>` |
| `sourceId` | `string` | Source this entry belongs to |
| `filename` / `filepath` | `string` | File name and absolute path |
| `isIndex` | `boolean` | `true` for `MEMORY.md` |
| `name` | `string` | Frontmatter `name`, else the first heading, else the filename |
| `description` | `string \| null` | Frontmatter `description` |
| `type` | `string \| null` | `user`, `feedback`, `project`, or `reference` |
| `sessionId` | `string \| null` | Frontmatter `originSessionId` |
| `modified` | `string` | Frontmatter `modified`, else the file's modification time |
| `size` / `lineCount` | `number` | File size in bytes and line count |
| `links` / `linkedFrom` | `string[]` | Filenames this entry links to, and that link to it (markdown links and `[[wikilinks]]`) |
| `inIndex` | `boolean` | Linked from `MEMORY.md` |

### Example Request

```bash
curl http://localhost:3000/api/memory
```

---

## Get Memory Content

**GET** `/api/memory/content?id={id}`

Returns the raw markdown of one memory entry, including frontmatter.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string` | Yes | Entry `id` from `/api/memory` |

```bash
curl "http://localhost:3000/api/memory/content?id=-Users-dev-code-web-app%2FMEMORY.md"
```

```json
{
  "content": "- [Testing strategy](testing-strategy.md) — fixtures over live data\n"
}
```

Returns `404` with `Memory not found` for unknown ids.

---

## Search Memory Content

**GET** `/api/memory/search?q={query}`

Returns the ids of memory entries whose content contains the query (case-insensitive).

```bash
curl "http://localhost:3000/api/memory/search?q=release"
```

```json
{
  "ids": ["-Users-dev-code-web-app/release-checklist.md"]
}
```

---

## List Projects

**GET** `/api/projects`

Returns a list of unique project names associated with plans. Projects are extracted from Claude Code's project metadata.

### Response

| Field | Type | Description |
|-------|------|-------------|
| `projects` | `array` | Array of unique project name strings |

### Example Response

```json
{
  "projects": [
    "my-webapp",
    "api-server",
    "mobile-app",
    "shared-utils"
  ]
}
```

### Use Cases

- **Filter dropdowns**: Populate project filter options in the UI
- **Project overview**: See which projects have associated plans
- **Grouping**: Group plans by project for organization

---

## Refresh Cache

**POST** `/api/refresh`

Invalidates the plan cache and reloads all plans from disk. The server normally watches for file changes automatically, but this endpoint forces an immediate refresh.

### Response

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Whether the cache was refreshed successfully |

### Example Request

```bash
curl -X POST http://localhost:3000/api/refresh
```

### Example Response

```json
{
  "success": true,
  "before": 10,
  "after": 12
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Whether the cache was refreshed successfully |
| `before` | `integer` | Number of plans before refresh |
| `after` | `integer` | Number of plans after refresh |

### Use Cases

- **Manual sync**: Force refresh after external file changes
- **Troubleshooting**: Verify cache is up-to-date
- **Automation**: Refresh cache after batch operations on plan files

---

## Open in Editor

**POST** `/api/open`

Opens the specified plan or memory file in the system's default editor. This uses the operating system's default application for `.md` files.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `filepath` | `string` | Yes | `filepath` of a plan from `/api/plans` or a memory entry from `/api/memory`; any other path is rejected |

### Example Request

```bash
curl -X POST http://localhost:3000/api/open \
  -H "Content-Type: application/json" \
  -d '{"filepath": "/Users/dev/.claude/plans/refactor-auth-module.md"}'
```

### Response

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Whether the file was opened successfully |

### Example Response

```json
{
  "success": true
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| 400 | Invalid path (not a known plan file, or malformed body) |
| 500 | Failed to open file (e.g., editor not available) |

### Use Cases

- **Quick editing**: Open a plan directly from the web UI
- **Integration**: Allow external tools to trigger plan editing
- **Workflow**: Jump from viewing to editing without leaving the context

---

## OpenAPI Specification

**GET** `/api/openapi.json`

Returns the complete OpenAPI 3.0 specification for the API. Use this for generating client libraries, API documentation, or integrating with API tools.

You can also download the specification directly: **[openapi.json](/openapi.json)**

### Example Request

```bash
curl http://localhost:3000/api/openapi.json
```

### Use Cases

- **Client generation**: Generate typed API clients for various languages
- **API testing**: Import into Postman, Insomnia, or other API tools
- **Documentation**: Generate additional API documentation
- **Validation**: Validate requests and responses against the schema

---

## Error Handling

All endpoints return standard HTTP status codes:

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 400 | Bad request (invalid parameters) |
| 404 | Resource not found |
| 500 | Internal server error |

Error responses return plain text messages:

| Endpoint | Status | Message |
|----------|--------|---------|
| `/api/plans/{filename}/content` | 404 | `Plan not found` |
| `/api/memory/content` | 404 | `Memory not found` |
| `/api/open` | 400 | `Invalid path` |
| `/api/open` | 500 | `Failed to open file` |

---

## Rate Limiting

The API does not implement rate limiting by default, as it is designed for local use. If deploying in a shared environment, consider adding a reverse proxy with rate limiting.
