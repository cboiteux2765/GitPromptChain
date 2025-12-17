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
}

/**
 * Complete prompt chain document for storage
 */
export interface PromptChainDocument {
  metadata: PromptChainMetadata;
  chain: PromptChain;
}
