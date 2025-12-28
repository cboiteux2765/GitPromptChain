# GitPromptChain

Track prompt chains, responses, and related git diffs for each commit.

## Install

```bash
npm install gitpromptchain
# or for CLI use
npm install -g gitpromptchain
```

## CLI Quick Start

```bash

```
Menu actions: start, add, save, view, viewc, exit. Chains are stored under `.gitpromptchain/` with a commit index for lookup.

## AI Tips (optional)

Set an OpenAI key to request LLM-generated tips after viewing metrics:

```powershell
$env:OPENAI_API_KEY = "sk-..."
$env:GITPROMPTCHAIN_LLM_MODEL = "gpt-4o-mini"  # optional
npm start
```
If no key is set or a request fails, the CLI shows built-in tips instead.

## VS Code Extension

The Chat-based extension lives in `vscode-extension/`. See its README for installation, usage, and debugging.

## Tests and Demos

```bash
npm test            # unit tests
npm run test:workflow
npm run demo
```
4. View saved chains with metrics tables
