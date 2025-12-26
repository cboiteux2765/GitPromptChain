/** Basic usage of GitPromptChain */

import { PromptChainManager, GitIntegration, PromptChainVisualizer } from '../src/index';
import * as path from 'path';

async function basicExample() {
  console.log('GitPromptChain - Basic Example\n');

  const repoPath = process.cwd();
  const storageDir = path.join(repoPath, '.gitpromptchain-example');

  const manager = new PromptChainManager({
    storageDir,
    repoPath
  });

  const git = new GitIntegration(repoPath);

  await manager.initialize();
  console.log('Initialized GitPromptChain');

  const chain = await manager.startChain('Building a user authentication system');
  console.log(`Started chain: ${chain.chainId}\n`);

  console.log('Adding prompt steps...\n');

  await manager.addStep(
    'How do I set up a basic Express server with TypeScript?',
    `Here's how to set up an Express server with TypeScript:

1. Install dependencies: npm install express
2. Install dev dependencies: npm install -D @types/express typescript
3. Create a basic server file...`,
    []
  );
  console.log('Step 1 added');

  await manager.addStep(
    'How do I add JWT authentication to the Express server?',
    `To add JWT authentication:

1. Install jsonwebtoken: npm install jsonwebtoken
2. Create an authentication middleware
3. Add login/register routes...`,
    []
  );
  console.log('Step 2 added');

  await manager.addStep(
    'How do I hash passwords securely?',
    `Use bcrypt for password hashing:

1. Install bcrypt: npm install bcrypt
2. Hash passwords before storing
3. Compare hashed passwords during login...`,
    []
  );
  console.log('Step 3 added\n');

  // End the chain
  const branch = await git.getCurrentBranch().catch(() => 'main');
  const completedChain = await manager.endChain(undefined, branch);

  if (completedChain) {
    const filepath = await manager.saveChain(completedChain);
    console.log(`Chain saved to: ${filepath}\n`);

    const document = await manager.loadChain(completedChain.chainId);
    if (document) {
      console.log('Visualization:\n');
      console.log(PromptChainVisualizer.visualizeChain(document));
    }

    const summary = PromptChainVisualizer.generateSummary(completedChain);
    console.log(`\nSummary: ${summary}`);
  }

  console.log('\nExample completed!');
}

// Run the example
basicExample().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
