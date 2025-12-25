import { PromptChain, PromptStep, FileDiff, PromptChainMetrics } from '../models/PromptChain';

function isImperative(text: string): boolean {
  // Heuristic: starts with a common verb (lowercased) or `add`, `update`, `fix`, `create`
  const firstWord = text.trim().split(/\s+/)[0]?.toLowerCase() || '';
  const verbs = new Set([
    'add', 'update', 'fix', 'create', 'remove', 'delete', 'refactor', 'rename',
    'implement', 'write', 'generate', 'optimize', 'document', 'explain', 'show'
  ]);
  return verbs.has(firstWord);
}

export function computeChainMetrics(chain: PromptChain): PromptChainMetrics {
  const start = new Date(chain.startTime).getTime();
  const end = chain.endTime ? new Date(chain.endTime).getTime() : start;
  const durationMs = Math.max(0, end - start);

  const uniqueFiles = new Set<string>();
  let modificationSteps = 0;
  let totalLinesAdded = 0;
  let totalLinesDeleted = 0;

  let totalPromptChars = 0;
  let interrogative = 0;
  let imperative = 0;
  let narrative = 0;

  chain.steps.forEach((step: PromptStep) => {
    totalPromptChars += step.prompt.length;
    if (/\?\s*$/.test(step.prompt)) {
      interrogative += 1;
    } else if (isImperative(step.prompt)) {
      imperative += 1;
    } else {
      narrative += 1;
    }

    if (step.fileDiffs && step.fileDiffs.length > 0) {
      modificationSteps += 1;
      step.fileDiffs.forEach((d: FileDiff) => {
        uniqueFiles.add(d.filePath);
        totalLinesAdded += d.linesAdded || 0;
        totalLinesDeleted += d.linesDeleted || 0;
      });
    }
  });

  const avgLengthChars = chain.steps.length > 0 ? Math.round(totalPromptChars / chain.steps.length) : 0;

  return {
    durationMs,
    modificationSteps,
    uniqueFilesChanged: uniqueFiles.size,
    totalLinesAdded,
    totalLinesDeleted,
    prompts: {
      totalLengthChars: totalPromptChars,
      avgLengthChars,
      styleCounts: {
        interrogative,
        imperative,
        narrative,
      },
    },
  };
}
