---
name: no-presentational-tests
description: Never assert markup, CSS classes or UI copy; test behaviour only
metadata:
  type: feedback
  originSessionId: a1b2c3d4-e5f6-7890-abcd-ef1234567890
  modified: 2026-09-17T14:26:24.088Z
---

Tests assert what a user can do, not how it is rendered. Snapshot and
class-name assertions were removed on 2026-09-17.

**Why:** markup assertions broke on every restyle and never caught a real bug.

**How to apply:** query by role and visible text. See [[testing-strategy]].
