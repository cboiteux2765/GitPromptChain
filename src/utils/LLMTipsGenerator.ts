import { PromptChain, PromptChainMetrics } from '../models/PromptChain';

export interface LLMTipsOptions {
  model?: string;
}

export class LLMTipsGenerator {
  static async generateTips(metrics: PromptChainMetrics, chain: PromptChain, options: LLMTipsOptions = {}): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('Missing OPENAI_API_KEY');
    }

    // Lazy import to avoid hard dependency if not used
    const { OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey });

    const model = options.model || 'gpt-4o-mini';

    const system = [
      'You are an expert AI assistant that analyzes developer prompt chains and code change metrics to provide concise, actionable prompting tips.',
      'Use a friendly, constructive tone. Return a short list (4-7 bullets).',
      'Focus on: prompt length, style (questions vs commands), specificity, modification efficiency, and scope management.',
    ].join(' ');

    const user = JSON.stringify({ metrics, chain: {
      chainId: chain.chainId,
      summary: chain.summary,
      steps: chain.steps.map(s => ({ id: s.id, prompt: s.prompt }))
    } });

    // Prefer the responses API where available
    const response = await client.responses.create({
      model,
      instructions: system,
      input: user,
      max_output_tokens: 400,
    });

    const text = response.output_text || '';
    return text.trim() || 'No tips generated.';
  }
}
