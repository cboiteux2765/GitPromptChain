#!/usr/bin/env node

/**
 * Quick test to verify the LLM tips generator with a real OpenAI API key
 * Set OPENAI_API_KEY environment variable before running
 */

import { LLMTipsGenerator } from '../src/utils/LLMTipsGenerator';
import { PromptChain, PromptChainMetrics } from '../src/models/PromptChain';

async function testLLMTips() {
  console.log('Testing LLM tips generator...\n');

  if (!process.env.OPENAI_API_KEY) {
    console.log('OPENAI_API_KEY not set - skipping LLM test');
    console.log('Set OPENAI_API_KEY to test the OpenAI integration');
    console.log('\nExample (PowerShell):');
    console.log('  $env:OPENAI_API_KEY = "sk-..."');
    console.log('  npm run test:llm\n');
    process.exit(0);
  }

  const mockMetrics: PromptChainMetrics = {
    durationMs: 900000,
    modificationSteps: 2,
    uniqueFilesChanged: 3,
    totalLinesAdded: 42,
    totalLinesDeleted: 7,
    prompts: {
      totalLengthChars: 120,
      avgLengthChars: 15,
      styleCounts: {
        interrogative: 4,
        imperative: 0,
        narrative: 0
      }
    }
  };

  const mockChain: PromptChain = {
    chainId: 'test-chain-123',
    startTime: new Date(),
    summary: 'Test: User authentication',
    steps: [
      {
        id: 'step-1',
        timestamp: new Date(),
        prompt: 'How do I add JWT?',
        response: 'Here is how...'
      },
      {
        id: 'step-2',
        timestamp: new Date(),
        prompt: 'Add middleware?',
        response: 'Done'
      },
      {
        id: 'step-3',
        timestamp: new Date(),
        prompt: 'Fix auth bug?',
        response: 'Fixed'
      },
      {
        id: 'step-4',
        timestamp: new Date(),
        prompt: 'Test?',
        response: 'Tests added'
      }
    ]
  };

  try {
    console.log('Calling OpenAI API...');
    const tips = await LLMTipsGenerator.generateTips(mockMetrics, mockChain, {
      model: process.env.GITPROMPTCHAIN_LLM_MODEL || 'gpt-4o-mini'
    });
    
    console.log('\nAI-generated prompting tips:\n');
    console.log(tips);
    console.log('\nTest passed!\n');
  } catch (error) {
    console.error('\nTest failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

testLLMTips();
