# GitPromptChain

A lightweight tool for logging LLM conversation history as part of each git commit to help developers prompt better and learn prompting patterns.

## Overview

GitPromptChain helps developers visualize and understand the chain of prompts, responses, and code changes in AI-assisted development workflows.

## Features

- 📝 **Prompt Chain Tracking** - Log sequences of prompts and responses
- 📁 **File Diff Integration** - Associate code changes with each prompt step
- 🔗 **Git Integration** - Link prompt chains to commits and branches
- 🧭 **Per-Commit History** - Store conversations under `.gitpromptchain/commits/<sha>/`
- 📊 **Visualization** - Beautiful terminal output to review chains
- 🎯 **Prompt Analysis** - Get tips to improve your prompting style
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
2. Add prompt steps with responses (chain stays active!)
3. Save and finalize the chain
4. View saved chains with metrics tables
5. View chains by commit SHA

#### Git Subcommand

If installed globally, you can invoke via Git's extension mechanism:

```bash
git promptchain
```

This uses the `git-promptchain` binary to integrate naturally with Git workflows.

### VS Code Extension

GitPromptChain is also available as a VS Code extension with integrated Chat API support.

**Installation:**
1. Open the extension folder: `vscode-extension/`
2. Run `npm install`
3. Press `F5` to launch the extension in debug mode

**Usage in Chat:**

Use the `@chain` participant in VS Code Chat:

- **Start a new chain:**
  ```
  @chain /new Feature: User authentication
  ```

- **Add a prompt (auto-saves with file changes):**
  ```
  @chain How do I implement JWT authentication?
  ```

- **View saved chains:**
  ```
  @chain /view
  ```

The extension automatically:
- Captures file diffs when you ask questions
- Saves chains with commit information
- Tracks git branch and commit SHA
- Stores everything in `.gitpromptchain/` directory
- Saves a copy under `.gitpromptchain/commits/<sha>/` and maintains `commit-index.json` to quickly find chains by commit

**Viewing Metrics:**

When you view a chain, you'll see a beautiful metrics table:

```
╔════════════════════════════════════════════════════════════╗
║                    CHAIN METRICS                           ║
╠════════════════════════════════════════════════════════════╣
║ Chain ID:           3c715658-3e33-4f1b-9fd4-5ed769916aca ║
║ Summary:            Demo: Authentication Feature         ║
╠════════════════════════════════════════════════════════════╣
║                    TIME & PROGRESS                         ║
╠════════════════════════════════════════════════════════════╣
║ Duration:           15m 23s                              ║
║ Total Steps:        5                                    ║
║ Steps w/ Changes:   4                                    ║
╠════════════════════════════════════════════════════════════╣
║                    FILE CHANGES                            ║
╠════════════════════════════════════════════════════════════╣
║ Files Changed:      3                                    ║
║ Lines Added:        127                                  ║
║ Lines Deleted:      12                                   ║
║ Net Change:         115                                  ║
╠════════════════════════════════════════════════════════════╣
║                    PROMPT ANALYSIS                         ║
╠════════════════════════════════════════════════════════════╣
║ Total Characters:   423                                  ║
║ Avg Characters:     84                                   ║
║ Questions (?):      2                                    ║
║ Commands/Actions:   3                                    ║
║ Descriptions:       0                                    ║
╚════════════════════════════════════════════════════════════╝

💡 Prompting Tips:
   ✅ Prompt Length: Great! (avg 84 chars is ideal)
   ✅ Prompt Style: Excellent! You use DIRECT COMMANDS (60%)
   ✅ Results: Excellent! 80% of prompts led to changes
```


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
    },
    "metrics": {
      "durationMs": 900000,
      "modificationSteps": 2,
      "uniqueFilesChanged": 3,
      "totalLinesAdded": 42,
      "totalLinesDeleted": 7,
      "prompts": {
        "totalLengthChars": 120,
        "avgLengthChars": 60,
        "styleCounts": { "interrogative": 1, "imperative": 1, "narrative": 0 }
      }
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

- **Learning Tool** - Analyze which prompts lead to better code with detailed metrics
- **Prompt Improvement** - Get AI-powered tips to improve your prompting style
- **Documentation** - Record how AI contributed to your project
- **Workflow Analysis** - Understand your AI-assisted development patterns
- **Team Sharing** - Share successful prompting strategies

## Metrics & Analysis

When you view a saved chain, GitPromptChain displays:

**Time & Progress:**
- Total duration from first to last prompt
- Number of steps that resulted in code changes
- Overall workflow efficiency

**File Changes:**
- Unique files modified across all steps
- Lines added/deleted and net change
- Code impact measurement

**Prompt Analysis:**
- Average prompt length
- Prompt style breakdown (questions vs commands vs descriptions)
- Personalized tips to improve your prompting

**Example Prompting Tips:**
- "Your prompts are quite short. Try adding more context for better results."
- "You ask many questions. Try direct commands like 'Add...', 'Fix...', 'Update...'"
- "Only 30% of prompts resulted in changes. Be more specific about WHAT to modify."

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

## Testing

### Unit Tests

Run the full unit test suite (metrics, storage, Git integration, visualization):

```bash
npm test
```

Watch mode for development:

```bash
npm run test:watch
```

With coverage:

```bash
npm run test:coverage
```

### Integration Test

Run the end-to-end workflow test (creates chains, adds steps, verifies commit indexing and metrics):

```bash
npm run test:workflow
```

This tests:
- Creating a new chain
- Adding steps with file diffs
- Saving chains with commit SHAs
- Computing metrics (duration, files, lines, prompt styles)
- Commit indexing and lookup
- Multiple chains per commit
- Visualization output

### Manual Testing

#### CLI

Interactive CLI for testing locally:

```bash
npm start
```

Menu options:
- **start** - Start a new prompt chain with an optional summary
- **add** - Add a prompt step to the current chain (auto-captures git diffs, chain stays active)
- **save** - Save and finalize the current chain (links to commit SHA)
- **view** - View a saved chain by ID or number (with metrics table)
- **viewc** - View chains associated with a commit (defaults to HEAD)
- **exit** - Exit

**Workflow Example:**
```
1. start → "Feature: User authentication"
2. add → "How do I implement JWT?"        (chain stays active)
3. add → "Add token validation?"          (chain still active)
4. add → "Create middleware?"             (chain still active)
5. save → Finalizes and saves to .gitpromptchain with commit SHA
```

#### VS Code Extension

1. Open `vscode-extension/` folder in VS Code
2. Press `F5` to launch the extension in debug mode
3. Open the Chat view and use the `@chain` participant:

```
@chain /new Feature: My feature description
@chain What should I implement first?
@chain /view
@chain /commit  (view chains for current HEAD commit)
```

### Running Demo

View the complete workflow with metrics and prompting tips:

```bash
npm run demo
```

Or explore manually:

```bash
./demo.sh
```

## License

ISC
