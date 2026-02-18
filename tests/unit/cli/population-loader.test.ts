import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import {
  loadPopulationFile,
  PopulationLoadError,
} from '../../../src/cli/population-loader.js';
import type { Population } from '../../../src/types.js';

// Mock fs module
vi.mock('fs');

// Mock JSONRenderer
vi.mock('../../../src/output/json.js', () => ({
  JSONRenderer: vi.fn().mockImplementation(() => ({
    parse: vi.fn().mockImplementation((content: string) => {
      return JSON.parse(content);
    }),
  })),
}));

describe('PopulationLoadError', () => {
  it('should include file path in message', () => {
    const error = new PopulationLoadError('File not found', '/path/to/file.json');

    expect(error.message).toContain('File not found');
    expect(error.message).toContain('/path/to/file.json');
    expect(error.filePath).toBe('/path/to/file.json');
    expect(error.name).toBe('PopulationLoadError');
  });
});

describe('loadPopulationFile', () => {
  const mockPopulation: Population = {
    context: {
      description: 'Test context',
    },
    axes: [],
    personas: [],
    generatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load and parse valid population file', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockPopulation));

    const result = loadPopulationFile('/path/to/population.json');

    expect(result).toEqual(mockPopulation);
    expect(fs.existsSync).toHaveBeenCalledWith('/path/to/population.json');
    expect(fs.readFileSync).toHaveBeenCalledWith('/path/to/population.json', 'utf-8');
  });

  it('should throw PopulationLoadError when file does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    expect(() => loadPopulationFile('/nonexistent.json')).toThrow(
      PopulationLoadError
    );

    try {
      loadPopulationFile('/nonexistent.json');
    } catch (error) {
      expect(error).toBeInstanceOf(PopulationLoadError);
      expect((error as PopulationLoadError).message).toContain('File not found');
      expect((error as PopulationLoadError).filePath).toBe('/nonexistent.json');
    }
  });

  it('should throw PopulationLoadError when JSON is invalid', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('not valid json');

    expect(() => loadPopulationFile('/invalid.json')).toThrow(
      PopulationLoadError
    );

    try {
      loadPopulationFile('/invalid.json');
    } catch (error) {
      expect(error).toBeInstanceOf(PopulationLoadError);
      expect((error as PopulationLoadError).message).toContain('Failed to parse');
    }
  });

  it('should call onError callback when file not found', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const onError = vi.fn();

    expect(() => loadPopulationFile('/missing.json', { onError })).toThrow();
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('File not found'));
  });

  it('should call onError callback when parsing fails', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('invalid json');
    const onError = vi.fn();

    expect(() => loadPopulationFile('/bad.json', { onError })).toThrow();
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('Failed to parse'));
  });

  it('should still throw after calling onError', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const onError = vi.fn();

    expect(() => loadPopulationFile('/missing.json', { onError })).toThrow(
      PopulationLoadError
    );
  });
});
