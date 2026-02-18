/**
 * Basic usage example for persona-gen
 */
import fs from 'fs';
import { PersonaGenerator, OpenAIProvider } from '../src/index.js';

async function main() {
  // 1. Create provider
  const provider = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4o-mini',
  });

  // 2. Create generator
  const generator = new PersonaGenerator(provider, {
    language: 'en',
  });

  // 3. Generate personas
  console.log('Generating personas...');
  const population = await generator.generate('early adopters of autonomous vehicles', {
    populationSize: 10,
    numAxes: 5,
    evaluateAfter: true,
  });

  // 4. Output results
  console.log(`\nGenerated ${population.personas.length} personas`);
  console.log(`\nAxes:`);
  for (const axis of population.axes) {
    console.log(`  - ${axis.name} (${axis.type})`);
  }

  console.log(`\nPersonas:`);
  for (const persona of population.personas) {
    console.log(`  - ${persona.name}`);
  }

  if (population.metrics) {
    console.log(`\nDiversity Metrics:`);
    console.log(`  Coverage: ${population.metrics.coverage.toFixed(2)}`);
    console.log(`  Overall: ${population.metrics.overall.toFixed(2)}`);
  }

  // 5. Save to file
  const markdown = generator.toMarkdown(population);
  fs.writeFileSync('output-basic.md', markdown);
  console.log(`\nSaved to output-basic.md`);
}

main().catch(console.error);
