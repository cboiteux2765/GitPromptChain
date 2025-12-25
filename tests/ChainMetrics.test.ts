import { computeChainMetrics } from '../src/utils/ChainMetrics';
import { PromptChain, FileDiff } from '../src/models/PromptChain';

describe('ChainMetrics', () => {
  describe('computeChainMetrics', () => {
    it('should compute metrics for a simple chain with one step', () => {
      const chain: PromptChain = {
        chainId: 'test-1',
        startTime: new Date('2025-01-01T10:00:00Z'),
        endTime: new Date('2025-01-01T10:05:00Z'),
        steps: [
          {
            id: 'step-1',
            timestamp: new Date('2025-01-01T10:00:00Z'),
            prompt: 'Hello world?',
            response: 'Hi there'
          }
        ]
      };

      const metrics = computeChainMetrics(chain);

      expect(metrics.durationMs).toBe(5 * 60 * 1000); // 5 minutes
      expect(metrics.modificationSteps).toBe(0);
      expect(metrics.uniqueFilesChanged).toBe(0);
      expect(metrics.totalLinesAdded).toBe(0);
      expect(metrics.totalLinesDeleted).toBe(0);
      expect(metrics.prompts.totalLengthChars).toBe(12); // 'Hello world?' = 12 chars
      expect(metrics.prompts.avgLengthChars).toBe(12);
      expect(metrics.prompts.styleCounts.interrogative).toBe(1);
      expect(metrics.prompts.styleCounts.imperative).toBe(0);
      expect(metrics.prompts.styleCounts.narrative).toBe(0);
    });

    it('should compute metrics with file changes', () => {
      const diffs: FileDiff[] = [
        {
          filePath: 'src/app.ts',
          changeType: 'modified',
          diff: '+added\n-removed',
          linesAdded: 5,
          linesDeleted: 2
        },
        {
          filePath: 'src/utils.ts',
          changeType: 'added',
          diff: '+new file',
          linesAdded: 10,
          linesDeleted: 0
        }
      ];

      const chain: PromptChain = {
        chainId: 'test-2',
        startTime: new Date('2025-01-01T10:00:00Z'),
        endTime: new Date('2025-01-01T10:10:00Z'),
        steps: [
          {
            id: 'step-1',
            timestamp: new Date('2025-01-01T10:00:00Z'),
            prompt: 'Implement feature',
            response: 'Done',
            fileDiffs: diffs
          }
        ]
      };

      const metrics = computeChainMetrics(chain);

      expect(metrics.modificationSteps).toBe(1);
      expect(metrics.uniqueFilesChanged).toBe(2);
      expect(metrics.totalLinesAdded).toBe(15);
      expect(metrics.totalLinesDeleted).toBe(2);
    });

    it('should detect imperative prompts', () => {
      const chain: PromptChain = {
        chainId: 'test-3',
        startTime: new Date('2025-01-01T10:00:00Z'),
        endTime: new Date('2025-01-01T10:05:00Z'),
        steps: [
          {
            id: 'step-1',
            timestamp: new Date('2025-01-01T10:00:00Z'),
            prompt: 'Add a new feature',
            response: 'Done'
          },
          {
            id: 'step-2',
            timestamp: new Date('2025-01-01T10:02:00Z'),
            prompt: 'Update the config',
            response: 'Updated'
          }
        ]
      };

      const metrics = computeChainMetrics(chain);

      expect(metrics.prompts.styleCounts.imperative).toBe(2);
      expect(metrics.prompts.styleCounts.interrogative).toBe(0);
      expect(metrics.prompts.styleCounts.narrative).toBe(0);
    });

    it('should aggregate metrics across multiple steps with file changes', () => {
      const diffs1: FileDiff[] = [
        {
          filePath: 'file1.ts',
          changeType: 'modified',
          diff: '',
          linesAdded: 3,
          linesDeleted: 1
        }
      ];

      const diffs2: FileDiff[] = [
        {
          filePath: 'file1.ts',
          changeType: 'modified',
          diff: '',
          linesAdded: 2,
          linesDeleted: 0
        },
        {
          filePath: 'file2.ts',
          changeType: 'added',
          diff: '',
          linesAdded: 8,
          linesDeleted: 0
        }
      ];

      const chain: PromptChain = {
        chainId: 'test-4',
        startTime: new Date('2025-01-01T10:00:00Z'),
        endTime: new Date('2025-01-01T10:20:00Z'),
        steps: [
          {
            id: 'step-1',
            timestamp: new Date('2025-01-01T10:00:00Z'),
            prompt: 'How should I structure this?',
            response: 'Like this',
            fileDiffs: diffs1
          },
          {
            id: 'step-2',
            timestamp: new Date('2025-01-01T10:10:00Z'),
            prompt: 'Fix the error',
            response: 'Fixed',
            fileDiffs: diffs2
          },
          {
            id: 'step-3',
            timestamp: new Date('2025-01-01T10:15:00Z'),
            prompt: 'Does this look good?',
            response: 'Looks great'
          }
        ]
      };

      const metrics = computeChainMetrics(chain);

      expect(metrics.durationMs).toBe(20 * 60 * 1000);
      expect(metrics.modificationSteps).toBe(2);
      expect(metrics.uniqueFilesChanged).toBe(2);
      expect(metrics.totalLinesAdded).toBe(13); // 3 + 2 + 8
      expect(metrics.totalLinesDeleted).toBe(1); // 1 + 0 + 0
      expect(metrics.prompts.styleCounts.interrogative).toBe(2);
      expect(metrics.prompts.styleCounts.imperative).toBe(1);
      expect(metrics.prompts.styleCounts.narrative).toBe(0);
    });

    it('should handle chain with no endTime', () => {
      const chain: PromptChain = {
        chainId: 'test-5',
        startTime: new Date('2025-01-01T10:00:00Z'),
        steps: [
          {
            id: 'step-1',
            timestamp: new Date('2025-01-01T10:00:00Z'),
            prompt: 'test',
            response: 'response'
          }
        ]
      };

      const metrics = computeChainMetrics(chain);

      expect(metrics.durationMs).toBe(0);
    });

    it('should calculate average prompt length correctly', () => {
      const chain: PromptChain = {
        chainId: 'test-6',
        startTime: new Date('2025-01-01T10:00:00Z'),
        endTime: new Date('2025-01-01T10:05:00Z'),
        steps: [
          {
            id: 'step-1',
            timestamp: new Date('2025-01-01T10:00:00Z'),
            prompt: '12345', // 5 chars
            response: 'r1'
          },
          {
            id: 'step-2',
            timestamp: new Date('2025-01-01T10:02:00Z'),
            prompt: '1234567890', // 10 chars
            response: 'r2'
          },
          {
            id: 'step-3',
            timestamp: new Date('2025-01-01T10:04:00Z'),
            prompt: '123', // 3 chars
            response: 'r3'
          }
        ]
      };

      const metrics = computeChainMetrics(chain);

      expect(metrics.prompts.totalLengthChars).toBe(18); // 5 + 10 + 3
      expect(metrics.prompts.avgLengthChars).toBe(6); // 18 / 3 = 6
    });

    it('should detect narrative prompts', () => {
      const chain: PromptChain = {
        chainId: 'test-7',
        startTime: new Date('2025-01-01T10:00:00Z'),
        endTime: new Date('2025-01-01T10:05:00Z'),
        steps: [
          {
            id: 'step-1',
            timestamp: new Date('2025-01-01T10:00:00Z'),
            prompt: 'I need to authenticate users securely',
            response: 'response'
          }
        ]
      };

      const metrics = computeChainMetrics(chain);

      expect(metrics.prompts.styleCounts.narrative).toBe(1);
      expect(metrics.prompts.styleCounts.imperative).toBe(0);
      expect(metrics.prompts.styleCounts.interrogative).toBe(0);
    });

    it('should handle empty chain', () => {
      const chain: PromptChain = {
        chainId: 'test-8',
        startTime: new Date('2025-01-01T10:00:00Z'),
        endTime: new Date('2025-01-01T10:00:00Z'),
        steps: []
      };

      const metrics = computeChainMetrics(chain);

      expect(metrics.modificationSteps).toBe(0);
      expect(metrics.uniqueFilesChanged).toBe(0);
      expect(metrics.totalLinesAdded).toBe(0);
      expect(metrics.totalLinesDeleted).toBe(0);
      expect(metrics.prompts.totalLengthChars).toBe(0);
      expect(metrics.prompts.avgLengthChars).toBe(0);
    });
  });
});
