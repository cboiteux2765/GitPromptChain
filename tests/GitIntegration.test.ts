import { GitIntegration } from '../src/utils/GitIntegration';
import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';

describe('GitIntegration', () => {
  let tempDir: string;
  let git: GitIntegration;

  beforeEach(async () => {
    tempDir = path.join('/tmp', `test-git-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    execSync('git init', { cwd: tempDir });
    execSync('git config user.email "test@example.com"', { cwd: tempDir });
    execSync('git config user.name "Test User"', { cwd: tempDir });
    
    git = new GitIntegration(tempDir);
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('getCurrentBranch', () => {
    it('should return current branch name', async () => {
      const branch = await git.getCurrentBranch();
      expect(branch).toBe('master');
    });
  });

  describe('getLastCommitSha', () => {
    it('should return commit SHA after creating commit', async () => {
      await fs.writeFile(path.join(tempDir, 'test.txt'), 'content');
      execSync('git add .', { cwd: tempDir });
      execSync('git commit -m "Test commit"', { cwd: tempDir });
      
      const sha = await git.getLastCommitSha();
      expect(sha).toMatch(/^[0-9a-f]{40}$/);
    });

    it('should return empty string if no commits', async () => {
      const sha = await git.getLastCommitSha();
      expect(sha).toBe('');
    });
  });

  describe('getUncommittedDiffs', () => {
    it('should return diffs for modified files', async () => {
      const testFile = path.join(tempDir, 'test.txt');
      await fs.writeFile(testFile, 'initial content');
      execSync('git add .', { cwd: tempDir });
      execSync('git commit -m "Initial commit"', { cwd: tempDir });
      
      await fs.writeFile(testFile, 'modified content');
      
      const diffs = await git.getUncommittedDiffs();
      
      expect(diffs.length).toBe(1);
      expect(diffs[0]!.filePath).toBe('test.txt');
      expect(diffs[0]!.changeType).toBe('modified');
      expect(diffs[0]!.linesAdded).toBeGreaterThan(0);
    });

    it('should return diffs for new files', async () => {
      await fs.writeFile(path.join(tempDir, 'new.txt'), 'new content');
      
      const diffs = await git.getUncommittedDiffs();
      
      expect(diffs.length).toBe(1);
      expect(diffs[0]!.filePath).toBe('new.txt');
      expect(diffs[0]!.changeType).toBe('added');
    });

    it('should return empty array if no changes', async () => {
      const diffs = await git.getUncommittedDiffs();
      expect(diffs).toEqual([]);
    });
  });

  describe('getCommitDiffs', () => {
    it('should return diffs for specific commit', async () => {
      await fs.writeFile(path.join(tempDir, 'test.txt'), 'content');
      execSync('git add .', { cwd: tempDir });
      execSync('git commit -m "Test commit"', { cwd: tempDir });
      
      const sha = await git.getLastCommitSha();
      const diffs = await git.getCommitDiffs(sha);
      
      expect(diffs.length).toBe(1);
      expect(diffs[0]!.filePath).toBe('test.txt');
      expect(diffs[0]!.changeType).toBe('added');
    });
  });

  describe('commit', () => {
    it('should create commit with message', async () => {
      await fs.writeFile(path.join(tempDir, 'test.txt'), 'content');
      
      const sha = await git.commit('Test commit message');
      
      expect(sha).toMatch(/^[0-9a-f]{40}$/);
      
      const log = execSync('git log -1 --pretty=%B', { cwd: tempDir }).toString().trim();
      expect(log).toBe('Test commit message');
    });
  });
});
