/**
 * Represents a single prompt-response exchange in the chain
 */
export interface PromptStep {
  /** Unique identifier for this step */
  id: string;
  /** Timestamp when the prompt was submitted */
  timestamp: Date;
  /** The user's prompt/question */
  prompt: string;
  /** The LLM's response */
  response: string;
  /** File changes made as a result of this step */
  fileDiffs?: FileDiff[];
}

/**
 * Represents a file diff for a single file
 */
export interface FileDiff {
  /** Path to the file relative to repository root */
  filePath: string;
  /** Type of change */
  changeType: 'added' | 'modified' | 'deleted';
  /** Git diff output for this file */
  diff: string;
  /** Lines added */
  linesAdded: number;
  /** Lines deleted */
  linesDeleted: number;
}

/**
 * Represents a complete chain of prompts leading to a commit
 */
export interface PromptChain {
  /** Unique identifier for this chain */
  chainId: string;
  /** When the chain was started */
  startTime: Date;
  /** When the chain ended/was committed */
  endTime?: Date;
  /** Associated git commit SHA (if committed) */
  commitSha?: string;
  /** Branch name */
  branch?: string;
  /** Array of prompt-response steps */
  steps: PromptStep[];
  /** Summary/goal of this prompt chain */
  summary?: string;
}

/**
 * Metadata about the prompt chain for storage
 */
export interface PromptChainMetadata {
  /** Version of the data format */
  version: string;
  /** Timestamp of creation */
  created: Date;
  /** Repository information */
  repository?: {
    name: string;
    path: string;
  };
  /** Computed metrics for the chain */
  metrics?: PromptChainMetrics;
}

/**
 * Complete prompt chain document for storage
 */
export interface PromptChainDocument {
  metadata: PromptChainMetadata;
  chain: PromptChain;
}

/**
 * Computed metrics for a prompt chain
 */
export interface PromptChainMetrics {
  /** Total duration in milliseconds (start -> end) */
  durationMs: number;
  /** Number of steps that resulted in file modifications */
  modificationSteps: number;
  /** Unique files changed across all steps */
  uniqueFilesChanged: number;
  /** Total lines added across all steps */
  totalLinesAdded: number;
  /** Total lines deleted across all steps */
  totalLinesDeleted: number;
  /** Prompt statistics */
  prompts: {
    /** Sum of prompt character lengths */
    totalLengthChars: number;
    /** Average prompt character length */
    avgLengthChars: number;
    /** Simple style counts */
    styleCounts: {
      /** Prompts ending with '?' */
      interrogative: number;
      /** Prompts starting with a verb (heuristic) */
      imperative: number;
      /** Other narrative/descriptive prompts */
      narrative: number;
    };
  };
}
