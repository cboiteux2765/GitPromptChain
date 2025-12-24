import { v4 as uuidv4 } from 'uuid';
import { PromptChain, PromptStep, PromptChainDocument, PromptChainMetadata, FileDiff } from '../models/PromptChain';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface PromptChainManagerConfig {
  storageDir: string;
  repoPath: string;
}

export class PromptChainManager {
  private config: PromptChainManagerConfig;
  private currentChain: PromptChain | null = null;

  constructor(config: PromptChainManagerConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.config.storageDir, { recursive: true });
    } catch (error) {
      console.error('Failed to initialize storage directory:', error);
      throw error;
    }
  }

  async startChain(summary?: string): Promise<PromptChain> {
    this.currentChain = {
      chainId: uuidv4(),
      startTime: new Date(),
      steps: [],
      summary
    };
    return this.currentChain;
  }

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

  getCurrentChain(): PromptChain | null {
    return this.currentChain;
  }
}
