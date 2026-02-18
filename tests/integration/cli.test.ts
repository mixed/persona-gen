import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const CLI_PATH = path.join(process.cwd(), 'dist', 'cli', 'index.js');

function runCLI(
  args: string[],
  options: { env?: Record<string, string> } = {}
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn('node', [CLI_PATH, ...args], {
      env: { ...process.env, ...options.env },
      cwd: process.cwd(),
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        exitCode: code ?? 0,
        stdout,
        stderr,
      });
    });
  });
}

describe('CLI', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'persona-gen-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should show help with --help', async () => {
    // First build the project
    try {
      execSync('npm run build', { stdio: 'pipe' });
    } catch {
      // Build might already exist
    }

    const result = await runCLI(['--help']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('persona-gen');
    expect(result.stdout).toContain('generate');
    expect(result.stdout).toContain('evaluate');
  });

  it('should show generate help with generate --help', async () => {
    const result = await runCLI(['generate', '--help']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('--count');
    expect(result.stdout).toContain('--axes');
    expect(result.stdout).toContain('--format');
  });

  it('should fail without API key for generate', async () => {
    const result = await runCLI(['generate', 'test context'], {
      env: { OPENAI_API_KEY: '' },
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('API');
  });

  it('should run dry-run mode without API key', async () => {
    const result = await runCLI([
      'generate',
      'test context',
      '--dry-run',
      '-n',
      '5',
      '-a',
      '3',
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Dry run');
    expect(result.stdout).toContain('Sample coordinates');
  });

  it('should show version with --version', async () => {
    const result = await runCLI(['--version']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('0.1.0');
  });
});

describe('CLI evaluate command', () => {
  let tempDir: string;
  let testFile: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'persona-gen-test-'));

    // Create a test population file
    const population = {
      context: { description: 'Test' },
      axes: [
        {
          id: 'test-axis',
          name: 'Test Axis',
          description: 'A test axis',
          type: 'continuous',
          anchors: [
            { value: 0, label: 'Low' },
            { value: 1, label: 'High' },
          ],
        },
      ],
      personas: [
        {
          id: 'p1',
          name: 'Test Person 1',
          coordinates: [{ axisId: 'test-axis', rawValue: 0.2, mappedValue: 'Low' }],
          description: 'A test persona',
          traits: {},
          behaviorPatterns: [],
        },
        {
          id: 'p2',
          name: 'Test Person 2',
          coordinates: [{ axisId: 'test-axis', rawValue: 0.8, mappedValue: 'High' }],
          description: 'Another test persona',
          traits: {},
          behaviorPatterns: [],
        },
      ],
      generatedAt: new Date().toISOString(),
    };

    testFile = path.join(tempDir, 'test-population.json');
    fs.writeFileSync(testFile, JSON.stringify(population, null, 2));

    // Build first
    try {
      execSync('npm run build', { stdio: 'pipe' });
    } catch {
      // Already built
    }
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should evaluate existing population file', async () => {
    const result = await runCLI(['evaluate', testFile]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Evaluating population');
    expect(result.stdout).toContain('Coverage');
  });

  it('should fallback to coordinate mode when API key is not set', async () => {
    const result = await runCLI(['evaluate', testFile], {
      env: { OPENAI_API_KEY: '' },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('falling back to coordinate mode');
    expect(result.stdout).toContain('Embedding mode: coordinate');
  });

  it('should use coordinate mode when explicitly specified', async () => {
    const result = await runCLI(['evaluate', testFile, '--embedding-mode', 'coordinate']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Embedding mode: coordinate');
    // No fallback warning when explicitly using coordinate
    expect(result.stderr).not.toContain('falling back');
  });

  it('should fail with non-existent file', async () => {
    const result = await runCLI(['evaluate', '/nonexistent/file.json']);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('not found');
  });
});

describe('CLI inspect command', () => {
  let tempDir: string;
  let testFile: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'persona-gen-test-'));

    const population = {
      context: { description: 'Test Context' },
      axes: [],
      personas: [
        {
          id: 'persona-1',
          name: 'John Doe',
          coordinates: [],
          description: 'A test persona',
          traits: { occupation: 'Engineer' },
          behaviorPatterns: ['Pattern 1'],
        },
      ],
      generatedAt: new Date().toISOString(),
    };

    testFile = path.join(tempDir, 'test.json');
    fs.writeFileSync(testFile, JSON.stringify(population, null, 2));

    try {
      execSync('npm run build', { stdio: 'pipe' });
    } catch {
      // Already built
    }
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should show population summary by default', async () => {
    const result = await runCLI(['inspect', testFile]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Population Summary');
    expect(result.stdout).toContain('Test Context');
  });

  it('should show specific persona with --id', async () => {
    const result = await runCLI(['inspect', testFile, '--id', 'persona-1']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('John Doe');
    expect(result.stdout).toContain('Engineer');
  });

  it('should fail with invalid persona ID', async () => {
    const result = await runCLI(['inspect', testFile, '--id', 'invalid-id']);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('not found');
  });
});
