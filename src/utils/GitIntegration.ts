import simpleGit, { SimpleGit, DiffResult } from 'simple-git';
import { FileDiff } from '../models/PromptChain';

export class GitIntegration {
  private git: SimpleGit;
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
  }

  async getCurrentBranch(): Promise<string> {
    try {
      const branch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
      return branch.trim();
    } catch (error) {
      return 'master';
    }
  }

  async getLastCommitSha(): Promise<string> {
    try {
      const log = await this.git.log(['-1']);
      return log.latest?.hash || '';
    } catch (error) {
      return '';
    }
  }

  async getUncommittedDiffs(): Promise<FileDiff[]> {
    const diffs: FileDiff[] = [];

    try {
      // Get status to identify changed files
      const status = await this.git.status();
      
      // Get diff for each file
      for (const file of status.files) {
        const changeType = this.getChangeType(file.working_dir);
        
        if (changeType) {
          let diff = '';
          try {
            // Get the actual diff
            diff = await this.git.diff(['HEAD', '--', file.path]);
          } catch (error) {
            // For new files, diff against /dev/null
            if (changeType === 'added') {
              diff = await this.git.diff(['--', file.path]);
            }
          }

          const stats = this.parseDiffStats(diff);
          
          diffs.push({
            filePath: file.path,
            changeType,
            diff,
            linesAdded: stats.added,
            linesDeleted: stats.deleted
          });
        }
      }

      return diffs;
    } catch (error) {
      console.error('Failed to get uncommitted diffs:', error);
      return [];
    }
  }

  /**
   * Get file diffs for a specific commit
   */
  async getCommitDiffs(commitSha: string): Promise<FileDiff[]> {
    const diffs: FileDiff[] = [];

    try {
      let diffSummary;
      try {
        diffSummary = await this.git.diffSummary([`${commitSha}~1`, commitSha]);
      } catch (parentError) {
        diffSummary = await this.git.diffSummary(['4b825dc642cb6eb9a060e54bf8d69288fbee4904', commitSha]);
      }
      
      for (const file of diffSummary.files) {
        let diff;
        try {
          diff = await this.git.diff([`${commitSha}~1`, commitSha, '--', file.file]);
        } catch (error) {
          diff = await this.git.diff(['4b825dc642cb6eb9a060e54bf8d69288fbee4904', commitSha, '--', file.file]);
        }
        
        let changeType: 'added' | 'modified' | 'deleted' = 'modified';
        let linesAdded = 0;
        let linesDeleted = 0;
        
        if ('insertions' in file) {
          linesAdded = file.insertions;
        }
        if ('deletions' in file) {
          linesDeleted = file.deletions;
        }
        
        if (file.binary) {
          changeType = 'modified';
        } else {
          if (linesAdded > 0 && linesDeleted === 0) {
            changeType = 'added';
          } else if (linesAdded === 0 && linesDeleted > 0) {
            changeType = 'deleted';
          }
        }

        diffs.push({
          filePath: file.file,
          changeType,
          diff,
          linesAdded,
          linesDeleted
        });
      }

      return diffs;
    } catch (error) {
      console.error(`Failed to get diffs for commit ${commitSha}:`, error);
      return [];
    }
  }

  private getChangeType(indicator: string): 'added' | 'modified' | 'deleted' | null {
    switch (indicator) {
      case 'M':
        return 'modified';
      case 'A':
      case '?':
        return 'added';
      case 'D':
        return 'deleted';
      default:
        return null;
    }
  }

  private parseDiffStats(diff: string): { added: number; deleted: number } {
    const lines = diff.split('\n');
    let added = 0;
    let deleted = 0;

    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        added++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        deleted++;
      }
    }

    return { added, deleted };
  }

  async commit(message: string): Promise<string> {
    await this.git.add('.');
    await this.git.commit(message);
    return await this.getLastCommitSha();
  }
}
