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

  console.log(`\n📊 Evaluating population: ${filePath}`);
  console.log(`   Personas: ${population.personas.length}`);
  console.log(`   Axes: ${population.axes.length}`);
  console.log(`   Embedding mode: ${options.embeddingMode}`);

  // Extract points based on embedding mode
  let points: number[][];
  if (options.embeddingMode === 'api') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      printError('OPENAI_API_KEY environment variable is required for API embedding mode');
      process.exit(1);
    }
    const provider = new OpenAIProvider({ apiKey });
    points = await getPersonaPoints(population.personas, 'api', provider);
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
