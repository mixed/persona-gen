import chalk from 'chalk';
import type { Population } from '../../types.js';
import { printError } from '../utils.js';
import { loadPopulationFile, PopulationLoadError } from '../population-loader.js';

export interface InspectOptions {
  id?: string;
  summary: boolean;
}

export async function inspectCommand(
  filePath: string,
  options: InspectOptions
): Promise<void> {
  // Load population file
  let population: Population;
  try {
    population = loadPopulationFile(filePath);
  } catch (error) {
    if (error instanceof PopulationLoadError) {
      printError(error.message);
      process.exit(1);
    }
    throw error;
  }

  if (options.summary || (!options.id && !options.summary)) {
    printSummary(population);
    return;
  }

  if (options.id) {
    const persona = population.personas.find((p) => p.id === options.id);
    if (!persona) {
      printError(`Persona not found: ${options.id}`);
      console.log('\nAvailable IDs:');
      population.personas.forEach((p) => console.log(`  - ${p.id}: ${p.name}`));
      process.exit(1);
    }

    printPersonaDetail(persona, population.axes);
  }
}

function printSummary(population: Population): void {
  console.log(chalk.bold('\n📋 Population Summary\n'));

  console.log(chalk.white('Context:'));
  console.log(`  ${population.context.description}\n`);

  console.log(chalk.white('Diversity Axes:'));
  population.axes.forEach((axis, i) => {
    console.log(`  ${i + 1}. ${axis.name} (${axis.type})`);
  });

  console.log(chalk.white('\nPersonas:'));
  population.personas.forEach((persona) => {
    console.log(`  - ${persona.id}: ${persona.name}`);
  });

  if (population.metrics) {
    console.log(chalk.white('\nDiversity Score:'));
    console.log(`  Overall: ${population.metrics.overall.toFixed(2)}`);
  }

  console.log(`\nGenerated: ${population.generatedAt}`);
}

function printPersonaDetail(
  persona: Population['personas'][0],
  axes: Population['axes']
): void {
  console.log(chalk.bold(`\n👤 ${persona.name}`));
  console.log(chalk.gray(`ID: ${persona.id}\n`));

  console.log(chalk.white('Coordinates:'));
  for (const coord of persona.coordinates) {
    const axis = axes.find((a) => a.id === coord.axisId);
    const axisName = axis?.name ?? coord.axisId;
    console.log(`  - ${axisName}: ${coord.mappedValue} (${coord.rawValue.toFixed(2)})`);
  }

  console.log(chalk.white('\nDescription:'));
  console.log(`  ${persona.description.replace(/\n/g, '\n  ')}`);

  if (Object.keys(persona.traits).length > 0) {
    console.log(chalk.white('\nTraits:'));
    for (const [key, value] of Object.entries(persona.traits)) {
      console.log(`  - ${key}: ${value}`);
    }
  }

  if (persona.behaviorPatterns.length > 0) {
    console.log(chalk.white('\nBehavior Patterns:'));
    persona.behaviorPatterns.forEach((pattern: string) => {
      console.log(`  • ${pattern}`);
    });
  }
}
