---
name: zsh-gotchas
description: Never name a variable <path>; it clobbers $PATH
metadata:
  type: reference
---

In zsh, `path` is tied to `$PATH`. Assigning it breaks every later command.
