#!/usr/bin/env node

/**
 * Quick demo showing the improved CLI workflow
 */

import { PromptChainManager } from '../src/core/PromptChainManager';
import { GitIntegration } from '../src/utils/GitIntegration';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

async function demo() {
  const tempDir = path.join(os.tmpdir(), `gitpromptchain-demo-${Date.now()}`);
  
  console.log('🎬 GitPromptChain CLI Demo\n');
  console.log('This demo shows the new workflow:\n');
  console.log('  1. Start a chain');
  console.log('  2. Add multiple steps (chain stays active)');
  console.log('  3. Save when done (finalizes the chain)\n');

  const manager = new PromptChainManager({
    storageDir: tempDir,
    repoPath: process.cwd()
  });
  await manager.initialize();

  console.log('Step 1: Start a new chain\n');
  const chain = await manager.startChain('Demo: Authentication Feature');
  console.log(`✅ Chain started: ${chain.chainId}`);
  console.log(`   Summary: "${chain.summary}"`);
  console.log(`   Steps: ${chain.steps.length}\n`);

  console.log('Step 2: Add first prompt (chain stays active)\n');
  await manager.addStep(
    'How do I implement JWT authentication?',
    'Here is the JWT implementation...',
    [
      {
        filePath: 'src/auth.ts',
        changeType: 'added',
        diff: '+export function generateToken() {...}',
        linesAdded: 15,
        linesDeleted: 0
      }
    ]
  );
  console.log(`✅ Step added!`);
  console.log(`   Chain: ${chain.chainId}`);
  console.log(`   Total steps: ${chain.steps.length}`);
  console.log(`   💡 Chain is still ACTIVE - you can add more steps\n`);

  console.log('Step 3: Add second prompt (chain still active)\n');
  await manager.addStep(
    'Can you add token validation?',
    'Here is the validation logic...',
    [
      {
        filePath: 'src/auth.ts',
        changeType: 'modified',
        diff: '+export function validateToken() {...}',
        linesAdded: 10,
        linesDeleted: 2
      }
    ]
  );
  console.log(`✅ Step added!`);
  console.log(`   Chain: ${chain.chainId}`);
  console.log(`   Total steps: ${chain.steps.length}`);
  console.log(`   💡 Still ACTIVE - add more or save when ready\n`);

  console.log('Step 4: Add third prompt\n');
  await manager.addStep(
    'Add middleware for route protection?',
    'Here is the middleware...',
    [
      {
        filePath: 'src/middleware.ts',
        changeType: 'added',
        diff: '+export const authMiddleware = ...',
        linesAdded: 20,
        linesDeleted: 0
      }
    ]
  );
  console.log(`✅ Step added!`);
  console.log(`   Total steps: ${chain.steps.length}\n`);

  console.log('Step 5: Save and finalize the chain\n');
  const git = new GitIntegration(process.cwd());
  const branch = await git.getCurrentBranch();
  const sha = await git.getLastCommitSha();
  
  const completed = await manager.endChain(sha, branch);
  if (completed) {
    await manager.saveChain(completed);
    const loaded = await manager.loadChain(completed.chainId);
    
    console.log(`✅ Chain saved!`);
    console.log(`   Chain ID: ${completed.chainId}`);
    console.log(`   Total steps: ${completed.steps.length}`);
    console.log(`   Commit: ${sha.substring(0, 8)}`);
    console.log(`   Branch: ${branch}\n`);

    if (loaded?.metadata.metrics) {
      const m = loaded.metadata.metrics;
      
      // Display beautiful metrics table
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║                    CHAIN METRICS                           ║');
      console.log('╠════════════════════════════════════════════════════════════╣');
      console.log(`║ Chain ID:           ${pad(completed.chainId.substring(0, 36), 36)} ║`);
      console.log(`║ Summary:            ${pad(completed.summary || 'N/A', 36)} ║`);
      console.log('╠════════════════════════════════════════════════════════════╣');
      console.log('║                    TIME & PROGRESS                         ║');
      console.log('╠════════════════════════════════════════════════════════════╣');
      console.log(`║ Duration:           ${pad(formatDuration(m.durationMs), 36)} ║`);
      console.log(`║ Total Steps:        ${pad(String(completed.steps.length), 36)} ║`);
      console.log(`║ Steps w/ Changes:   ${pad(String(m.modificationSteps), 36)} ║`);
      console.log('╠════════════════════════════════════════════════════════════╣');
      console.log('║                    FILE CHANGES                            ║');
      console.log('╠════════════════════════════════════════════════════════════╣');
      console.log(`║ Files Changed:      ${pad(String(m.uniqueFilesChanged), 36)} ║`);
      console.log(`║ Lines Added:        ${pad(String(m.totalLinesAdded), 36)} ║`);
      console.log(`║ Lines Deleted:      ${pad(String(m.totalLinesDeleted), 36)} ║`);
      console.log(`║ Net Change:         ${pad(String(m.totalLinesAdded - m.totalLinesDeleted), 36)} ║`);
      console.log('╠════════════════════════════════════════════════════════════╣');
      console.log('║                    PROMPT ANALYSIS                         ║');
      console.log('╠════════════════════════════════════════════════════════════╣');
      console.log(`║ Total Characters:   ${pad(String(m.prompts.totalLengthChars), 36)} ║`);
      console.log(`║ Avg Characters:     ${pad(String(m.prompts.avgLengthChars), 36)} ║`);
      console.log(`║ Questions (?):      ${pad(String(m.prompts.styleCounts.interrogative), 36)} ║`);
      console.log(`║ Commands/Actions:   ${pad(String(m.prompts.styleCounts.imperative), 36)} ║`);
      console.log(`║ Descriptions:       ${pad(String(m.prompts.styleCounts.narrative), 36)} ║`);
      console.log('╚════════════════════════════════════════════════════════════╝\n');
      
      // Provide prompting tips based on metrics
      console.log('💡 Prompting Tips:\n');
      
      if (m.prompts.avgLengthChars < 20) {
        console.log('   • Your prompts are quite short. Try adding more context for better results.');
      } else if (m.prompts.avgLengthChars > 200) {
        console.log('   • Your prompts are quite long. Consider breaking them into smaller steps.');
      } else {
        console.log('   • Good prompt length! (20-200 chars is ideal for most tasks)');
      }
      
      const totalPrompts = m.prompts.styleCounts.interrogative + m.prompts.styleCounts.imperative + m.prompts.styleCounts.narrative;
      const questionRatio = totalPrompts > 0 ? m.prompts.styleCounts.interrogative / totalPrompts : 0;
      const commandRatio = totalPrompts > 0 ? m.prompts.styleCounts.imperative / totalPrompts : 0;
      
      if (questionRatio > 0.7) {
        console.log('   • You ask many questions. Try direct commands like "Add...", "Fix...", "Update..."');
      } else if (commandRatio > 0.7) {
        console.log('   • Great! You use direct commands which often get faster results.');
      } else {
        console.log('   • Good mix of question and command styles!');
      }
      
      if (m.modificationSteps < completed.steps.length * 0.3) {
        console.log('   • Few steps resulted in changes. Be more specific about what to modify.');
      }
      
      console.log();
    }
  }

  console.log('🧹 Cleaning up...');
  await fs.rm(tempDir, { recursive: true, force: true });
  console.log('✅ Demo complete!\n');
}

function pad(text: string, length: number): string {
  return text.length >= length ? text.substring(0, length) : text + ' '.repeat(length - text.length);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) return `${minutes}m ${secs}s`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m ${secs}s`;
}

demo().catch(console.error);
