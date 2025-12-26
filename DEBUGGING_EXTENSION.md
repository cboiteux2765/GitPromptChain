# Debugging the VS Code Extension

Location: `vscode-extension/` (gitignored build output).

## Quick Steps

1) From `vscode-extension/`: `npm run compile`.
2) Press F5 in VS Code to launch the extension host.
3) In the debug window, open the Debug Console (Ctrl+Shift+Y) and confirm activation logs prefixed with `GitPromptChain:`.

If the Chat API is reported as unavailable, update VS Code to 1.93 or later. For full troubleshooting, see `vscode-extension/DEBUGGING.md`.
