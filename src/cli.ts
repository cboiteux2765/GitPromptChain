#!/usr/bin/env node

import { PromptChainManager } from './core/PromptChainManager';
import { GitIntegration } from './utils/GitIntegration';
import { PromptChainVisualizer } from './core/PromptChainVisualizer';
import * as path from 'path';
import * as readline from 'readline';

interface CLIConfig {
  repoPath: string;
  storageDir: string;
}

class GitPromptChainCLI {
  private manager: PromptChainManager;
  private gitIntegration: GitIntegration;
  private config: CLIConfig;
  private rl: readline.Interface;

  constructor(config: CLIConfig) {
    this.config = config;
    
    this.manager = new PromptChainManager({
      storageDir: config.storageDir,
      repoPath: config.repoPath
    });

    this.gitIntegration = new GitIntegration(config.repoPath);

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async initialize(): Promise<void> {
    await this.manager.initialize();
  }

  async start(): Promise<void> {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║              Welcome to GitPromptChain                     ║');
    console.log('║   Track your LLM conversation history with your commits   ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    await this.showMenu();
  }

  private async showMenu(): Promise<void> {
    const current = this.manager.getCurrentChain();
    
    console.log('\n' + '═'.repeat(62));
    console.log('What would you like to do?');
    
    if (current) {
      console.log(`\n📝 Active chain: ${current.chainId}`);
      console.log(`   Steps: ${current.steps.length}`);
      console.log('');
    }
    
    console.log('start   - Start a new prompt chain');
    console.log('add     - Add a prompt step to current chain');
    console.log('save    - Save and finalize current chain');
    console.log('view    - View a saved chain');
    console.log('viewc   - View chains for a commit (HEAD by default)');
    console.log('exit    - Exit\n');

    this.rl.question('Enter your choice: ', async (choice) => {
      await this.handleMenuChoice(choice.trim().toLowerCase());
    });
  }

  private async handleMenuChoice(choice: string): Promise<void> {
    switch (choice) {
      case 'start':
      case '1':
        await this.startNewChain();
        break;
      case 'add':
      case '2':
        await this.addPromptStep();
        break;
      case 'save':
      case '3':
        await this.saveChain();
        break;
      case 'view':
      case '4':
        await this.viewChain();
        break;
      case 'viewc':
        await this.viewCommit();
        break;
      case 'exit':
      case '6':
        console.log('\nGoodbye!');
        this.rl.close();
        process.exit(0);
        break;
      default:
        console.log('Invalid choice. Please try again.');
        await this.showMenu();
    }
  }

  private async startNewChain(): Promise<void> {
    this.rl.question('Enter a summary for this chain (optional): ', async (summary) => {
      const chain = await this.manager.startChain(summary || undefined);
      console.log(`\n✅ Started new prompt chain: ${chain.chainId}`);
      await this.showMenu();
    });
  }

  private async addPromptStep(): Promise<void> {
    const current = this.manager.getCurrentChain();
    if (!current) {
      console.log('\nNo active chain. Please start a new chain first.');
      await this.showMenu();
      return;
    }

    this.rl.question('\nEnter your prompt: ', async (prompt) => {
      if (!prompt.trim()) {
        console.log('Prompt cannot be empty.');
        await this.showMenu();
        return;
      }

      try {
        // Capture file diffs as response
        const fileDiffs = await this.gitIntegration.getUncommittedDiffs();
        const response = fileDiffs.length > 0
          ? `Applied changes to ${fileDiffs.length} file(s):\n${fileDiffs.map(d => `  - ${d.filePath}: ${d.linesAdded} additions, ${d.linesDeleted} deletions`).join('\n')}`
          : '[No file changes detected]';

        // Add step to chain (keep chain active)
        await this.manager.addStep(prompt, response, fileDiffs);

        console.log(`\n✅ Step added!`);
        console.log(`   Chain: ${current.chainId}`);
        console.log(`   Total steps: ${current.steps.length}`);
        if (fileDiffs.length > 0) {
          console.log(`   Files changed: ${fileDiffs.length}`);
        }
        console.log(`\n💡 Tip: Use 'save' to finalize and save this chain, or 'add' to continue adding steps.`);
        
        await this.showMenu();
      } catch (error) {
        console.error('Error adding step:', error instanceof Error ? error.message : error);
        await this.showMenu();
      }
    });
  }

  private async saveChain(): Promise<void> {
    const current = this.manager.getCurrentChain();
    if (!current) {
      console.log('\nNo active chain to save.');
      await this.showMenu();
      return;
    }

    try {
      const currentBranch = await this.gitIntegration.getCurrentBranch();
      const commitSha = await this.gitIntegration.getLastCommitSha();
      
      const completedChain = await this.manager.endChain(commitSha, currentBranch);
      if (completedChain) {
        await this.manager.saveChain(completedChain);

        console.log(`\n✅ Chain saved!`);
        console.log(`   Chain ID: ${completedChain.chainId}`);
        console.log(`   Total steps: ${completedChain.steps.length}`);
        console.log(`   Commit: ${commitSha}`);
        console.log(`   Branch: ${currentBranch}`);
      }
      
      await this.showMenu();
    } catch (error) {
      console.error('Error saving chain:', error instanceof Error ? error.message : error);
      await this.showMenu();
    }
  }

  private async viewChain(): Promise<void> {
    const chains = await this.manager.listChains();
    
    if (chains.length === 0) {
      console.log('\nNo chains found.');
      await this.showMenu();
      return;
    }

    console.log(`\nFound ${chains.length} chain(s):\n`);
    const chainDocs: Array<{ id: string; doc: any }> = [];
    
    for (let i = 0; i < chains.length; i++) {
      const chainId = chains[i] || '';
      if (!chainId) continue;
      
      const doc = await this.manager.loadChain(chainId);
      if (doc) {
        chainDocs.push({ id: chainId, doc });
        const summary = PromptChainVisualizer.generateSummary(doc.chain);
        console.log(`  ${i + 1}. ${summary}`);
        console.log(`     ID: ${chainId}`);
      }
    }

    this.rl.question('\nEnter chain number or ID to view (or press Enter to go back): ', async (input) => {
      if (!input.trim()) {
        await this.showMenu();
        return;
      }

      let selectedChain = null;
      const inputNum = parseInt(input.trim(), 10);
      
      // Check if input is a number (1-based index)
      if (!isNaN(inputNum) && inputNum > 0 && inputNum <= chainDocs.length) {
        selectedChain = chainDocs[inputNum - 1];
      } else {
        // Try to find by ID
        selectedChain = chainDocs.find(c => c.id === input.trim());
      }

      if (selectedChain) {
        this.displayMetricsTable(selectedChain.doc);
        console.log('\n' + PromptChainVisualizer.visualizeChain(selectedChain.doc));
      } else {
        console.log('\nChain not found.');
      }
      
      await this.showMenu();
    });
  }

  private async viewCommit(): Promise<void> {
    try {
      const headSha = await this.gitIntegration.getLastCommitSha();
      this.rl.question(`\nEnter commit SHA (or press Enter for HEAD: ${headSha}): `, async (shaInput) => {
        const sha = shaInput.trim() || headSha;
        if (!sha) {
          console.log('\nNo commit found.');
          await this.showMenu();
          return;
        }

        const chainIds = await this.manager.listChainsByCommit(sha);
        if (!chainIds || chainIds.length === 0) {
          console.log(`\nNo chains linked to commit ${sha}.`);
          await this.showMenu();
          return;
        }

        const docs = await this.manager.loadChainsByCommit(sha);
        console.log(`\nFound ${docs.length} chain(s) for commit ${sha}:\n`);
        docs.forEach((doc, i) => {
          const summary = `Chain ${doc.chain.chainId} — ${doc.chain.steps.length} prompts, ${doc.metadata.metrics?.uniqueFilesChanged ?? 0} files changed (+${doc.metadata.metrics?.totalLinesAdded ?? 0} -${doc.metadata.metrics?.totalLinesDeleted ?? 0})`;
          console.log(`  ${i + 1}. ${summary}`);
        });

        this.rl.question('\nEnter number to view full conversation (or Enter to go back): ', async (nInput) => {
          const idx = parseInt(nInput.trim(), 10);
          if (!isNaN(idx) && idx >= 1 && idx <= docs.length) {
            const doc = docs[idx - 1];
            if (doc) {
              this.displayMetricsTable(doc);
              console.log('\n' + PromptChainVisualizer.visualizeChain(doc));
            }
          }
          await this.showMenu();
        });
      });
    } catch (error) {
      console.error('Error viewing commit chains:', error);
      await this.showMenu();
    }
  }

  private displayMetricsTable(doc: any): void {
    const m = doc.metadata?.metrics;
    if (!m) {
      console.log('\n⚠️  No metrics available for this chain\n');
      return;
    }

    const chain = doc.chain;
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    CHAIN METRICS                           ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║ Chain ID:           ${this.pad(chain.chainId.substring(0, 36), 36)} ║`);
    console.log(`║ Summary:            ${this.pad(chain.summary || 'N/A', 36)} ║`);
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║                    TIME & PROGRESS                         ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║ Duration:           ${this.pad(this.formatDuration(m.durationMs), 36)} ║`);
    console.log(`║ Total Steps:        ${this.pad(String(chain.steps.length), 36)} ║`);
    console.log(`║ Steps w/ Changes:   ${this.pad(String(m.modificationSteps), 36)} ║`);
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║                    FILE CHANGES                            ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║ Files Changed:      ${this.pad(String(m.uniqueFilesChanged), 36)} ║`);
    console.log(`║ Lines Added:        ${this.pad(String(m.totalLinesAdded), 36)} ║`);
    console.log(`║ Lines Deleted:      ${this.pad(String(m.totalLinesDeleted), 36)} ║`);
    console.log(`║ Net Change:         ${this.pad(String(m.totalLinesAdded - m.totalLinesDeleted), 36)} ║`);
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║                    PROMPT ANALYSIS                         ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║ Total Characters:   ${this.pad(String(m.prompts.totalLengthChars), 36)} ║`);
    console.log(`║ Avg Characters:     ${this.pad(String(m.prompts.avgLengthChars), 36)} ║`);
    console.log(`║ Questions (?):      ${this.pad(String(m.prompts.styleCounts.interrogative), 36)} ║`);
    console.log(`║ Commands/Actions:   ${this.pad(String(m.prompts.styleCounts.imperative), 36)} ║`);
    console.log(`║ Descriptions:       ${this.pad(String(m.prompts.styleCounts.narrative), 36)} ║`);
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    this.displayPromptingTips(m, chain);
  }

  private displayPromptingTips(metrics: any, chain: any): void {
    console.log('💡 Prompting Tips Based on Your Metrics:\n');
    
    // Tip 1: Prompt length analysis
    if (metrics.prompts.avgLengthChars < 20) {
      console.log('   📏 Prompt Length: Your prompts are quite SHORT (avg ' + metrics.prompts.avgLengthChars + ' chars)');
      console.log('      → Try adding more context and specifics for better AI responses');
      console.log('      → Example: Instead of "Fix bug", try "Fix the authentication bug where');
      console.log('                 tokens expire too quickly"\n');
    } else if (metrics.prompts.avgLengthChars > 200) {
      console.log('   📏 Prompt Length: Your prompts are quite LONG (avg ' + metrics.prompts.avgLengthChars + ' chars)');
      console.log('      → Consider breaking complex requests into smaller, focused steps');
      console.log('      → This helps the AI provide more targeted solutions\n');
    } else {
      console.log('   ✅ Prompt Length: Great! (avg ' + metrics.prompts.avgLengthChars + ' chars is ideal)\n');
    }
    
    // Tip 2: Prompt style analysis
    const totalPrompts = metrics.prompts.styleCounts.interrogative + 
                        metrics.prompts.styleCounts.imperative + 
                        metrics.prompts.styleCounts.narrative;
    const questionRatio = totalPrompts > 0 ? metrics.prompts.styleCounts.interrogative / totalPrompts : 0;
    const commandRatio = totalPrompts > 0 ? metrics.prompts.styleCounts.imperative / totalPrompts : 0;
    
    if (questionRatio > 0.7) {
      console.log('   ❓ Prompt Style: You ask many QUESTIONS (' + Math.round(questionRatio * 100) + '%)');
      console.log('      → Questions are good for exploration, but try direct commands for action');
      console.log('      → Examples: "Add...", "Update...", "Fix...", "Create...", "Refactor..."\n');
    } else if (commandRatio > 0.7) {
      console.log('   ✅ Prompt Style: Excellent! You use DIRECT COMMANDS (' + Math.round(commandRatio * 100) + '%)');
      console.log('      → Command-style prompts often get faster, more actionable results\n');
    } else {
      console.log('   ⚖️  Prompt Style: Good mix of questions and commands!');
      console.log('      → Balance helps: questions for learning, commands for action\n');
    }
    
    // Tip 3: Modification efficiency
    if (chain.steps.length > 0) {
      const changeRate = metrics.modificationSteps / chain.steps.length;
      if (changeRate < 0.3) {
        console.log('   🎯 Results: Only ' + Math.round(changeRate * 100) + '% of prompts resulted in changes');
        console.log('      → Be more specific about WHAT to modify and WHERE');
        console.log('      → Include file names or specific code sections when possible\n');
      } else if (changeRate > 0.8) {
        console.log('   ✅ Results: Excellent! ' + Math.round(changeRate * 100) + '% of prompts led to changes');
        console.log('      → Your prompts are clear and actionable\n');
      }
    }
    
    // Tip 4: Code impact
    if (metrics.uniqueFilesChanged > 5) {
      console.log('   📁 Scope: You modified ' + metrics.uniqueFilesChanged + ' files in this chain');
      console.log('      → Large changes are fine, but consider smaller focused chains');
      console.log('      → This makes it easier to review and revert if needed\n');
    }
    
    // Tip 5: General best practices
    console.log('   📚 Best Practices:');
    console.log('      • Start with "what" you want, then add "why" for context');
    console.log('      • Include constraints (language, framework, patterns to follow)');
    console.log('      • Reference specific files/functions for targeted changes');
    console.log('      • Break complex features into multiple prompt steps\n');
  }

  private pad(text: string, length: number): string {
    return text.length >= length ? text.substring(0, length) : text + ' '.repeat(length - text.length);
  }

  private formatDuration(ms: number): string {
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
}

async function main() {
  const repoPath = process.cwd();
  const storageDir = path.join(repoPath, '.gitpromptchain');

  const cli = new GitPromptChainCLI({
    repoPath,
    storageDir
  });

  await cli.initialize();
  await cli.start();
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { GitPromptChainCLI };
