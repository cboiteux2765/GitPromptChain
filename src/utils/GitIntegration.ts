/**
 * Git integration utilities for capturing file diffs and commit information
 */

import simpleGit, { SimpleGit, DiffResult } from 'simple-git';
import { FileDiff } from '../models/PromptChain';

export class GitIntegration {
  private git: SimpleGit;
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(): Promise<string> {
    const branch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
    return branch.trim();
  }

  /**
   * Get the last commit SHA
   */
  async getLastCommitSha(): Promise<string> {
    const log = await this.git.log(['-1']);
    return log.latest?.hash || '';
  }

  /**
   * Get file diffs for uncommitted changes
   */
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
      const diffSummary = await this.git.diffSummary([`${commitSha}~1`, commitSha]);
      
      for (const file of diffSummary.files) {
        const diff = await this.git.diff([`${commitSha}~1`, commitSha, '--', file.file]);
        
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
          // Determine change type based on insertions/deletions
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

  /**
   * Parse git status working directory indicator to change type
   */
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

  /**
   * Parse diff output to extract line statistics
   */
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

  /**
   * Create a commit with message
   */
  async commit(message: string): Promise<string> {
    await this.git.add('.');
    await this.git.commit(message);
    return await this.getLastCommitSha();
  }
}
