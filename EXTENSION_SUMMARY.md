# VS Code Extension Summary

The extension adds a `@chain` participant to VS Code Chat. It captures prompts, responses, and git diffs, then stores them in `.gitpromptchain/` using the same format as the CLI.

## Key Points

- Chat-based chain creation, viewing, and auto-save with uncommitted diffs.
- Runs independently of the CLI but shares the data model and storage layout.
- Uses the proposed VS Code Chat API (`vscode.chat.createChatParticipant`).

## Run and Debug

From `vscode-extension/`:

```bash
npm install
npm run compile
```

Press F5 in VS Code to start the extension host. For troubleshooting, see `vscode-extension/README.md` and `vscode-extension/DEBUGGING.md`.
