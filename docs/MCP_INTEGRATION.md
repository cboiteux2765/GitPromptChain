# MCP (Model Context Protocol) Integration

## Executive Summary

**Current Status**: The Model Context Protocol (MCP) **does not currently support** retrieving conversation history from LLM sessions. This is a limitation of the protocol specification itself, not of GitPromptChain.

**GitPromptChain's Approach**:
1. ✅ **Manual Logging**: Fully functional prompt tracking available today
2. 🔧 **MCP Interface**: Infrastructure ready for future MCP support
3. 🚀 **Extensible Design**: Easy to integrate when MCP adds this capability

## What is MCP?

The Model Context Protocol is an open protocol that standardizes how LLMs connect to external systems. Created by Anthropic, it enables:

- **Tool/Function Calling**: LLMs can execute external functions
- **Resource Access**: LLMs can read/write external data
- **Prompt Templates**: Reusable prompt structures
- **Sampling**: Controlled text generation

### What MCP Does NOT Currently Support

❌ **Conversation History Retrieval**: The protocol doesn't include methods to:
- Retrieve past conversation messages
- Export chat history
- Access session transcripts
- Query previous prompt/response pairs

## Why GitPromptChain Needs Conversation History

To visualize the prompt chain that led to code changes, we need:

1. **User Prompts**: What questions were asked
2. **LLM Responses**: What answers were provided
3. **Timing**: When each interaction occurred
4. **Sequence**: Order of prompt-response pairs

This data is essential for:
- Learning what prompts work well
- Debugging AI-assisted development workflows
- Documenting AI contributions
- Improving future prompting strategies

## Current Solution: Manual Logging

Since MCP doesn't provide conversation history, GitPromptChain offers manual logging:

### CLI Approach

```bash
# Start the CLI
gitpromptchain

# Manually enter prompts and responses as you work
1. Start new chain
2. Add step (enter prompt and response)
3. Add step (enter next prompt and response)
4. End and save chain
```

### Programmatic Approach

```typescript
import { PromptChainManager } from 'gitpromptchain';

const manager = new PromptChainManager(config);
await manager.startChain('Feature implementation');

// After each LLM interaction
await manager.addStep(
  'How do I implement JWT auth?',
  'Here is how to implement JWT authentication...',
  fileDiffs
);

await manager.endChain(commitSha, branch);
await manager.saveChain(chain);
```

## MCP Integration Architecture

GitPromptChain includes infrastructure for future MCP support:

### Interface Definition

```typescript
interface MCPConversationProvider {
  /**
   * Check if MCP server supports conversation history
   */
  supportsConversationHistory(): Promise<boolean>;
  
  /**
   * Retrieve conversation history from MCP server
   * @param sessionId Optional session identifier
   * @returns Array of prompt steps or null if not supported
   */
  getConversationHistory(sessionId?: string): Promise<PromptStep[] | null>;
}
```

### Current Implementation

```typescript
class DefaultMCPProvider implements MCPConversationProvider {
  async supportsConversationHistory(): Promise<boolean> {
    // MCP specification doesn't include conversation history
    return false;
  }

  async getConversationHistory(sessionId?: string): Promise<PromptStep[] | null> {
    console.warn('MCP conversation history retrieval not yet implemented');
    console.warn('MCP servers do not currently expose conversation history');
    return null;
  }
}
```

## Future MCP Support Scenarios

### Scenario 1: MCP Protocol Extension

If MCP adds conversation history to the protocol:

```typescript
// New MCP endpoint (hypothetical)
GET /mcp/conversations/{sessionId}

Response:
{
  "session_id": "abc123",
  "messages": [
    {
      "id": "msg1",
      "role": "user",
      "content": "How do I implement JWT auth?",
      "timestamp": "2025-12-17T08:00:00Z"
    },
    {
      "id": "msg2",
      "role": "assistant",
      "content": "Here's how to implement JWT...",
      "timestamp": "2025-12-17T08:00:05Z"
    }
  ]
}
```

### Implementation (Future)

```typescript
class MCPHistoryProvider implements MCPConversationProvider {
  constructor(private config: MCPServerConfig) {}

  async supportsConversationHistory(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.serverUrl}/capabilities`);
      const data = await response.json();
      return data.features?.includes('conversation-history') ?? false;
    } catch {
      return false;
    }
  }

  async getConversationHistory(sessionId: string): Promise<PromptStep[]> {
    const response = await fetch(
      `${this.config.serverUrl}/conversations/${sessionId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.config.authToken}`
        }
      }
    );
    
    const data = await response.json();
    
    // Convert MCP format to PromptStep format
    return this.convertToPromptSteps(data.messages);
  }

  private convertToPromptSteps(messages: any[]): PromptStep[] {
    const steps: PromptStep[] = [];
    
    for (let i = 0; i < messages.length; i += 2) {
      if (messages[i].role === 'user' && messages[i + 1]?.role === 'assistant') {
        steps.push({
          id: messages[i].id,
          timestamp: new Date(messages[i].timestamp),
          prompt: messages[i].content,
          response: messages[i + 1].content
        });
      }
    }
    
    return steps;
  }
}
```

### Scenario 2: Server-Side Implementation

Some MCP servers might implement conversation history as a custom extension:

```typescript
// Custom provider for specific MCP server
class AnthropicMCPProvider implements MCPConversationProvider {
  async getConversationHistory(sessionId: string): Promise<PromptStep[]> {
    // Use Anthropic-specific API to retrieve conversation
    const conversation = await anthropic.conversations.retrieve(sessionId);
    return this.toPromptSteps(conversation);
  }
}
```

### Scenario 3: Real-Time Streaming

For live conversation capture:

```typescript
class MCPStreamProvider implements MCPConversationProvider {
  private ws: WebSocket;

  async connectToSession(sessionId: string) {
    this.ws = new WebSocket(`${this.config.serverUrl}/stream/${sessionId}`);
    
    this.ws.on('message', (data) => {
      const message = JSON.parse(data);
      if (message.type === 'user_message' || message.type === 'assistant_message') {
        this.handleMessage(message);
      }
    });
  }

  private handleMessage(message: any) {
    // Add to current prompt chain in real-time
    if (message.type === 'assistant_message') {
      this.manager.addStep(
        this.lastUserPrompt,
        message.content,
        this.capturedDiffs
      );
    }
  }
}
```

## Workarounds and Alternatives

Until MCP supports conversation history, consider these approaches:

### 1. Browser Extensions

Create a browser extension to capture conversations from web UIs:

```javascript
// Chrome extension content script
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.target.matches('.message')) {
      captureMessage(mutation.target);
    }
  });
});

function captureMessage(element) {
  const role = element.dataset.role;
  const content = element.textContent;
  
  // Send to GitPromptChain
  chrome.runtime.sendMessage({
    type: 'llm_message',
    role,
    content,
    timestamp: Date.now()
  });
}
```

### 2. API Proxies

Proxy LLM API calls to capture conversations:

```typescript
// Proxy server that logs conversations
app.post('/v1/chat/completions', async (req, res) => {
  const { messages } = req.body;
  
  // Log the conversation
  await logConversation(messages);
  
  // Forward to actual LLM API
  const response = await fetch('https://api.llm-provider.com/chat', {
    method: 'POST',
    body: JSON.stringify(req.body)
  });
  
  res.json(await response.json());
});
```

### 3. IDE Integrations

Capture prompts from coding assistants:

```typescript
// VSCode extension
vscode.workspace.onDidChangeTextDocument(async (event) => {
  if (event.contentChanges.length > 0) {
    // Detect AI-generated changes
    const change = event.contentChanges[0];
    if (isAIGenerated(change)) {
      await captureToPromptChain(change);
    }
  }
});
```

### 4. Git Hooks

Use commit messages to capture prompts:

```bash
#!/bin/bash
# .git/hooks/prepare-commit-msg

# Parse commit message for AI-generated marker
if grep -q "AI-Generated" "$1"; then
  # Extract prompt from commit message
  PROMPT=$(grep "Prompt:" "$1" | cut -d: -f2-)
  
  # Add to GitPromptChain
  gitpromptchain add-from-commit "$PROMPT" "$(git rev-parse HEAD)"
fi
```

## Comparison with Other Solutions

| Solution | Pros | Cons |
|----------|------|------|
| Manual Logging | ✅ Works today<br>✅ Full control<br>✅ Privacy | ❌ Manual effort<br>❌ Can forget to log |
| MCP Integration | ✅ Automatic<br>✅ Standardized | ❌ Not available yet<br>❌ Depends on protocol |
| Browser Extension | ✅ Automatic for web UIs<br>✅ Works now | ❌ Only captures web conversations<br>❌ Per-browser |
| API Proxy | ✅ Automatic<br>✅ Works now | ❌ Complex setup<br>❌ Performance overhead |
| IDE Integration | ✅ Seamless<br>✅ Context-aware | ❌ Per-IDE implementation<br>❌ Limited to IDE use |

## Recommendations

### For Individual Developers

1. **Use manual logging** with GitPromptChain CLI
2. **Copy-paste** prompts and responses as you work
3. **Review chains** regularly to improve prompting

### For Teams

1. **Standardize** on manual logging process
2. **Build custom tools** for your LLM provider
3. **Consider API proxy** for automated capture

### For Tool Builders

1. **Advocate** for conversation history in MCP
2. **Build extensions** for popular LLM UIs
3. **Contribute** to GitPromptChain's MCP provider

## Contributing MCP Support

If you have access to an MCP server that supports conversation history:

1. Fork GitPromptChain
2. Implement `MCPConversationProvider` for your server
3. Add tests for the integration
4. Submit a pull request

Example:

```typescript
// src/mcp/providers/YourMCPProvider.ts
import { MCPConversationProvider, PromptStep } from '../MCPProvider';

export class YourMCPProvider implements MCPConversationProvider {
  async supportsConversationHistory(): Promise<boolean> {
    // Your implementation
  }

  async getConversationHistory(sessionId?: string): Promise<PromptStep[] | null> {
    // Your implementation
  }
}
```

## Conclusion

While MCP doesn't currently support conversation history retrieval, GitPromptChain is architecturally prepared for future support. In the meantime:

- ✅ **Manual logging works well** and provides immediate value
- 🔧 **Infrastructure is ready** for MCP integration when available
- 🚀 **Workarounds exist** for automated capture in specific scenarios
- 🤝 **Community contributions** can add support for various MCP implementations

The most practical approach today is to use GitPromptChain's manual logging features while advocating for conversation history support in the MCP specification.

## Resources

- [MCP Specification](https://modelcontextprotocol.io/)
- [Anthropic MCP Documentation](https://docs.anthropic.com/claude/docs/model-context-protocol)
- [GitPromptChain Issues](https://github.com/cboiteux2765/GitPromptChain/issues)

## Questions?

If you have questions about MCP integration or want to contribute support for a specific MCP server, please open an issue on GitHub.
