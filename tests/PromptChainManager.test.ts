import { PromptChainManager } from '../src/core/PromptChainManager';
import { FileDiff } from '../src/models/PromptChain';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('PromptChainManager', () => {
  let manager: PromptChainManager;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join('/tmp', `test-${Date.now()}`);
    manager = new PromptChainManager({
      storageDir: tempDir,
      repoPath: process.cwd()
    });
    await manager.initialize();
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('initialize', () => {
    it('should create storage directory', async () => {
      const stats = await fs.stat(tempDir);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe('startChain', () => {
    it('should create a new chain with UUID', async () => {
      const chain = await manager.startChain('Test chain');
      
      expect(chain.chainId).toBeDefined();
      expect(chain.summary).toBe('Test chain');
      expect(chain.steps).toEqual([]);
      expect(chain.startTime).toBeInstanceOf(Date);
    });

    it('should create chain without summary', async () => {
      const chain = await manager.startChain();
      
      expect(chain.chainId).toBeDefined();
      expect(chain.summary).toBeUndefined();
    });
  });

  describe('addStep', () => {
    it('should add step to active chain', async () => {
      await manager.startChain('Test');
      const step = await manager.addStep('prompt', 'response');
      
      expect(step.id).toBeDefined();
      expect(step.prompt).toBe('prompt');
      expect(step.response).toBe('response');
      expect(step.timestamp).toBeInstanceOf(Date);
    });

    it('should add step with file diffs', async () => {
      await manager.startChain('Test');
      const diffs: FileDiff[] = [{
        filePath: 'test.ts',
        changeType: 'modified',
        diff: 'diff content',
        linesAdded: 5,
        linesDeleted: 2
      }];
      
      const step = await manager.addStep('prompt', 'response', diffs);
      
      expect(step.fileDiffs).toEqual(diffs);
    });

    it('should throw error if no active chain', async () => {
      await expect(manager.addStep('prompt', 'response'))
        .rejects.toThrow('No active prompt chain');
    });
  });

  describe('endChain', () => {
    it('should end active chain with metadata', async () => {
      await manager.startChain('Test');
      await manager.addStep('p1', 'r1');
      
      const chain = await manager.endChain('abc123', 'main');
      
      expect(chain).toBeDefined();
      expect(chain?.endTime).toBeInstanceOf(Date);
      expect(chain?.commitSha).toBe('abc123');
      expect(chain?.branch).toBe('main');
      expect(chain?.steps.length).toBe(1);
    });

    it('should return null if no active chain', async () => {
      const chain = await manager.endChain();
      expect(chain).toBeNull();
    });

    it('should clear current chain after ending', async () => {
      await manager.startChain('Test');
      await manager.endChain();
      
      const current = manager.getCurrentChain();
      expect(current).toBeNull();
    });
  });

  describe('saveChain and loadChain', () => {
    it('should save and load chain', async () => {
      const chain = await manager.startChain('Test chain');
      await manager.addStep('prompt1', 'response1');
      await manager.addStep('prompt2', 'response2');
      const endedChain = await manager.endChain('abc123', 'main');
      
      const filepath = await manager.saveChain(endedChain!);
      expect(filepath).toContain(chain.chainId);
      
      const loaded = await manager.loadChain(chain.chainId);
      expect(loaded).toBeDefined();
      expect(loaded?.chain.chainId).toBe(chain.chainId);
      expect(loaded?.chain.steps.length).toBe(2);
      expect(loaded?.metadata.version).toBe('1.0.0');
    });

    it('should return null for non-existent chain', async () => {
      const loaded = await manager.loadChain('non-existent-id');
      expect(loaded).toBeNull();
    });
  });

  describe('listChains', () => {
    it('should list all saved chains', async () => {
      const chain1 = await manager.startChain('Chain 1');
      const ended1 = await manager.endChain();
      await manager.saveChain(ended1!);
      
      await manager.startChain('Chain 2');
      const chain2 = await manager.endChain();
      await manager.saveChain(chain2!);
      
      const chains = await manager.listChains();
      expect(chains.length).toBe(2);
      expect(chains).toContain(chain1.chainId);
      expect(chains).toContain(chain2!.chainId);
    });

    it('should return empty array if no chains', async () => {
      const chains = await manager.listChains();
      expect(chains).toEqual([]);
    });
  });

  describe('getCurrentChain', () => {
    it('should return current active chain', async () => {
      const chain = await manager.startChain('Test');
      const current = manager.getCurrentChain();
      
      expect(current).toBe(chain);
    });

    it('should return null if no active chain', () => {
      const current = manager.getCurrentChain();
      expect(current).toBeNull();
    });
  });
});
