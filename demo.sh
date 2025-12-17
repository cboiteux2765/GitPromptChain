#!/bin/bash
# Demo script for GitPromptChain

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║          GitPromptChain Demo                               ║"
echo "║          Visualizing LLM Prompt Chains                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Create a demo repository
DEMO_DIR="/tmp/gitpromptchain-demo"
rm -rf "$DEMO_DIR"
mkdir -p "$DEMO_DIR"
cd "$DEMO_DIR"

echo "📁 Setting up demo repository..."
git init -q
git config user.email "demo@example.com"
git config user.name "Demo User"

# Create a simple file
cat > app.js << 'EOF'
// Simple Express app
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(3000);
EOF

git add app.js
git commit -q -m "Initial commit"

echo "✅ Demo repository created"
echo ""

# Create a demo prompt chain
echo "📝 Creating a sample prompt chain..."
cd /home/runner/work/GitPromptChain/GitPromptChain

# Use the programmatic API to create a demo chain
cat > /tmp/create-demo-chain.js << 'EOFJS'
const { PromptChainManager, GitIntegration, PromptChainVisualizer, createMCPProvider } = require('/home/runner/work/GitPromptChain/GitPromptChain/dist/index.js');
const path = require('path');

async function createDemoChain() {
  const repoPath = '/tmp/gitpromptchain-demo';
  const storageDir = path.join(repoPath, '.gitpromptchain');
  
  const manager = new PromptChainManager({
    storageDir,
    repoPath,
    mcpProvider: createMCPProvider({ enabled: false })
  });
  
  await manager.initialize();
  
  // Start a chain
  const chain = await manager.startChain('Adding JWT authentication to Express app');
  
  // Add some steps
  await manager.addStep(
    'How do I add JWT authentication to an Express application?',
    'To add JWT authentication to Express:\n\n1. Install jsonwebtoken: npm install jsonwebtoken\n2. Create middleware to verify tokens\n3. Protect routes with the middleware\n4. Generate tokens on login',
    []
  );
  
  await manager.addStep(
    'Can you show me how to create the authentication middleware?',
    'Here\'s a JWT authentication middleware:\n\nconst jwt = require(\'jsonwebtoken\');\n\nfunction authenticateToken(req, res, next) {\n  const token = req.headers[\'authorization\']?.split(\' \')[1];\n  if (!token) return res.sendStatus(401);\n  \n  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {\n    if (err) return res.sendStatus(403);\n    req.user = user;\n    next();\n  });\n}',
    []
  );
  
  await manager.addStep(
    'How do I generate tokens on user login?',
    'Generate tokens on login like this:\n\napp.post(\'/login\', (req, res) => {\n  const { username, password } = req.body;\n  // Verify credentials (simplified)\n  if (authenticate(username, password)) {\n    const token = jwt.sign(\n      { username },\n      process.env.JWT_SECRET,\n      { expiresIn: \'24h\' }\n    );\n    res.json({ token });\n  } else {\n    res.sendStatus(401);\n  }\n});',
    []
  );
  
  // End the chain
  const git = new GitIntegration(repoPath);
  const branch = await git.getCurrentBranch().catch(() => 'main');
  const completedChain = await manager.endChain(undefined, branch);
  
  if (completedChain) {
    const filepath = await manager.saveChain(completedChain);
    
    // Load and visualize
    const document = await manager.loadChain(completedChain.chainId);
    console.log('\n' + PromptChainVisualizer.visualizeChain(document));
    
    console.log('\n📊 Summary Statistics:');
    const summary = PromptChainVisualizer.generateSummary(completedChain);
    console.log('   ' + summary);
    console.log('   Saved to: ' + filepath);
  }
}

createDemoChain().catch(console.error);
EOFJS

node /tmp/create-demo-chain.js

echo ""
echo "✨ Demo completed!"
echo ""
echo "💡 This demonstrates how GitPromptChain:"
echo "   • Captures prompt-response pairs"
echo "   • Links them to Git commits"
echo "   • Provides beautiful visualizations"
echo "   • Helps you learn from your prompting patterns"
echo ""
