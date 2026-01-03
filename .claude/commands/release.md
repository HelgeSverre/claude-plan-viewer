---
description: "Perform a new release with version bump, changelog update, and GitHub release"
argument-hint: "[patch|minor|major]"
---

# Release Command

Perform a complete release for the plans-viewer project. Default bump type is `minor`.

**Argument:** `$ARGUMENTS` (optional: `patch`, `minor`, or `major` - defaults to `minor`)

## Release Workflow

Execute these steps in order:

### 1. Verify Code Quality

Run tests and build to ensure code is not broken:

```bash
bun test
bun run build
```

**STOP if either command fails.** Report the error and do not proceed with the release.

### 2. Check for Uncommitted Changes

Run `git status` to check for uncommitted changes.

If there are unstaged or uncommitted changes:
- Review what changed
- Commit them using conventional commit format (e.g., `feat(scope):`, `fix(scope):`, `chore(scope):`)
- Keep commits small and atomic when feasible
- Do NOT split changes into multiple commits if git makes it difficult (e.g., interleaved changes in the same file)

### 3. Determine Version Bump

1. Read the current version from `package.json`
2. Parse the bump type from `$ARGUMENTS` (default: `minor`)
3. Calculate the new version:
   - `patch`: 1.1.1 -> 1.1.2
   - `minor`: 1.1.1 -> 1.2.0
   - `major`: 1.1.1 -> 2.0.0

### 4. Update CHANGELOG.md

1. Read `CHANGELOG.md` and check if it already has an entry for the new version
2. If missing, generate changelog entry from git commits since the last tag:
   - Use `git log --oneline $(git describe --tags --abbrev=0)..HEAD` to see commits
   - Group by type: Added (feat), Changed, Fixed (fix)
3. Add new version section at the top (after the header), following Keep a Changelog format:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features from feat() commits

### Changed
- Changes from other commits

### Fixed
- Bug fixes from fix() commits
```

**Important:** Do not skip versions. If the last version in CHANGELOG is 1.1.1 and you're releasing 1.2.0, ensure no versions are skipped.

### 5. Update package.json Version

Edit `package.json` to update the `version` field to the new version.

### 6. Create Release Commit

Commit the version bump and changelog update:

```bash
git add package.json CHANGELOG.md
git commit -m "chore(release): vX.Y.Z - brief summary"
```

The summary should briefly describe the main changes in this release.

### 7. Tag the Release

```bash
git tag vX.Y.Z
```

### 8. Push to Remote

```bash
git push && git push --tags
```

### 9. Create GitHub Release

Extract the changelog entry for this version and create a GitHub release:

```bash
gh release create vX.Y.Z --title "vX.Y.Z" --notes "CHANGELOG_ENTRY_HERE"
```

Use a heredoc for the notes if the changelog entry spans multiple lines.

## Completion

Report the release summary:
- Previous version -> New version
- Changes included
- GitHub release URL
