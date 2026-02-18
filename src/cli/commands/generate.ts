import fs from 'fs';
import path from 'path';
import { Pipeline } from '../../generator/pipeline.js';
import { OpenAIProvider } from '../../llm/openai.js';
import { MarkdownRenderer } from '../../output/markdown.js';
import { JSONRenderer } from '../../output/json.js';
import type { GeneratorConfig, DiversityAxis } from '../../types.js';
import {
  printHeader,
  printConfig,
  createSpinner,
  printMetrics,
  printSuccess,
  printError,
} from '../utils.js';

export interface GenerateOptions {
  count: number;
  axes: number;
  axesFile?: string;
  model: string;
  provider: string;
  output?: string;
  format: 'md' | 'json' | 'both';
  language: string;
  evaluate: boolean;
  concurrency: number;
  verbose: boolean;
  dryRun: boolean;
}

export async function generateCommand(
  context: string,
  options: GenerateOptions
): Promise<void> {
  const startTime = Date.now();

  if (options.verbose) {
    printHeader();
    printConfig(context, options.model, options.provider, options.count);
  }

  // Check for API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey && !options.dryRun) {
    printError('OPENAI_API_KEY environment variable is required');
    process.exit(1);
  }

  // Load custom axes if provided
  let customAxes: DiversityAxis[] | undefined;
  if (options.axesFile) {
    try {
      const axesContent = fs.readFileSync(options.axesFile, 'utf-8');
      customAxes = JSON.parse(axesContent);
    } catch (error) {
      printError(`Failed to load axes file: ${options.axesFile}`);
      process.exit(1);
    }
  }

  // Create provider and pipeline
  const provider = new OpenAIProvider({
    apiKey: apiKey || 'dry-run-key',
    model: options.model,
  });

  const pipeline = new Pipeline(provider, {
    language: options.language,
    concurrency: options.concurrency,
  });

  // Dry run mode - just show sampling
  if (options.dryRun) {
    console.log('\n📋 Dry run mode - showing sample coordinates only\n');
    const samples = pipeline.sample(options.count, customAxes?.length ?? options.axes);
    console.log('Sample coordinates (first 5):');
    samples.slice(0, 5).forEach((sample, i) => {
      console.log(`  ${i + 1}: [${sample.map((v) => v.toFixed(3)).join(', ')}]`);
    });
    console.log(`\nTotal samples: ${samples.length}`);
    return;
  }

  // Generate personas
  const spinner = createSpinner('Generating personas...');
  spinner.start();

  try {
    const config: Partial<GeneratorConfig> = {
      populationSize: options.count,
      numAxes: options.axes,
      customAxes,
      evaluateAfter: options.evaluate,
      language: options.language,
    };

    const population = await pipeline.generate(context, config);

    spinner.succeed('Generation complete');

    // Print metrics if evaluated
    if (population.metrics) {
      printMetrics(population.metrics);
    }

    // Render output
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const defaultBasename = `personas-${timestamp}`;

    if (options.format === 'md' || options.format === 'both') {
      const mdRenderer = new MarkdownRenderer();
      const mdContent = mdRenderer.render(population);
      const mdPath = options.output || `${defaultBasename}.md`;
      fs.writeFileSync(mdPath, mdContent);
      if (options.format === 'both' || !options.output) {
        console.log(`📄 Markdown: ${mdPath}`);
      }
    }

    if (options.format === 'json' || options.format === 'both') {
      const jsonRenderer = new JSONRenderer();
      const jsonContent = jsonRenderer.render(population);
      const jsonPath =
        options.format === 'both'
          ? options.output?.replace('.md', '.json') || `${defaultBasename}.json`
          : options.output || `${defaultBasename}.json`;
      fs.writeFileSync(jsonPath, jsonContent);
      console.log(`📄 JSON: ${jsonPath}`);
    }

    const duration = Date.now() - startTime;
    const outputPath = options.output || `${defaultBasename}.${options.format === 'json' ? 'json' : 'md'}`;
    printSuccess(outputPath, duration);
  } catch (error) {
    spinner.fail('Generation failed');
    printError(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
