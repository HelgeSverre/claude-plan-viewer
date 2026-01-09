# Changelog

## [1.4.1] - 2026-01-09

### Fixed

- Include `openapi.json` in npm package (was missing, causing `bunx`/`npx` to fail)

## [1.4.0] - 2026-01-09

### Changed

- Replaced inlined PrismJS bundle with npm package for easier maintenance
- Switched to Atom Dark syntax highlighting theme
- Increased code font size to 13px for better readability
- Refresh button now shows animated spinner while loading
- Compact metadata display: relative time first, then "Jan 7 · 03:30" format
- Created date only shown when different from modified date

### Added

- New `--claude-dir` / `-c` CLI flag to specify custom `.claude` directory path
- Support for `CLAUDE_DIR` environment variable as alternative to CLI flag
- CLI flag takes precedence over environment variable when both are set
- Extended syntax highlighting support: C, C++, C#, Java, PHP, Ruby, Rust, YAML, Markdown, Diff, Docker, JSX, TSX, SCSS
- API now returns before/after plan counts on refresh for smarter UI updates
- Focus trapping in modals for improved keyboard accessibility
- Click-to-copy filepath button in detail metadata

### Fixed

- Granular cache invalidation: plan file changes no longer rebuild project mapping
- Parallelized project directory scanning (~2x faster initial load)

## [1.3.0] - 2025-01-08

### Changed

- Migrated frontend from vanilla JavaScript to React components
- Added React Select for improved dropdown interactions

### Dependencies

- Added React 19, React DOM, and React Select

## [1.2.0] - 2025-01-02

### Added

- Fullscreen detail overlay for viewing plans (press `f` or click expand icon)
- Filename column in the plans table
- Creation date column (YYYY-MM-DD format) at start of table
- Lazy content loading - plan content fetched on-demand for faster initial load
- API pagination support (`offset`/`limit` query params)

### Changed

- Improved performance with server-side caching of plans and project mappings
- Plans list now loads progressively with infinite scroll

## [1.1.1] - 2024-12-30

### Fixed

- Loading and empty state now properly centered in viewport

## [1.1.0] - 2024-12-30

### Added

- Cross-platform support for Windows, Linux, and macOS
- Project detection using Claude Code's JSONL metadata (`cwd` field)
- Comprehensive test suite (49 tests)

### Changed

- Project names now extracted from actual file paths instead of encoded directory names
- Hyphenated project names (e.g., `plans-viewer`, `my-cool-app`) now work correctly

### Fixed

- Project detection for nested folder structures (e.g., `Documents/code/project`)

## [1.0.0] - 2024-12-30

### Added

- Initial release
- Web-based viewer for Claude Code plan files
- Search and filter plans
- Syntax highlighting for code blocks
- Project grouping
- Dark theme
- Open plans in default editor
- Standalone binary support
