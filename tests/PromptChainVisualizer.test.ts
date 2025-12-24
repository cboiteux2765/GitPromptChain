import { PromptChainVisualizer } from '../src/core/PromptChainVisualizer';
import { PromptChain, PromptChainDocument } from '../src/models/PromptChain';

describe('PromptChainVisualizer', () => {
  const createMockDocument = (): PromptChainDocument => ({
    metadata: {
      version: '1.0.0',
      created: new Date('2025-01-01T10:00:00Z'),
      repository: {
        name: 'test-repo',
        path: '/path/to/repo'
      }
    },
    chain: {
      chainId: 'test-chain-id',
      startTime: new Date('2025-01-01T10:00:00Z'),
      endTime: new Date('2025-01-01T10:05:00Z'),
      commitSha: 'abc123',
      branch: 'main',
      summary: 'Test chain',
      steps: [
        {
          id: 'step-1',
          timestamp: new Date('2025-01-01T10:00:00Z'),
          prompt: 'Test prompt',
          response: 'Test response',
          fileDiffs: [
            {
              filePath: 'test.ts',
              changeType: 'modified',
              diff: '+added line\n-removed line',
              linesAdded: 1,
              linesDeleted: 1
            }
          ]
        }
      ]
    }
  });

  describe('visualizeChain', () => {
    it('should generate visualization with all sections', () => {
      const doc = createMockDocument();
      const output = PromptChainVisualizer.visualizeChain(doc);
      
      expect(output).toContain('PROMPT CHAIN VISUALIZATION');
      expect(output).toContain('Chain ID:     test-chain-id');
      expect(output).toContain('Repository:   test-repo');
      expect(output).toContain('Branch:       main');
      expect(output).toContain('Summary:      Test chain');
      expect(output).toContain('STEP 1');
      expect(output).toContain('PROMPT:');
      expect(output).toContain('Test prompt');
      expect(output).toContain('RESPONSE:');
      expect(output).toContain('Test response');
      expect(output).toContain('END OF CHAIN');
    });

    it('should show file changes when present', () => {
      const doc = createMockDocument();
      const output = PromptChainVisualizer.visualizeChain(doc);
      
      expect(output).toContain('FILES CHANGED');
      expect(output).toContain('test.ts');
      expect(output).toContain('+1 -1');
    });

    it('should handle chain without file diffs', () => {
      const doc = createMockDocument();
      if (doc.chain.steps[0]) {
        doc.chain.steps[0].fileDiffs = undefined;
      }
      const output = PromptChainVisualizer.visualizeChain(doc);
      
      expect(output).toContain('FILES CHANGED: None');
    });

    it('should handle chain without optional fields', () => {
      const doc = createMockDocument();
      doc.chain.commitSha = undefined;
      doc.chain.branch = undefined;
      doc.chain.summary = undefined;
      doc.chain.endTime = undefined;
      
      const output = PromptChainVisualizer.visualizeChain(doc);
      
      expect(output).not.toContain('Commit:');
      expect(output).not.toContain('Branch:');
      expect(output).not.toContain('Summary:');
      expect(output).not.toContain('Duration:');
    });
  });

  describe('generateSummary', () => {
    it('should generate summary with file statistics', () => {
      const chain: PromptChain = {
        chainId: 'test',
        startTime: new Date(),
        steps: [
          {
            id: '1',
            timestamp: new Date(),
            prompt: 'p1',
            response: 'r1',
            fileDiffs: [
              {
                filePath: 'file1.ts',
                changeType: 'added',
                diff: '',
                linesAdded: 10,
                linesDeleted: 0
              },
              {
                filePath: 'file2.ts',
                changeType: 'modified',
                diff: '',
                linesAdded: 5,
                linesDeleted: 3
              }
            ]
          },
          {
            id: '2',
            timestamp: new Date(),
            prompt: 'p2',
            response: 'r2',
            fileDiffs: [
              {
                filePath: 'file1.ts',
                changeType: 'modified',
                diff: '',
                linesAdded: 2,
                linesDeleted: 1
              }
            ]
          }
        ]
      };
      
      const summary = PromptChainVisualizer.generateSummary(chain);
      
      expect(summary).toContain('2 prompts');
      expect(summary).toContain('2 files changed');
      expect(summary).toContain('+17 -4');
    });

    it('should handle chain with no file changes', () => {
      const chain: PromptChain = {
        chainId: 'test',
        startTime: new Date(),
        steps: [
          {
            id: '1',
            timestamp: new Date(),
            prompt: 'p1',
            response: 'r1'
          }
        ]
      };
      
      const summary = PromptChainVisualizer.generateSummary(chain);
      
      expect(summary).toContain('1 prompts');
      expect(summary).toContain('0 files changed');
      expect(summary).toContain('+0 -0');
    });
  });

  describe('toJSON', () => {
    it('should convert document to JSON string', () => {
      const doc = createMockDocument();
      const json = PromptChainVisualizer.toJSON(doc);
      
      expect(() => JSON.parse(json)).not.toThrow();
      const parsed = JSON.parse(json);
      expect(parsed.chain.chainId).toBe('test-chain-id');
      expect(parsed.metadata.version).toBe('1.0.0');
    });
  });
});
