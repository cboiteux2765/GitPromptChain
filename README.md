# GitPromptChain

A lightweight tool for logging LLM conversation history as part of each git commit to help developers prompt better and learn prompting patterns.

## Overview

GitPromptChain helps developers visualize and understand the chain of prompts, responses, and code changes in AI-assisted development workflows.

## Features

- 📝 **Prompt Chain Tracking** - Log sequences of prompts and responses
- 📁 **File Diff Integration** - Associate code changes with each prompt step
- 🔗 **Git Integration** - Link prompt chains to commits and branches
- 📊 **Visualization** - Beautiful terminal output to review chains
- 💾 **JSON Storage** - Simple, portable storage format

## Installation

```bash
npm install gitpromptchain
```

Or install globally to use the CLI:

```bash
npm install -g gitpromptchain
```

## Quick Start

### CLI Usage

```bash
gitpromptchain
```

The CLI provides an interactive menu to:
1. Start a new prompt chain
2. Add prompt steps with responses
3. End and save chains
4. View saved chains
5. List all chains

### Programmatic Usage

```typescript
import { PromptChainManager, GitIntegration } from 'gitpromptchain';

// Initialize
const manager = new PromptChainManager({
  storageDir: './.gitpromptchain',
  repoPath: process.cwd()
});

await manager.initialize();

// Create and track a chain
const chain = await manager.startChain('Feature: User authentication');

const git = new GitIntegration(process.cwd());
const fileDiffs = await git.getUncommittedDiffs();

await manager.addStep(
  'How do I implement JWT authentication?',
  'Here is how to implement JWT auth...',
  fileDiffs
);

// Save the chain
const branch = await git.getCurrentBranch();
const completedChain = await manager.endChain(undefined, branch);
await manager.saveChain(completedChain);
```

## Data Format

Chains are stored as JSON in `.gitpromptchain/`:

```json
{
  "metadata": {
    "version": "1.0.0",
    "created": "2025-12-17T08:32:00.000Z",
    "repository": {
      "name": "my-project",
      "path": "/path/to/project"
    }
  },
  "chain": {
    "chainId": "uuid",
    "startTime": "2025-12-17T08:30:00.000Z",
    "endTime": "2025-12-17T08:45:00.000Z",
    "commitSha": "abc123",
    "branch": "main",
    "summary": "Implementing authentication",
    "steps": [
      {
        "id": "step-uuid",
        "timestamp": "2025-12-17T08:30:00.000Z",
        "prompt": "How do I implement JWT auth?",
        "response": "Here's how...",
        "fileDiffs": [...]
      }
    ]
  }
}
```

## Use Cases

- **Learning Tool** - Analyze which prompts lead to better code
- **Documentation** - Record how AI contributed to your project
- **Workflow Analysis** - Understand your AI-assisted development patterns
- **Team Sharing** - Share successful prompting strategies

## API Reference

### PromptChainManager

#### Methods

- `initialize()` - Set up storage directory
- `startChain(summary?)` - Begin a new prompt chain
- `addStep(prompt, response, fileDiffs?)` - Add a step to current chain
- `endChain(commitSha?, branch?)` - End the current chain
- `saveChain(chain)` - Save a chain to disk
- `loadChain(chainId)` - Load a chain from disk
- `listChains()` - List all stored chains

### GitIntegration

#### Methods

- `getCurrentBranch()` - Get current branch name
- `getLastCommitSha()` - Get last commit SHA
- `getUncommittedDiffs()` - Get diffs for uncommitted changes
- `getCommitDiffs(commitSha)` - Get diffs for a specific commit

### PromptChainVisualizer

#### Methods

- `visualizeChain(document)` - Generate text visualization
- `generateSummary(chain)` - Generate chain summary
- `toJSON(document)` - Convert to JSON

## Development

### Building

```bash
npm run build
```

### Running Demo

```bash
./demo.sh
```

## License

ISC
