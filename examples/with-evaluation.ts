/**
 * Example with diversity evaluation and optimization
 */
import fs from 'fs';
import {
  Pipeline,
  OpenAIProvider,
  SimpleOptimizer,
  computeAllMetrics,
  MarkdownRenderer,
} from '../src/index.js';

async function main() {
  const provider = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4o-mini',
  });

  const pipeline = new Pipeline(provider, {
    language: 'en',
    concurrency: 5,
  });

  console.log('Step 1: Expanding context...');
  const context = await pipeline.expandContext('telemedicine service users');
  console.log(`  Original: telemedicine service users`);
  console.log(`  Expanded: ${context.expanded?.slice(0, 100)}...`);

  console.log('\nStep 2: Extracting diversity axes...');
  const axes = await pipeline.extractAxes(context.expanded!, 6);
  console.log(`  Found ${axes.length} axes:`);
  axes.forEach((axis) => console.log(`    - ${axis.name} (${axis.type})`));

  console.log('\nStep 3: Sampling coordinates...');
  const coordinates = pipeline.sample(20, axes.length);
  console.log(`  Generated ${coordinates.length} coordinate sets`);
  console.log(`  Sample: [${coordinates[0].map((v) => v.toFixed(2)).join(', ')}]`);

  console.log('\nStep 4: Generating full population...');
  const population = await pipeline.generate('telemedicine service users', {
    populationSize: 20,
    numAxes: 6,
    evaluateAfter: true,
  });

  console.log(`  Generated ${population.personas.length} personas`);

  // Show metrics
  if (population.metrics) {
    console.log('\nDiversity Metrics:');
    console.log(`  Coverage:              ${population.metrics.coverage.toFixed(3)}`);
    console.log(`  Convex Hull Volume:    ${population.metrics.convexHullVolume.toFixed(3)}`);
    console.log(`  Mean Pairwise Dist:    ${population.metrics.meanPairwiseDistance.toFixed(3)}`);
    console.log(`  Min Pairwise Dist:     ${population.metrics.minPairwiseDistance.toFixed(3)}`);
    console.log(`  Dispersion:            ${population.metrics.dispersion.toFixed(3)}`);
    console.log(`  KL Divergence:         ${population.metrics.klDivergence.toFixed(3)}`);
    console.log(`  Overall:               ${population.metrics.overall.toFixed(3)}`);
  }

  // Using the optimizer for better diversity
  console.log('\nStep 5: Running optimizer...');
  const optimizer = new SimpleOptimizer(pipeline);
  const optimized = await optimizer.optimize('telemedicine service users', {
    populationSize: 15,
    scoreThreshold: 0.6,
    maxRetries: 2,
  });

  console.log(`  Iterations: ${optimized.iterations}`);
  console.log(`  Best score: ${optimized.bestScore.toFixed(3)}`);

  // Save output
  const renderer = new MarkdownRenderer();
  fs.writeFileSync('output-evaluated.md', renderer.render(population));
  console.log('\nSaved to output-evaluated.md');
}

main().catch(console.error);
