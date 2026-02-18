#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';
import { generateCommand, type GenerateOptions } from './commands/generate.js';
import { evaluateCommand, type EvaluateOptions } from './commands/evaluate.js';
import { inspectCommand, type InspectOptions } from './commands/inspect.js';

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name('persona-gen')
  .description('Generate diverse synthetic personas at scale')
  .version('0.1.0');

program
  .command('generate')
  .description('Generate a population of diverse personas')
  .argument('<context>', 'Context description for persona generation')
  .option('-n, --count <number>', 'Number of personas to generate', '25')
  .option('-a, --axes <number>', 'Number of diversity axes to extract', '6')
  .option('--axes-file <path>', 'Path to custom axes definition JSON file')
  .option('-m, --model <string>', 'LLM model to use', 'gpt-4o-mini')
  .option('-p, --provider <name>', 'LLM provider', 'openai')
  .option('-o, --output <path>', 'Output file path')
  .option('-f, --format <type>', 'Output format: md, json, or both', 'md')
  .option('-l, --language <lang>', 'Output language: en or ko', 'en')
  .option('-e, --evaluate', 'Run diversity evaluation after generation', false)
  .option('--concurrency <n>', 'LLM parallel call limit', '5')
  .option('--verbose', 'Show detailed progress', false)
  .option('--dry-run', 'Show sampling without LLM calls', false)
  .action(async (context: string, options: Record<string, string | boolean>) => {
    const opts: GenerateOptions = {
      count: parseInt(options.count as string, 10),
      axes: parseInt(options.axes as string, 10),
      axesFile: options.axesFile as string | undefined,
      model: options.model as string,
      provider: options.provider as string,
      output: options.output as string | undefined,
      format: options.format as 'md' | 'json' | 'both',
      language: options.language as string,
      evaluate: options.evaluate as boolean,
      concurrency: parseInt(options.concurrency as string, 10),
      verbose: options.verbose as boolean,
      dryRun: options.dryRun as boolean,
    };
    await generateCommand(context, opts);
  });

program
  .command('evaluate')
  .description('Evaluate diversity metrics for an existing population')
  .argument('<file>', 'Path to population JSON file')
  .option('--embedding-mode <mode>', 'Embedding mode: coordinate or api', 'coordinate')
  .option('-o, --output <path>', 'Save updated file with metrics')
  .action(async (file: string, options: Record<string, string>) => {
    const opts: EvaluateOptions = {
      embeddingMode: options.embeddingMode as 'coordinate' | 'api',
      output: options.output,
    };
    await evaluateCommand(file, opts);
  });

program
  .command('inspect')
  .description('Inspect a population or specific persona')
  .argument('<file>', 'Path to population JSON file')
  .option('--id <persona-id>', 'Show details for specific persona')
  .option('--summary', 'Show summary only', false)
  .action(async (file: string, options: Record<string, string | boolean>) => {
    const opts: InspectOptions = {
      id: options.id as string | undefined,
      summary: options.summary as boolean,
    };
    await inspectCommand(file, opts);
  });

program.parse();
