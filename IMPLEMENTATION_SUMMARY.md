gitpromptchain  # Interactive menu
# GitPromptChain - Implementation Summary

Tracks prompt/response chains with git metadata and diffs, saved as JSON under `.gitpromptchain/`.

## Core Pieces

- Data models for chains, steps, file diffs
- `PromptChainManager` for lifecycle and storage
- `GitIntegration` for diffs and branch/commit info
- `PromptChainVisualizer` for terminal output
- CLI and programmatic entry points

## Usage

CLI: `npm install -g gitpromptchain` then `gitpromptchain`.

Programmatic:
```typescript
const manager = new PromptChainManager({ storageDir: '.gitpromptchain', repoPath: process.cwd() });
await manager.initialize();
const chain = await manager.startChain('My feature');
await manager.addStep(prompt, response, fileDiffs);
await manager.endChain(commitSha, branch);
await manager.saveChain(chain);
```

## Storage and Stack

- JSON files with IDs, timestamps, prompts/responses, diffs, commit/branch
- TypeScript/Node.js, `simple-git`, `uuid`
