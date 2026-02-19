import fs from 'fs';
import { JSONRenderer } from '../../output/json.js';
import { computeAllMetrics } from '../../evaluation/metrics.js';
import { getPersonaPoints } from '../../evaluation/embedding.js';
import { OpenAIProvider } from '../../llm/openai.js';
import { printMetrics, printError } from '../utils.js';
import { loadPopulationFile, PopulationLoadError } from '../population-loader.js';

export interface EvaluateOptions {
  embeddingMode: 'coordinate' | 'api';
  output?: string;
}

export async function evaluateCommand(
  filePath: string,
  options: EvaluateOptions
): Promise<void> {
  // Load population file
  let population;
  try {
    population = loadPopulationFile(filePath);
  } catch (error) {
    if (error instanceof PopulationLoadError) {
      printError(error.message);
      process.exit(1);
    }
    throw error;
  }

  // Fallback to coordinate mode if API key is not available
  let effectiveMode = options.embeddingMode;
  if (effectiveMode === 'api') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('⚠ OPENAI_API_KEY not set — falling back to coordinate mode');
      effectiveMode = 'coordinate';
    }
  }

  console.log(`\n📊 Evaluating population: ${filePath}`);
  console.log(`   Personas: ${population.personas.length}`);
  console.log(`   Axes: ${population.axes.length}`);
  console.log(`   Embedding mode: ${effectiveMode}`);

  // Extract points based on embedding mode
  let points: number[][];
  if (effectiveMode === 'api') {
    const apiKey = process.env.OPENAI_API_KEY!;
    const provider = new OpenAIProvider({ apiKey });
    points = await getPersonaPoints(population.personas, 'api', provider, population.axes.length);
  } else {
    points = await getPersonaPoints(population.personas, 'coordinate');
  }

  // Compute metrics
  const metrics = computeAllMetrics(points);

  // Update population with new metrics
  population.metrics = metrics;

  // Print results
  printMetrics(metrics);

  // Optionally save updated file
  if (options.output) {
    const renderer = new JSONRenderer();
    fs.writeFileSync(options.output, renderer.render(population));
    console.log(`\n📁 Updated file saved: ${options.output}`);
  }
}
