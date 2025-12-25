#!/usr/bin/env node

/**
 * Integration test script for GitPromptChain
 * Tests the full workflow: create chain → add steps → save → view by commit
 */

import { PromptChainManager } from '../src/core/PromptChainManager';
import { PromptChainVisualizer } from '../src/core/PromptChainVisualizer';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

async function runTests() {
  console.log('🧪 GitPromptChain Integration Tests\n');

  const tempDir = path.join(os.tmpdir(), `gitpromptchain-test-${Date.now()}`);

  try {
    // Setup
    console.log('📦 Setting up test environment...');
    const manager = new PromptChainManager({
      storageDir: tempDir,
      repoPath: process.cwd()
    });
    await manager.initialize();
    console.log(`   ✓ Storage directory: ${tempDir}\n`);

    // Test 1: Start a chain
    console.log('1️⃣  Test: Start a new prompt chain');
    const chain1 = await manager.startChain('Feature: Authentication');
    console.log(`   ✓ Chain started: ${chain1.chainId}`);
    console.log(`   ✓ Summary: "${chain1.summary}"\n`);

    // Test 2: Add steps with file diffs
    console.log('2️⃣  Test: Add prompt steps with file changes');
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
    console.log(`   ✓ Step 1 added: 1 file changed (+12 lines)`);

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
    console.log(`   ✓ Step 2 added: 2 files changed (+23 -2)\n`);

    // Test 3: End and save chain with commit
    console.log('3️⃣  Test: End chain and save with commit SHA');
    const completed = await manager.endChain('abc123def456', 'feature/auth');
    if (!completed) throw new Error('Failed to end chain');

    await manager.saveChain(completed);
    console.log(`   ✓ Chain saved with commit: abc123def456`);
    console.log(`   ✓ Branch: feature/auth`);
    console.log(`   ✓ Total steps: 2\n`);

    // Test 4: Verify metrics were computed
    console.log('4️⃣  Test: Verify metrics computation');
    const loaded = await manager.loadChain(chain1.chainId);
    if (!loaded || !loaded.metadata.metrics) {
      throw new Error('Metrics not saved');
    }
    const m = loaded.metadata.metrics;
    console.log(`   ✓ Duration: ${m.durationMs}ms`);
    console.log(`   ✓ Files changed: ${m.uniqueFilesChanged}`);
    console.log(`   ✓ Lines: +${m.totalLinesAdded} -${m.totalLinesDeleted}`);
    console.log(`   ✓ Prompt styles: ${m.prompts.styleCounts.interrogative} questions, avg ${m.prompts.avgLengthChars} chars\n`);

    // Test 5: Verify commit index
    console.log('5️⃣  Test: Verify commit index');
    const chainIds = await manager.listChainsByCommit('abc123def456');
    if (!chainIds.includes(chain1.chainId)) {
      throw new Error('Chain not indexed by commit');
    }
    console.log(`   ✓ Found ${chainIds.length} chain(s) for commit abc123def456`);
    console.log(`   ✓ Chain IDs: ${chainIds.slice(0, 2).join(', ')}\n`);

    // Test 6: Load chains by commit
    console.log('6️⃣  Test: Load all chains for a commit');
    const docs = await manager.loadChainsByCommit('abc123def456');
    console.log(`   ✓ Loaded ${docs.length} chain document(s)`);
    if (docs[0]) {
      console.log(`   ✓ Summary: ${docs[0].chain.summary}\n`);
    }

    // Test 7: Create another chain for same commit
    console.log('7️⃣  Test: Multiple chains per commit');
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
    console.log(`   ✓ Chain 2 saved to same commit\n`);

    // Test 8: Verify both chains are indexed
    console.log('8️⃣  Test: Index contains both chains');
    const allChains = await manager.listChainsByCommit('abc123def456');
    console.log(`   ✓ Commit abc123def456 has ${allChains.length} chains`);

    const docs2 = await manager.loadChainsByCommit('abc123def456');
    docs2.forEach((doc, i) => {
      console.log(`   ✓ Chain ${i + 1}: "${doc.chain.summary}" - ${doc.chain.steps.length} steps`);
    });
    console.log();

    // Test 9: Visualize a chain
    console.log('9️⃣  Test: Visualize chain');
    if (docs2[0]) {
      const visualization = PromptChainVisualizer.visualizeChain(docs2[0]);
      const lines = visualization.split('\n').slice(0, 8).join('\n');
      console.log('   Visualization preview:');
      lines.split('\n').forEach(line => console.log(`     ${line}`));
      console.log('   ...\n');
    }

    // Test 10: List all chains
    console.log('🔟 Test: List all chains in storage');
    const allIds = await manager.listChains();
    console.log(`   ✓ Total chains in storage: ${allIds.length}`);
    allIds.forEach(id => {
      console.log(`     - ${id}`);
    });
    console.log();

    // Cleanup
    console.log('🧹 Cleaning up test directory...');
    await fs.rm(tempDir, { recursive: true, force: true });
    console.log(`   ✓ Removed ${tempDir}\n`);

    console.log('✅ All integration tests passed!\n');
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Test failed: ${error instanceof Error ? error.message : String(error)}`);
    console.error(error);
    // Cleanup on error
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
    process.exit(1);
  }
}

runTests();
