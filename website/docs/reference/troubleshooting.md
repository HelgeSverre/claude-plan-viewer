---
title: FAQ & Troubleshooting
description: Common issues and solutions for Claude Plan Viewer
---

# FAQ & Troubleshooting

## No Plans Found

**Symptom:** The viewer shows an empty list or "No plans found" message.

**Solutions:**

1. **Check if the plans directory exists:**
   ```bash
   ls ~/.claude/plans/
   ```
   If the directory doesn't exist, create it:
   ```bash
   mkdir -p ~/.claude/plans
   ```
   Then create some plans in Claude Code.

2. **Verify the directory path:**
   If your Claude installation uses a non-standard location, specify it:
   ```bash
   claude-plan-viewer --claude-dir /path/to/.claude
   ```

3. **Check file permissions:**
   Ensure your user has read access to the plans directory:
   ```bash
   ls -la ~/.claude/plans/
   ```

## Server Started on Unexpected Port

**Symptom:** The server starts on a port other than 3000.

**Explanation:** Claude Plan Viewer automatically finds an available port if the default (3000) is in use. Check the startup message for the actual URL.

**Solution:** To use a specific port:

```bash
claude-plan-viewer --port 8080
```

::: tip
Always use the URL printed in the terminal when the server starts, as the port may vary.
:::

## Plans Not Updating

**Symptom:** New or modified plans don't appear in the viewer.

**Solutions:**

1. **Force a refresh** using the API (replace port with your actual port):
   ```bash
   curl -X POST http://localhost:3000/api/refresh
   ```

2. **Restart the server** — file watching may have encountered an issue.

3. **Check if using `--from-file`** — when loading from a JSON file, live updates are disabled. Note that calling the refresh API in this mode will reload from disk, replacing your JSON snapshot.

## "Open in Editor" Not Working

**Symptom:** Clicking "Open in Editor" does nothing or shows an error.

**Solutions:**

1. **Check your default app for `.md` files:**
   - macOS: Right-click a `.md` file → Get Info → Open With
   - Linux: Check your `xdg-mime` settings
   - Windows: Right-click → Open With → Choose default app

2. **Verify the file path exists:**
   If you moved or deleted the plan file, the open action will fail.

3. **When using `--from-file`:**
   The file paths in the JSON may not match your current machine. Open in editor only works when the original files are accessible.

## Permission Denied

**Symptom:** Errors about permission when starting the server or accessing plans.

**Solutions:**

1. **Check directory permissions:**
   ```bash
   chmod 755 ~/.claude
   chmod 644 ~/.claude/plans/*.md
   ```

2. **Check if another process has locked the files.**

## Server Not Accessible from Other Devices

**Symptom:** You can access the viewer on `localhost` but not from other devices on your network.

**Solution:** Bind to all network interfaces:

```bash
claude-plan-viewer --host 0.0.0.0
```

::: warning
This exposes the server to your local network. Only use on trusted networks.
:::

## JSON Export is Empty

**Symptom:** Running `--json` produces an empty array `[]`.

**Solution:** This means no plan files were found. See [No Plans Found](#no-plans-found) above.

## Project Filter Not Showing

**Symptom:** The project dropdown filter doesn't appear in the header.

**Explanation:** Project detection requires Claude Code's project metadata in `~/.claude/projects/`. If this directory is missing or empty, projects cannot be detected.

**Solution:** This is expected behavior if you haven't used Claude Code with project-based sessions. The filter will appear once project metadata exists.

## Plan Content Not Loading

**Symptom:** Clicking a plan shows an error or empty content.

**Solutions:**

1. **Check if the file still exists** — the plan may have been deleted while the viewer was open.

2. **Refresh the plan list** — click the refresh button in the header or restart the server.

## Still Having Issues?

If you're experiencing a problem not covered here:

1. Check the [GitHub Issues](https://github.com/HelgeSverre/claude-plan-viewer/issues) for similar reports
2. Open a new issue with:
   - Your operating system and version
   - How you installed the viewer (npx, binary, etc.)
   - The exact error message or unexpected behavior
   - Steps to reproduce the issue
