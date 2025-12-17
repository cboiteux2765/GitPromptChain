# GitPromptChain User Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Understanding Prompt Chains](#understanding-prompt-chains)
3. [CLI Usage](#cli-usage)
4. [Programmatic Usage](#programmatic-usage)
5. [MCP Integration](#mcp-integration)
6. [Best Practices](#best-practices)

## Getting Started

### Installation

Install globally for CLI access:

```bash
npm install -g gitpromptchain
```

Or install locally in your project:

```bash
npm install gitpromptchain
```

### First Steps

1. Navigate to your Git repository
2. Run the CLI: `gitpromptchain`
3. Start a new prompt chain
4. Add your prompts and responses as you work
5. End and save the chain when done

## Understanding Prompt Chains

A **prompt chain** is a sequence of interactions with an LLM that leads to a particular outcome (usually a commit). Each chain consists of:

- **Prompt Steps**: Individual prompt-response pairs
- **File Diffs**: Changes to files associated with each step
- **Metadata**: Timestamps, commit info, branch name, etc.

### Why Track Prompt Chains?

1. **Learning**: Understand what prompts work well
2. **Documentation**: Record AI contributions to your project
3. **Debugging**: Trace how you arrived at a particular solution
4. **Collaboration**: Share effective prompting strategies with your team

## CLI Usage

### Interactive Menu

The CLI provides an interactive menu with these options:

```
1. Start a new prompt chain
2. Add a prompt step to current chain
3. End current chain and save
4. View a saved chain
5. List all chains
6. Try importing from MCP server
7. Exit
```

### Workflow Example

```bash
# 1. Start the CLI
gitpromptchain

# 2. Choose option 1 to start a new chain
Enter a summary: Implementing user login

# 3. Make code changes and add prompts (option 2)
# Enter prompts and responses as you work

# 4. When done, end and save (option 3)
# The chain is saved with your commit info

# 5. View your chain later (option 4)
# Enter the chain ID to see the full visualization
```

### Storage Location

Chains are stored in `.gitpromptchain/` in your repository root. Add this to your `.gitignore` if you don't want to commit the chains.

## Programmatic Usage

### Basic Example

```typescript
import { PromptChainManager, GitIntegration, createMCPProvider } from 'gitpromptchain';

// Initialize manager
const manager = new PromptChainManager({
  storageDir: './.gitpromptchain',
  repoPath: process.cwd(),
  mcpProvider: createMCPProvider({ enabled: false })
});

await manager.initialize();

// Start chain
const chain = await manager.startChain('Feature description');

// Add steps
const git = new GitIntegration(process.cwd());
const diffs = await git.getUncommittedDiffs();

await manager.addStep(
  'Your prompt here',
  'LLM response here',
  diffs
);

// End and save
const branch = await git.getCurrentBranch();
const completedChain = await manager.endChain(undefined, branch);
await manager.saveChain(completedChain!);
```

### Retrieving Chains

```typescript
// List all chains
const chainIds = await manager.listChains();

// Load a specific chain
const document = await manager.loadChain(chainId);

// Visualize it
import { PromptChainVisualizer } from 'gitpromptchain';
console.log(PromptChainVisualizer.visualizeChain(document));
```

### Capturing File Diffs

```typescript
import { GitIntegration } from 'gitpromptchain';

const git = new GitIntegration(process.cwd());

// Get uncommitted changes
const diffs = await git.getUncommittedDiffs();

// Get diffs for a specific commit
const commitDiffs = await git.getCommitDiffs('abc123');

// Each diff includes:
// - filePath: string
// - changeType: 'added' | 'modified' | 'deleted'
// - diff: string (full git diff)
// - linesAdded: number
// - linesDeleted: number
```

## MCP Integration

### Current Status

The Model Context Protocol (MCP) **does not currently support** retrieving conversation history. This is a limitation of the protocol itself, not this tool.

### What's Available

The tool includes:

1. **MCP provider interface** - Ready for when MCP servers add this capability
2. **Manual logging** - A robust alternative that works today
3. **Extensible architecture** - Easy to add support when available

### Future MCP Support

When MCP servers implement conversation history:

```typescript
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

// Import conversation history
const success = await manager.importFromMCP(sessionId);
```

### Custom MCP Providers

You can implement custom MCP providers:

```typescript
import { MCPConversationProvider, PromptStep } from 'gitpromptchain';

class CustomMCPProvider implements MCPConversationProvider {
  async supportsConversationHistory(): Promise<boolean> {
    // Check if your MCP server supports it
    return true;
  }

  async getConversationHistory(sessionId?: string): Promise<PromptStep[] | null> {
    // Your implementation here
    return null;
  }
}
```

## Best Practices

### When to Create Chains

- **Feature development**: One chain per feature
- **Bug fixes**: One chain per bug
- **Refactoring**: One chain per refactoring session
- **Experiments**: Track exploratory work

### Prompt Step Guidelines

1. **Be specific**: Include the full prompt text
2. **Include context**: What were you trying to achieve?
3. **Record responses**: Save the complete LLM response
4. **Capture diffs**: Associate file changes with each step

### Organization Tips

1. **Descriptive summaries**: Use clear chain summaries
2. **Regular saves**: Don't wait too long to save chains
3. **Review periodically**: Look back at past chains to learn
4. **Clean up**: Archive or delete unsuccessful chains

### Integration with Workflow

#### Git Hooks

You can create a pre-commit hook to remind you to save your chain:

```bash
#!/bin/bash
# .git/hooks/pre-commit

if [ -d ".gitpromptchain" ]; then
  echo "💡 Don't forget to save your GitPromptChain!"
fi
```

#### CI/CD Integration

```yaml
# .github/workflows/ci.yml
- name: Check for prompt chains
  run: |
    if [ -d ".gitpromptchain" ]; then
      echo "Found $(ls .gitpromptchain/*.json | wc -l) prompt chains"
    fi
```

### Privacy and Security

⚠️ **Important**: Prompt chains may contain sensitive information:

- **Code snippets**: May include proprietary code
- **API keys**: Accidentally included in prompts
- **Business logic**: Strategic information

**Recommendations**:

1. Add `.gitpromptchain/` to `.gitignore`
2. Review chains before sharing
3. Redact sensitive information
4. Use separate storage for sensitive projects

### Team Collaboration

If sharing chains with your team:

1. **Standardize format**: Agree on chain naming conventions
2. **Review together**: Use chains in code reviews
3. **Learn collectively**: Share successful prompting patterns
4. **Build a library**: Create a knowledge base of effective prompts

## Troubleshooting

### Chain not saving

- Check write permissions on `.gitpromptchain/`
- Ensure you've called `manager.initialize()`
- Verify the chain has steps before saving

### Git integration errors

- Ensure you're in a Git repository
- Check Git is installed and accessible
- Verify repository has at least one commit

### CLI not starting

- Check Node.js version (requires 14+)
- Verify installation: `npm list -g gitpromptchain`
- Try reinstalling: `npm install -g gitpromptchain`

### Import from MCP fails

This is expected! MCP doesn't support conversation history yet. Use manual logging instead.

## Support

For issues, feature requests, or contributions:
- GitHub Issues: [github.com/cboiteux2765/GitPromptChain](https://github.com/cboiteux2765/GitPromptChain)
