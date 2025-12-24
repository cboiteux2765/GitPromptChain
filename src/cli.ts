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
    console.log('view    - View a saved chain');
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
      case 'view':
      case '4':
        await this.viewChain();
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
        // Get current git state
        const currentBranch = await this.gitIntegration.getCurrentBranch();
        const commitSha = await this.gitIntegration.getLastCommitSha();
        
        // Capture file diffs as response
        const fileDiffs = await this.gitIntegration.getUncommittedDiffs();
        const response = fileDiffs.length > 0
          ? `Applied changes to ${fileDiffs.length} file(s):\n${fileDiffs.map(d => `  - ${d.filePath}: ${d.linesAdded} additions, ${d.linesDeleted} deletions`).join('\n')}`
          : '[No file changes detected]';

        // Add step to chain
        await this.manager.addStep(prompt, response, fileDiffs);
        
        // Auto-save the chain
        const updatedChain = await this.manager.endChain(commitSha, currentBranch);
        if (updatedChain) {
          await this.manager.saveChain(updatedChain);

          console.log(`\n✅ Step added and saved!`);
          console.log(`   Chain: ${current.chainId}`);
          console.log(`   Total steps: ${updatedChain.steps.length}`);
        }
        
        await this.showMenu();
      } catch (error) {
        console.error('Error adding step:', error instanceof Error ? error.message : error);
        await this.showMenu();
      }
    });
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
        console.log('\n' + PromptChainVisualizer.visualizeChain(selectedChain.doc));
      } else {
        console.log('\nChain not found.');
      }
      
      await this.showMenu();
    });
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
