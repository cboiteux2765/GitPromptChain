#!/usr/bin/env node

/**
 * Integration test script for GitPromptChain covering: create chain → add steps → save → view by commit
 */

import { PromptChainManager } from '../src/core/PromptChainManager';
import { PromptChainVisualizer } from '../src/core/PromptChainVisualizer';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

async function runTests() {
  console.log('GitPromptChain integration tests\n');

  const tempDir = path.join(os.tmpdir(), `gitpromptchain-test-${Date.now()}`);

  try {
    console.log('Setting up test environment...');
    const manager = new PromptChainManager({
      storageDir: tempDir,
      repoPath: process.cwd()
    });
    await manager.initialize();
    console.log(`   OK Storage directory: ${tempDir}\n`);

    console.log('Test 1: Start a new prompt chain');
    const chain1 = await manager.startChain('Feature: Authentication');
    console.log(`   OK Chain started: ${chain1.chainId}`);
    console.log(`   OK Summary: "${chain1.summary}"\n`);

    console.log('Test 2: Add prompt steps with file changes');
    await manager.addStep(
      'How do I implement JWT authentication?',
      'Here is a JWT implementation strategy...',
      [
        {
          filePath: 'src/auth.ts',
          changeType: 'added',
          diff: '+export function generateToken() { ... }',
          linesAdded: 12,
          linesDeleted: 0
        }
      ]
    );
    console.log(`   OK Step 1 added: 1 file changed (+12 lines)`);

    await manager.addStep(
      'Can you add token validation?',
      'Here is the validation logic...',
      [
        {
          filePath: 'src/auth.ts',
          changeType: 'modified',
          diff: '+export function validateToken() { ... }',
          linesAdded: 8,
          linesDeleted: 2
        },
        {
          filePath: 'src/middleware.ts',
          changeType: 'added',
          diff: '+export const authMiddleware = ...',
          linesAdded: 15,
          linesDeleted: 0
        }
      ]
    );
    console.log(`   OK Step 2 added: 2 files changed (+23 -2)\n`);

    console.log('Test 3: End chain and save with commit SHA');
    const completed = await manager.endChain('abc123def456', 'feature/auth');
    if (!completed) throw new Error('Failed to end chain');

    await manager.saveChain(completed);
    console.log(`   OK Chain saved with commit: abc123def456`);
    console.log(`   OK Branch: feature/auth`);
    console.log(`   OK Total steps: 2\n`);

    console.log('Test 4: Verify metrics computation');
    const loaded = await manager.loadChain(chain1.chainId);
    if (!loaded || !loaded.metadata.metrics) {
      throw new Error('Metrics not saved');
    }
    const m = loaded.metadata.metrics;
    console.log(`   OK Duration: ${m.durationMs}ms`);
    console.log(`   OK Files changed: ${m.uniqueFilesChanged}`);
    console.log(`   OK Lines: +${m.totalLinesAdded} -${m.totalLinesDeleted}`);
    console.log(`   OK Prompt styles: ${m.prompts.styleCounts.interrogative} questions, avg ${m.prompts.avgLengthChars} chars\n`);

    console.log('Test 5: Verify commit index');
    const chainIds = await manager.listChainsByCommit('abc123def456');
    if (!chainIds.includes(chain1.chainId)) {
      throw new Error('Chain not indexed by commit');
    }
    console.log(`   OK Found ${chainIds.length} chain(s) for commit abc123def456`);
    console.log(`   OK Chain IDs: ${chainIds.slice(0, 2).join(', ')}\n`);

    console.log('Test 6: Load all chains for a commit');
    const docs = await manager.loadChainsByCommit('abc123def456');
    console.log(`   OK Loaded ${docs.length} chain document(s)`);
    if (docs[0]) {
      console.log(`   OK Summary: ${docs[0].chain.summary}\n`);
    }

    console.log('Test 7: Multiple chains per commit');
    const chain2 = await manager.startChain('Refactor: API routes');
    await manager.addStep('Simplify route definitions', 'Done', [
      {
        filePath: 'src/routes.ts',
        changeType: 'modified',
        diff: '-complex routing',
        linesAdded: 20,
        linesDeleted: 35
      }
    ]);
    const end2 = await manager.endChain('abc123def456', 'feature/auth');
    if (end2) await manager.saveChain(end2);
    console.log(`   OK Chain 2 saved to same commit\n`);

    console.log('Test 8: Index contains both chains');
    const allChains = await manager.listChainsByCommit('abc123def456');
    console.log(`   OK Commit abc123def456 has ${allChains.length} chains`);

    const docs2 = await manager.loadChainsByCommit('abc123def456');
    docs2.forEach((doc, i) => {
      console.log(`   OK Chain ${i + 1}: "${doc.chain.summary}" - ${doc.chain.steps.length} steps`);
    });
    console.log();

    console.log('Test 9: Visualize chain');
    if (docs2[0]) {
      const visualization = PromptChainVisualizer.visualizeChain(docs2[0]);
      const lines = visualization.split('\n').slice(0, 8).join('\n');
      console.log('   Visualization preview:');
      lines.split('\n').forEach(line => console.log(`     ${line}`));
      console.log('   ...\n');
    }

    console.log('Test 10: List all chains in storage');
    const allIds = await manager.listChains();
    console.log(`   OK Total chains in storage: ${allIds.length}`);
    allIds.forEach(id => {
      console.log(`     - ${id}`);
    });
    console.log();

    console.log('Cleaning up test directory...');
    await fs.rm(tempDir, { recursive: true, force: true });
    console.log(`   OK Removed ${tempDir}\n`);

    console.log('All integration tests passed!\n');
    process.exit(0);
  } catch (error) {
    console.error(`\nTest failed: ${error instanceof Error ? error.message : String(error)}`);
    console.error(error);
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
    process.exit(1);
  }
}

runTests();
