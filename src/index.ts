/**
 * GitPromptChain - Track LLM conversation history with your commits
 * 
 * Main entry point for the library
 */

export { PromptChain, PromptStep, FileDiff, PromptChainDocument, PromptChainMetadata } from './models/PromptChain';
export { PromptChainManager, PromptChainManagerConfig } from './core/PromptChainManager';
export { PromptChainVisualizer } from './core/PromptChainVisualizer';
export { GitIntegration } from './utils/GitIntegration';

// Example usage:
/*
import { PromptChainManager, GitIntegration } from 'gitpromptchain';

const manager = new PromptChainManager({
  storageDir: './.gitpromptchain',
  repoPath: process.cwd()
});

await manager.initialize();
const chain = await manager.startChain('My feature implementation');
await manager.addStep('How do I implement feature X?', 'Here is how...', fileDiffs);
await manager.endChain(commitSha, branch);
await manager.saveChain(chain);
*/
