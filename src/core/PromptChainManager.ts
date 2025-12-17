/**
 * Core PromptChain manager for capturing and storing prompt chains
 */

import { v4 as uuidv4 } from 'uuid';
import { PromptChain, PromptStep, PromptChainDocument, PromptChainMetadata, FileDiff } from '../models/PromptChain';
import { MCPConversationProvider } from '../mcp/MCPProvider';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface PromptChainManagerConfig {
  /** Directory to store prompt chain data */
  storageDir: string;
  /** MCP provider for conversation retrieval (optional) */
  mcpProvider?: MCPConversationProvider;
  /** Repository path */
  repoPath: string;
}

/**
 * Manages prompt chain creation, storage, and retrieval
 */
export class PromptChainManager {
  private config: PromptChainManagerConfig;
  private currentChain: PromptChain | null = null;

  constructor(config: PromptChainManagerConfig) {
    this.config = config;
  }

  /**
   * Initialize storage directory
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.config.storageDir, { recursive: true });
    } catch (error) {
      console.error('Failed to initialize storage directory:', error);
      throw error;
    }
  }

  /**
   * Start a new prompt chain
   */
  async startChain(summary?: string): Promise<PromptChain> {
    this.currentChain = {
      chainId: uuidv4(),
      startTime: new Date(),
      steps: [],
      summary
    };
    return this.currentChain;
  }

  /**
   * Add a prompt step to the current chain
   */
  async addStep(prompt: string, response: string, fileDiffs?: FileDiff[]): Promise<PromptStep> {
    if (!this.currentChain) {
      throw new Error('No active prompt chain. Call startChain() first.');
    }

    const step: PromptStep = {
      id: uuidv4(),
      timestamp: new Date(),
      prompt,
      response,
      fileDiffs
    };

    this.currentChain.steps.push(step);
    return step;
  }

  /**
   * Attempt to retrieve conversation history from MCP server
   */
  async importFromMCP(sessionId?: string): Promise<boolean> {
    if (!this.config.mcpProvider) {
      console.log('No MCP provider configured');
      return false;
    }

    try {
      const supported = await this.config.mcpProvider.supportsConversationHistory();
      if (!supported) {
        console.log('MCP server does not support conversation history retrieval');
        return false;
      }

      const history = await this.config.mcpProvider.getConversationHistory(sessionId);
      if (!history || history.length === 0) {
        console.log('No conversation history available from MCP');
        return false;
      }

      if (!this.currentChain) {
        await this.startChain('Imported from MCP');
      }

      this.currentChain!.steps = history;
      console.log(`Imported ${history.length} steps from MCP server`);
      return true;
    } catch (error) {
      console.error('Failed to import from MCP:', error);
      return false;
    }
  }

  /**
   * End the current chain and associate with commit
   */
  async endChain(commitSha?: string, branch?: string): Promise<PromptChain | null> {
    if (!this.currentChain) {
      return null;
    }

    this.currentChain.endTime = new Date();
    this.currentChain.commitSha = commitSha;
    this.currentChain.branch = branch;

    const chain = this.currentChain;
    this.currentChain = null;

    return chain;
  }

  /**
   * Save a prompt chain to disk
   */
  async saveChain(chain: PromptChain): Promise<string> {
    const document: PromptChainDocument = {
      metadata: {
        version: '1.0.0',
        created: new Date(),
        repository: {
          name: path.basename(this.config.repoPath),
          path: this.config.repoPath
        }
      },
      chain
    };

    const filename = `chain-${chain.chainId}.json`;
    const filepath = path.join(this.config.storageDir, filename);

    await fs.writeFile(filepath, JSON.stringify(document, null, 2));
    console.log(`Saved prompt chain to ${filepath}`);
    
    return filepath;
  }

  /**
   * Load a prompt chain from disk
   */
  async loadChain(chainId: string): Promise<PromptChainDocument | null> {
    const filename = `chain-${chainId}.json`;
    const filepath = path.join(this.config.storageDir, filename);

    try {
      const content = await fs.readFile(filepath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`Failed to load chain ${chainId}:`, error);
      return null;
    }
  }

  /**
   * List all stored prompt chains
   */
  async listChains(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.config.storageDir);
      return files
        .filter(f => f.startsWith('chain-') && f.endsWith('.json'))
        .map(f => f.replace('chain-', '').replace('.json', ''));
    } catch (error) {
      console.error('Failed to list chains:', error);
      return [];
    }
  }

  /**
   * Get the current active chain
   */
  getCurrentChain(): PromptChain | null {
    return this.currentChain;
  }
}
