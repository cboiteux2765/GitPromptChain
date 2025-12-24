import { PromptChain, PromptStep, FileDiff, PromptChainDocument } from '../models/PromptChain';

export class PromptChainVisualizer {
  static visualizeChain(document: PromptChainDocument): string {
    const { chain, metadata } = document;
    let output = '';

    output += '═══════════════════════════════════════════════════════════════\n';
    output += '                    PROMPT CHAIN VISUALIZATION                  \n';
    output += '═══════════════════════════════════════════════════════════════\n\n';

    output += `Chain ID:     ${chain.chainId}\n`;
    output += `Repository:   ${metadata.repository?.name || 'Unknown'}\n`;
    output += `Started:      ${chain.startTime}\n`;
    if (chain.endTime) {
      output += `Ended:        ${chain.endTime}\n`;
      const duration = new Date(chain.endTime).getTime() - new Date(chain.startTime).getTime();
      output += `Duration:     ${this.formatDuration(duration)}\n`;
    }
    if (chain.commitSha) {
      output += `Commit:       ${chain.commitSha}\n`;
    }
    if (chain.branch) {
      output += `Branch:       ${chain.branch}\n`;
    }
    if (chain.summary) {
      output += `Summary:      ${chain.summary}\n`;
    }
    output += `Steps:        ${chain.steps.length}\n`;

    output += '\n';
    output += '───────────────────────────────────────────────────────────────\n\n';

    chain.steps.forEach((step, index) => {
      output += this.visualizeStep(step, index + 1);
      output += '\n';
    });

    output += '═══════════════════════════════════════════════════════════════\n';
    output += '                         END OF CHAIN                           \n';
    output += '═══════════════════════════════════════════════════════════════\n';

    return output;
  }

  private static visualizeStep(step: PromptStep, stepNumber: number): string {
    let output = '';

    output += `┌─ STEP ${stepNumber} ────────────────────────────────────────────────────\n`;
    output += `│ Timestamp: ${step.timestamp}\n`;
    output += `│ ID: ${step.id}\n`;
    output += `└──────────────────────────────────────────────────────────────\n\n`;

    output += 'PROMPT:\n';
    output += this.indentText(step.prompt, '  ');
    output += '\n\n';

    output += 'RESPONSE:\n';
    output += this.indentText(step.response, '  ');
    output += '\n\n';

    if (step.fileDiffs && step.fileDiffs.length > 0) {
      output += `FILES CHANGED (${step.fileDiffs.length}):\n`;
      step.fileDiffs.forEach(diff => {
        output += this.visualizeFileDiff(diff);
      });
    } else {
      output += 'FILES CHANGED: None\n';
    }

    output += '───────────────────────────────────────────────────────────────\n';

    return output;
  }

  private static visualizeFileDiff(diff: FileDiff): string {
    let output = '';

    const prefix = diff.changeType === 'added' ? '[+]' : 
                   diff.changeType === 'deleted' ? '[-]' : '[*]';
    
    output += `  ${prefix} ${diff.filePath} (${diff.changeType})\n`;
    output += `      +${diff.linesAdded} -${diff.linesDeleted}\n`;

    if (diff.diff && diff.diff.length > 0) {
      const preview = this.getDiffPreview(diff.diff, 5);
      if (preview) {
        output += this.indentText(preview, '      ');
        output += '\n';
      }
    }

    return output;
  }

  private static getDiffPreview(diff: string, maxLines: number): string {
    const lines = diff.split('\n');
    const relevantLines = lines.filter(line => 
      line.startsWith('+') || line.startsWith('-') || line.startsWith('@@')
    );
    
    const preview = relevantLines.slice(0, maxLines).join('\n');
    if (relevantLines.length > maxLines) {
      return preview + '\n      ... (diff truncated)';
    }
    return preview;
  }

  private static indentText(text: string, indent: string): string {
    return text.split('\n').map(line => indent + line).join('\n');
  }

  private static formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  static toJSON(document: PromptChainDocument): string {
    return JSON.stringify(document, null, 2);
  }

  static generateSummary(chain: PromptChain): string {
    const totalFiles = new Set<string>();
    let totalAdded = 0;
    let totalDeleted = 0;

    chain.steps.forEach(step => {
      if (step.fileDiffs) {
        step.fileDiffs.forEach(diff => {
          totalFiles.add(diff.filePath);
          totalAdded += diff.linesAdded;
          totalDeleted += diff.linesDeleted;
        });
      }
    });

    return `Chain with ${chain.steps.length} prompts, ${totalFiles.size} files changed (+${totalAdded} -${totalDeleted})`;
  }
}
