#!/usr/bin/env node

/**
 * CLI interface for GitPromptChain
 */

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
    console.log('\nWhat would you like to do?');
    console.log('1. Start a new prompt chain');
    console.log('2. Add a prompt step to current chain');
    console.log('3. End current chain and save');
    console.log('4. View a saved chain');
    console.log('5. List all chains');
    console.log('6. Exit\n');

    this.rl.question('Enter your choice (1-6): ', async (choice) => {
      await this.handleMenuChoice(choice.trim());
    });
  }

  private async handleMenuChoice(choice: string): Promise<void> {
    switch (choice) {
      case '1':
        await this.startNewChain();
        break;
      case '2':
        await this.addPromptStep();
        break;
      case '3':
        await this.endAndSaveChain();
        break;
      case '4':
        await this.viewChain();
        break;
      case '5':
        await this.listChains();
        break;
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
      console.log('\n❌ No active chain. Please start a new chain first.');
      await this.showMenu();
      return;
    }

    console.log('\nEnter your prompt (press Enter twice to finish):');
    const prompt = await this.readMultilineInput();

    console.log('\nEnter the response (press Enter twice to finish):');
    const response = await this.readMultilineInput();

    console.log('\nCapturing file diffs...');
    const fileDiffs = await this.gitIntegration.getUncommittedDiffs();

    await this.manager.addStep(prompt, response, fileDiffs);
    console.log(`\n✅ Added step to chain. Files changed: ${fileDiffs.length}`);
    
    await this.showMenu();
  }

  private async endAndSaveChain(): Promise<void> {
    const current = this.manager.getCurrentChain();
    if (!current) {
      console.log('\n❌ No active chain to end.');
      await this.showMenu();
      return;
    }

    try {
      const branch = await this.gitIntegration.getCurrentBranch();
      const commitSha = await this.gitIntegration.getLastCommitSha();
      
      const chain = await this.manager.endChain(commitSha, branch);
      if (chain) {
        const filepath = await this.manager.saveChain(chain);
        console.log(`\n✅ Chain saved successfully!`);
        console.log(`   Chain ID: ${chain.chainId}`);
        console.log(`   Steps: ${chain.steps.length}`);
        console.log(`   File: ${filepath}`);
      }
    } catch (error) {
      console.error('\n❌ Failed to save chain:', error);
    }

    await this.showMenu();
  }

  private async viewChain(): Promise<void> {
    this.rl.question('Enter chain ID: ', async (chainId) => {
      const document = await this.manager.loadChain(chainId.trim());
      if (document) {
        console.log('\n' + PromptChainVisualizer.visualizeChain(document));
      } else {
        console.log('\n❌ Chain not found.');
      }
      await this.showMenu();
    });
  }

  private async listChains(): Promise<void> {
    const chains = await this.manager.listChains();
    
    if (chains.length === 0) {
      console.log('\n📋 No chains found.');
    } else {
      console.log(`\n📋 Found ${chains.length} chain(s):\n`);
      for (const chainId of chains) {
        const doc = await this.manager.loadChain(chainId);
        if (doc) {
          const summary = PromptChainVisualizer.generateSummary(doc.chain);
          console.log(`  • ${chainId}`);
          console.log(`    ${summary}`);
        }
      }
    }

    await this.showMenu();
  }

  private readMultilineInput(): Promise<string> {
    return new Promise((resolve) => {
      const lines: string[] = [];
      let emptyLineCount = 0;

      const onLine = (line: string) => {
        if (line.trim() === '') {
          emptyLineCount++;
          if (emptyLineCount >= 2) {
            this.rl.removeListener('line', onLine);
            resolve(lines.join('\n'));
            return;
          }
        } else {
          emptyLineCount = 0;
        }
        lines.push(line);
      };

      this.rl.on('line', onLine);
    });
  }
}

// Main execution
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

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { GitPromptChainCLI };
