import fs from 'fs';
import { JSONRenderer } from '../../output/json.js';
import { computeAllMetrics } from '../../evaluation/metrics.js';
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

  // Extract coordinates
  const points = population.personas.map((p) =>
    p.coordinates.map((c) => c.rawValue)
  );

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
