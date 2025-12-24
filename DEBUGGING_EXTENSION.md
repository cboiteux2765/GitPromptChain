# Debugging the VS Code Extension

The extension is in development under `vscode-extension/` (which is gitignored).

## Quick Debug Checklist

When the extension doesn't work:

1. **Recompile:**
   ```bash
   cd vscode-extension
   npm run compile
   ```

2. **Launch debug session:**
   - Open VS Code workspace
   - Press **F5**
   - A new window opens with the extension

3. **Check Debug Console:**
   - In the debug window, press **Ctrl+Shift+Y**
   - Look for messages starting with `GitPromptChain:`
   - Should see: `GitPromptChain extension activated successfully`

4. **If you see errors:**
   - **"Chat API not available"** → Update VS Code to 1.93+
   - **Other errors** → Check the error message for specifics
   - **No messages** → Extension didn't load (check activation events)

5. **Test the extension:**
   - Press **Ctrl+Shift+I** to open Chat
   - Type: `@chain /new Test`
   - Should get a response with a chain ID

## Full Debugging Guide

See `vscode-extension/DEBUGGING.md` for detailed troubleshooting steps.

## Key Files

- `vscode-extension/src/extension.ts` - Main extension code with error handling
- `vscode-extension/package.json` - Manifest with Chat API enabled
- `vscode-extension/dist/` - Compiled JavaScript output

## Common Fixes

- **Extension not appearing:** Reload debug window (`Ctrl+Shift+F5`)
- **Git diffs not captured:** Ensure git is in PATH (`git --version` in terminal)
- **Slow response:** Check that file system operations are completing
- **Build errors:** Run `npm install` in vscode-extension folder
