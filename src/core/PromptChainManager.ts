import { v4 as uuidv4 } from 'uuid';
import { PromptChain, PromptStep, PromptChainDocument, PromptChainMetadata, FileDiff } from '../models/PromptChain';
import * as fs from 'fs/promises';
import * as path from 'path';
import { computeChainMetrics } from '../utils/ChainMetrics';

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
        },
        metrics: computeChainMetrics(chain)
      },
      chain
    };

    const filename = `chain-${chain.chainId}.json`;
    const filepath = path.join(this.config.storageDir, filename);

    await fs.writeFile(filepath, JSON.stringify(document, null, 2));
    console.log(`Saved prompt chain to ${filepath}`);
    
    // If associated commit SHA exists, also save under commits/<sha>/
    if (chain.commitSha && chain.commitSha.length > 0) {
      const commitDir = path.join(this.config.storageDir, 'commits', chain.commitSha);
      await fs.mkdir(commitDir, { recursive: true });
      const commitFile = path.join(commitDir, filename);
      await fs.writeFile(commitFile, JSON.stringify(document, null, 2));

      // Update commit index
      const indexPath = path.join(this.config.storageDir, 'commit-index.json');
      let index: Record<string, string[]> = {};
      try {
        const raw = await fs.readFile(indexPath, 'utf-8');
        index = JSON.parse(raw);
      } catch {
        // no index yet
      }
      const list = new Set<string>(index[chain.commitSha] || []);
      list.add(chain.chainId);
      index[chain.commitSha] = Array.from(list);
      await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
    }

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

  async listChainsByCommit(commitSha: string): Promise<string[]> {
    const indexPath = path.join(this.config.storageDir, 'commit-index.json');
    try {
      const raw = await fs.readFile(indexPath, 'utf-8');
      const index: Record<string, string[]> = JSON.parse(raw);
      return index[commitSha] || [];
    } catch {
      return [];
    }
  }

  async loadChainsByCommit(commitSha: string): Promise<PromptChainDocument[]> {
    const chainIds = await this.listChainsByCommit(commitSha);
    const docs: PromptChainDocument[] = [];
    for (const id of chainIds) {
      const doc = await this.loadChain(id);
      if (doc) docs.push(doc);
    }
    return docs;
  }
}
