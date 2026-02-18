import fs from 'fs';
import { JSONRenderer } from '../output/json.js';
import type { Population } from '../types.js';

export interface LoadPopulationOptions {
  /** Custom error handler instead of throwing */
  onError?: (message: string) => void;
}

export class PopulationLoadError extends Error {
  constructor(
    message: string,
    public readonly filePath: string
  ) {
    super(`${message}: ${filePath}`);
    this.name = 'PopulationLoadError';
  }
}

/**
 * Load and parse a population JSON file.
 * @param filePath - Path to the population JSON file
 * @param options - Optional configuration
 * @returns Parsed population object
 * @throws PopulationLoadError if file not found or parsing fails
 */
export function loadPopulationFile(
  filePath: string,
  options?: LoadPopulationOptions
): Population {
  // Check file exists
  if (!fs.existsSync(filePath)) {
    const error = new PopulationLoadError('File not found', filePath);
    if (options?.onError) {
      options.onError(error.message);
      // Return type requires Population, but we handle this in CLI with process.exit
      throw error;
    }
    throw error;
  }

  // Read and parse file
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const renderer = new JSONRenderer();
    return renderer.parse(content);
  } catch (error) {
    const parseError = new PopulationLoadError('Failed to parse population file', filePath);
    if (options?.onError) {
      options.onError(parseError.message);
      throw parseError;
    }
    throw parseError;
  }
}
