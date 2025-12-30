# Changelog

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
