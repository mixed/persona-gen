import chalk from 'chalk';
import ora, { type Ora } from 'ora';

export function printHeader(version: string = '0.1.0'): void {
  console.log(chalk.bold.cyan(`\n🚀 Persona Generator v${version}`));
  console.log(chalk.gray('━'.repeat(40)));
}

export function printConfig(
  context: string,
  model: string,
  provider: string,
  populationSize: number
): void {
  console.log(chalk.white(`📝 Context: "${context}"`));
  console.log(chalk.white(`🤖 Model: ${model} (${provider})`));
  console.log(chalk.white(`📊 Population size: ${populationSize}`));
  console.log(chalk.gray('━'.repeat(40)));
}

export function createSpinner(text: string): Ora {
  return ora({
    text,
    color: 'cyan',
  });
}

export function printStep(
  step: number,
  total: number,
  name: string,
  status: 'pending' | 'running' | 'done' | 'error',
  detail?: string
): void {
  const prefix = `[${step}/${total}]`;
  let statusIcon: string;

  switch (status) {
    case 'done':
      statusIcon = chalk.green('✓');
      break;
    case 'error':
      statusIcon = chalk.red('✗');
      break;
    case 'running':
      statusIcon = chalk.yellow('⋯');
      break;
    default:
      statusIcon = chalk.gray('○');
  }

  let line = `${statusIcon} ${prefix} ${name}`;
  if (detail) {
    line += chalk.gray(` ${detail}`);
  }

  console.log(line);
}

export function printMetrics(metrics: {
  coverage: number;
  convexHullVolume: number;
  meanPairwiseDistance: number;
  minPairwiseDistance: number;
  dispersion: number;
  klDivergence: number;
  overall: number;
}): void {
  console.log(chalk.gray('━'.repeat(40)));
  console.log(chalk.bold('📊 Diversity Metrics:'));
  console.log(`   Coverage:            ${metrics.coverage.toFixed(2)}`);
  console.log(`   Convex Hull Volume:  ${metrics.convexHullVolume.toFixed(2)}`);
  console.log(`   Mean Pairwise Dist:  ${metrics.meanPairwiseDistance.toFixed(2)}`);
  console.log(`   Min Pairwise Dist:   ${metrics.minPairwiseDistance.toFixed(2)}`);
  console.log(`   Dispersion:          ${metrics.dispersion.toFixed(2)}`);
  console.log(`   KL Divergence:       ${metrics.klDivergence.toFixed(2)}`);

  const overallColor =
    metrics.overall > 0.6 ? chalk.green : metrics.overall > 0.4 ? chalk.yellow : chalk.red;
  console.log(`   Overall:             ${overallColor(metrics.overall.toFixed(2))} ${metrics.overall > 0.6 ? '✓ Good' : metrics.overall > 0.4 ? '△ Moderate' : '✗ Low'}`);
}

export function printSuccess(outputPath: string, duration: number): void {
  console.log('');
  console.log(chalk.green(`📁 Output: ${outputPath}`));
  console.log(chalk.green(`✅ Done in ${(duration / 1000).toFixed(1)}s`));
}

export function printError(message: string): void {
  console.error(chalk.red(`\n❌ Error: ${message}`));
}
