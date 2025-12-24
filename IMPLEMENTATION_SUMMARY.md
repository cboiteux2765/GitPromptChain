# GitPromptChain - Implementation Summary

## What It Does

GitPromptChain is a lightweight proof-of-concept tool that tracks LLM conversation history alongside Git commits. It helps developers visualize and understand the chain of prompts and responses that led to code changes.

## Core Features

- **Prompt Chain Tracking** - Log sequences of prompts and LLM responses
- **File Diff Integration** - Capture code changes associated with each prompt
- **Visualization** - View prompt chains in a readable terminal format
- **CLI & API** - Interactive interface and programmatic library

## Key Components

1. **Data Models** - TypeScript interfaces for chains, steps, and file diffs
2. **PromptChainManager** - Create, save, and load prompt chains
3. **GitIntegration** - Capture file diffs and Git metadata
4. **Visualizer** - Display chains in terminal with diff previews
5. **CLI** - Interactive menu for managing chains

## Usage

### CLI
```bash
npm install -g gitpromptchain
gitpromptchain  # Interactive menu
```

### Programmatic
```typescript
import { PromptChainManager, GitIntegration } from 'gitpromptchain';

const manager = new PromptChainManager({
  storageDir: './.gitpromptchain',
  repoPath: process.cwd()
});

await manager.initialize();
const chain = await manager.startChain('My feature');
await manager.addStep(prompt, response, fileDiffs);
await manager.endChain(commitSha, branch);
await manager.saveChain(chain);
```

## Storage

Chains are stored as JSON files in `.gitpromptchain/` directory with:
- Unique chain IDs
- Timestamps for each step
- Full prompt and response text
- File diffs with line statistics
- Git commit and branch info

## Tech Stack

- TypeScript/Node.js
- `simple-git` for Git operations
- `uuid` for unique identifiers
- JSON file storage
