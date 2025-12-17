# GitPromptChain

A tool for logging LLM conversation history as part of each commit, helping you visualize the chain of prompts, answers, and file diffs that led to your final result.

## Overview

GitPromptChain helps developers track and visualize how they use LLM conversations to evolve their code. By logging prompts, responses, and associated file changes, you can:

- **Learn from your prompting patterns** - See what prompts led to successful outcomes
- **Debug your workflow** - Understand how a series of prompts led to a particular result
- **Document AI-assisted development** - Keep a record of AI contributions to your codebase
- **Improve future prompts** - Analyze past interactions to refine your approach

## Features

- 📝 **Prompt Chain Tracking** - Log sequences of prompts and responses
- 📁 **File Diff Integration** - Associate code changes with each prompt step
- 🔗 **Git Integration** - Link prompt chains to commits and branches
- 📊 **Visualization** - Beautiful terminal output to review prompt chains
- 🔌 **MCP Support** - Structure for future MCP server integration
- 💾 **Persistent Storage** - JSON-based storage for all prompt chains

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

Start the interactive CLI:

```bash
gitpromptchain
```

Or if installed locally:

```bash
npm run start
```

The CLI provides an interactive menu to:
1. Start a new prompt chain
2. Add prompt steps with responses
3. End and save chains
4. View saved chains
5. List all chains

### Programmatic Usage

```typescript
import { PromptChainManager, GitIntegration, createMCPProvider } from 'gitpromptchain';

// Initialize the manager
const manager = new PromptChainManager({
  storageDir: './.gitpromptchain',
  repoPath: process.cwd(),
  mcpProvider: createMCPProvider({ enabled: false })
});

await manager.initialize();

// Start a new chain
const chain = await manager.startChain('Implementing authentication feature');

// Get file diffs
const gitIntegration = new GitIntegration(process.cwd());
const fileDiffs = await gitIntegration.getUncommittedDiffs();

// Add a step
await manager.addStep(
  'How do I implement JWT authentication in Express?',
  'Here is how to implement JWT auth...',
  fileDiffs
);

// End and save the chain
const branch = await gitIntegration.getCurrentBranch();
const commitSha = await gitIntegration.getLastCommitSha();
const completedChain = await manager.endChain(commitSha, branch);

if (completedChain) {
  await manager.saveChain(completedChain);
}
```

## MCP (Model Context Protocol) Support

### Current Status

The Model Context Protocol (MCP) currently does not include a standard way to retrieve conversation history from LLM servers. This project includes:

1. **Infrastructure for future support** - When MCP servers implement conversation history retrieval, the integration points are ready
2. **Manual logging alternative** - A robust manual approach for logging prompts and responses
3. **Extensible architecture** - Easy to add MCP provider implementations as they become available

### Future MCP Integration

When MCP servers support conversation history:

```typescript
import { createMCPProvider } from 'gitpromptchain';

const mcpProvider = createMCPProvider({
  serverUrl: 'http://localhost:3000',
  authToken: 'your-token',
  enabled: true
});

const manager = new PromptChainManager({
  storageDir: './.gitpromptchain',
  repoPath: process.cwd(),
  mcpProvider
});

// Attempt to import conversation history
await manager.importFromMCP(sessionId);
```

## Data Format

Prompt chains are stored as JSON files in `.gitpromptchain/` directory:

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

### Visual Version Control Systems

Integrate GitPromptChain with visual Git clients (GitHub Desktop, Fork, etc.) to show:
- Prompt chains alongside commit history
- File diffs with associated prompts
- Evolution of code through conversation

### AI-Assisted Development Documentation

- Document how AI tools contributed to your project
- Review what worked and what didn't
- Share successful prompting strategies with your team

### Learning and Improvement

- Analyze patterns in successful vs unsuccessful prompts
- Understand which types of prompts lead to better code
- Build a knowledge base of effective prompting techniques

## API Reference

### PromptChainManager

Main class for managing prompt chains.

#### Methods

- `initialize()` - Set up storage directory
- `startChain(summary?)` - Begin a new prompt chain
- `addStep(prompt, response, fileDiffs?)` - Add a step to current chain
- `endChain(commitSha?, branch?)` - End the current chain
- `saveChain(chain)` - Save a chain to disk
- `loadChain(chainId)` - Load a chain from disk
- `listChains()` - List all stored chains
- `importFromMCP(sessionId?)` - Import from MCP server (when available)

### GitIntegration

Utilities for Git operations and file diff extraction.

#### Methods

- `getCurrentBranch()` - Get current branch name
- `getLastCommitSha()` - Get last commit SHA
- `getUncommittedDiffs()` - Get diffs for uncommitted changes
- `getCommitDiffs(commitSha)` - Get diffs for a specific commit

### PromptChainVisualizer

Visualization utilities for displaying prompt chains.

#### Methods

- `visualizeChain(document)` - Generate text visualization
- `generateSummary(chain)` - Generate chain summary
- `toJSON(document)` - Convert to JSON

## Development

### Building

```bash
npm run build
```

### Running Locally

```bash
npm run start
```

## License

ISC

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Future Enhancements

- [ ] Web UI for visualizing prompt chains
- [ ] Integration with popular Git clients
- [ ] MCP server conversation history retrieval (when available)
- [ ] Export to various formats (Markdown, HTML, PDF)
- [ ] Analytics and insights on prompting patterns
- [ ] Team collaboration features
- [ ] Integration with CI/CD pipelines

