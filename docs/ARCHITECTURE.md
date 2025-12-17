# GitPromptChain Architecture

## Overview

GitPromptChain is designed to track and visualize LLM conversation history alongside version control, helping developers understand how AI-assisted development led to their final code.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         User Layer                          │
│  ┌─────────────────┐           ┌──────────────────────┐    │
│  │   CLI Interface │           │  Programmatic API     │    │
│  └────────┬────────┘           └──────────┬───────────┘    │
└───────────┼────────────────────────────────┼────────────────┘
            │                                │
            └────────────────┬───────────────┘
                             │
┌────────────────────────────┼────────────────────────────────┐
│                    Core Layer                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          PromptChainManager                          │   │
│  │  - Start/End chains                                  │   │
│  │  - Add steps                                         │   │
│  │  - Save/Load chains                                  │   │
│  └─────────┬──────────────────┬─────────────────┬──────┘   │
│            │                  │                 │            │
│  ┌─────────▼─────────┐  ┌────▼──────────┐  ┌──▼─────────┐ │
│  │PromptChainVisualizer│ │GitIntegration│  │MCPProvider │ │
│  │ - Text rendering    │ │ - Diff capture│  │ - History  │ │
│  │ - Summary generation│ │ - Branch info │  │   retrieval│ │
│  └─────────────────────┘  └───────────────┘  └────────────┘ │
└──────────────────────────────────────────────────────────────┘
            │                  │                 │
┌───────────┼──────────────────┼─────────────────┼────────────┐
│                    Storage Layer                             │
│  ┌─────────▼────────┐  ┌────▼──────────┐  ┌──▼──────────┐  │
│  │  JSON Files      │  │ Git Repository│  │ MCP Server  │  │
│  │  .gitpromptchain/│  │               │  │ (future)    │  │
│  └──────────────────┘  └───────────────┘  └─────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Data Models (`src/models/`)

#### PromptChain.ts

Defines the core data structures:

- **PromptStep**: Single prompt-response exchange
- **FileDiff**: File change information
- **PromptChain**: Complete chain with metadata
- **PromptChainDocument**: Storage format with metadata

**Design Decisions**:
- UUID-based IDs for unique identification
- ISO timestamps for portability
- Separate metadata from chain data for extensibility

### 2. Core Logic (`src/core/`)

#### PromptChainManager.ts

Central orchestrator for all prompt chain operations.

**Responsibilities**:
- Chain lifecycle management (start, add step, end)
- Persistence (save/load)
- MCP integration coordination
- Storage directory management

**Key Methods**:
```typescript
startChain(summary?: string): Promise<PromptChain>
addStep(prompt, response, fileDiffs?): Promise<PromptStep>
endChain(commitSha?, branch?): Promise<PromptChain | null>
saveChain(chain): Promise<string>
loadChain(chainId): Promise<PromptChainDocument | null>
importFromMCP(sessionId?): Promise<boolean>
```

#### PromptChainVisualizer.ts

Handles visualization and formatting of prompt chains.

**Features**:
- Text-based visualization with Unicode box drawing
- Summary generation
- Diff preview truncation
- Duration formatting

**Design Decisions**:
- Terminal-friendly output (80 columns)
- Truncated diffs for readability
- Clear visual hierarchy with borders and icons

### 3. Git Integration (`src/utils/`)

#### GitIntegration.ts

Interfaces with Git repository using `simple-git`.

**Capabilities**:
- Capture uncommitted file diffs
- Retrieve commit diffs
- Get branch and commit information
- Parse diff statistics

**Design Decisions**:
- Async operations for large diffs
- Error handling for non-Git directories
- Separate file statistics from diff content

### 4. MCP Integration (`src/mcp/`)

#### MCPProvider.ts

Provides structure for MCP server integration.

**Current Status**: 
- MCP protocol does **not** support conversation history retrieval
- Interface defined for future compatibility
- Placeholder implementation with proper messaging

**Architecture**:
```typescript
interface MCPConversationProvider {
  supportsConversationHistory(): Promise<boolean>
  getConversationHistory(sessionId?): Promise<PromptStep[] | null>
}
```

**Future Extension**:
When MCP servers support conversation history:
1. Implement `CustomMCPProvider` extending the interface
2. Add HTTP/WebSocket client for MCP communication
3. Parse MCP conversation format to `PromptStep[]`
4. Update `createMCPProvider()` factory

### 5. User Interfaces

#### CLI (`src/cli.ts`)

Interactive terminal interface using Node.js readline.

**Features**:
- Menu-driven interaction
- Multi-line input support
- Real-time file diff capture
- Chain visualization

#### Programmatic API (`src/index.ts`)

Exports clean API for library usage:
- All data models
- Core managers
- Utility functions
- Type definitions

## Data Flow

### Creating a Prompt Chain

```
User initiates → PromptChainManager.startChain()
                 ↓
              Create PromptChain object
                 ↓
              Store in memory
                 ↓
User adds steps → PromptChainManager.addStep()
                 ↓
              GitIntegration.getUncommittedDiffs()
                 ↓
              Create PromptStep with diffs
                 ↓
              Add to chain.steps[]
                 ↓
User ends chain → PromptChainManager.endChain()
                 ↓
              GitIntegration.getCurrentBranch()
                 ↓
              Update chain metadata
                 ↓
              PromptChainManager.saveChain()
                 ↓
              Write JSON to .gitpromptchain/
```

### Viewing a Chain

```
User requests → PromptChainManager.loadChain(id)
                ↓
             Read JSON file
                ↓
             Parse to PromptChainDocument
                ↓
             PromptChainVisualizer.visualizeChain()
                ↓
             Format and display
```

## Storage Format

### Directory Structure

```
.gitpromptchain/
├── chain-{uuid-1}.json
├── chain-{uuid-2}.json
└── chain-{uuid-3}.json
```

### JSON Schema

```json
{
  "metadata": {
    "version": "1.0.0",
    "created": "ISO-8601 timestamp",
    "repository": {
      "name": "string",
      "path": "string"
    }
  },
  "chain": {
    "chainId": "uuid",
    "startTime": "ISO-8601 timestamp",
    "endTime": "ISO-8601 timestamp",
    "commitSha": "string",
    "branch": "string",
    "summary": "string",
    "steps": [
      {
        "id": "uuid",
        "timestamp": "ISO-8601 timestamp",
        "prompt": "string",
        "response": "string",
        "fileDiffs": [
          {
            "filePath": "string",
            "changeType": "added|modified|deleted",
            "diff": "string",
            "linesAdded": number,
            "linesDeleted": number
          }
        ]
      }
    ]
  }
}
```

## MCP Integration Strategy

### Why MCP?

The Model Context Protocol (MCP) is designed to connect LLMs with external systems. However, the current specification focuses on:
- Tool/function calling
- Resource access
- Prompting templates

**Conversation history retrieval is NOT part of the standard.**

### Current Approach

1. **Defined Interface**: Ready for future MCP support
2. **Manual Logging**: Primary method for capturing conversations
3. **Extensible Design**: Easy to add MCP providers as they become available

### Future MCP Support

If/when MCP servers add conversation history:

#### 1. Server Discovery
```typescript
async supportsConversationHistory(): Promise<boolean> {
  const response = await fetch(`${serverUrl}/capabilities`);
  return response.features.includes('conversation-history');
}
```

#### 2. History Retrieval
```typescript
async getConversationHistory(sessionId: string): Promise<PromptStep[]> {
  const response = await fetch(`${serverUrl}/conversations/${sessionId}`);
  return response.messages.map(msg => ({
    id: msg.id,
    timestamp: new Date(msg.timestamp),
    prompt: msg.role === 'user' ? msg.content : '',
    response: msg.role === 'assistant' ? msg.content : '',
  }));
}
```

#### 3. Real-time Integration
```typescript
// WebSocket connection for live updates
const ws = new WebSocket(`${serverUrl}/conversations/stream`);
ws.on('message', (data) => {
  const step = parseToPromptStep(data);
  manager.addStep(step.prompt, step.response);
});
```

### Alternative: Git Hooks Integration

For automated capture without MCP:

```bash
# .git/hooks/post-commit
#!/bin/bash
# Automatically capture commit with last prompt chain
gitpromptchain link-last-chain $(git rev-parse HEAD)
```

## Technology Stack

- **TypeScript**: Type-safe development
- **Node.js**: Cross-platform runtime
- **simple-git**: Git operations
- **uuid**: Unique identifier generation
- **readline**: CLI interaction

## Design Principles

1. **Minimal Dependencies**: Only essential packages
2. **Type Safety**: Full TypeScript types
3. **Extensibility**: Easy to add new providers/visualizers
4. **Portability**: JSON storage, standard formats
5. **Privacy**: Local storage by default
6. **Simplicity**: Clear, focused API

## Testing Strategy

Recommended test structure (not yet implemented):

```
tests/
├── unit/
│   ├── models/
│   ├── core/
│   └── utils/
├── integration/
│   ├── git-integration.test.ts
│   └── mcp-provider.test.ts
└── e2e/
    └── cli.test.ts
```

## Future Enhancements

1. **Web UI**: React/Electron app for visualization
2. **Plugin System**: Custom exporters/visualizers
3. **Analytics**: Pattern recognition in prompts
4. **Collaboration**: Share chains with team
5. **MCP Support**: When protocol adds conversation history
6. **IDE Integration**: VSCode extension
7. **Git Client Plugins**: GitHub Desktop, Fork integration

## Performance Considerations

- **Lazy Loading**: Load chains on demand
- **Diff Truncation**: Limit diff size in memory
- **Async Operations**: Non-blocking I/O
- **Streaming**: For large chain lists
- **Indexing**: Fast lookup by commit SHA

## Security Considerations

1. **Sensitive Data**: Prompts may contain secrets
2. **Privacy**: Conversations are private
3. **Storage**: Local by default
4. **Redaction**: Tools for removing sensitive info
5. **Access Control**: File system permissions

## Conclusion

GitPromptChain provides a solid foundation for tracking LLM conversations in software development. The architecture is designed to be:

- **Extensible**: Ready for MCP and other integrations
- **Practical**: Works today with manual logging
- **Scalable**: Handles complex chains efficiently
- **Simple**: Easy to understand and use

The MCP integration is prepared for future protocol enhancements while providing immediate value through manual prompt tracking.
