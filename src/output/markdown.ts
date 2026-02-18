import type { Population, Persona, DiversityAxis, DiversityMetrics } from '../types.js';

export class MarkdownRenderer {
  render(population: Population): string {
    const sections: string[] = [];

    sections.push(this.renderHeader(population));
    sections.push(this.renderContext(population));
    sections.push(this.renderAxes(population.axes));
    sections.push(this.renderPersonas(population.personas, population.axes));

    if (population.metrics) {
      sections.push(this.renderMetrics(population.metrics));
    }

    if (population.personas.length > 1) {
      sections.push(this.renderDistribution(population.personas, population.axes));
    }

    return sections.join('\n\n');
  }

  private renderHeader(population: Population): string {
    const date = population.generatedAt.split('T')[0];
    return `# Persona Population Report

*Generated: ${date}*
*Population Size: ${population.personas.length}*
*Diversity Axes: ${population.axes.length}*`;
  }

  private renderContext(population: Population): string {
    let md = `## Context

**Original:** ${population.context.description}`;

    if (population.context.expanded) {
      md += `

**Expanded:**

${population.context.expanded}`;
    }

    return md;
  }

  private renderAxes(axes: DiversityAxis[]): string {
    let md = `## Diversity Axes

| # | Axis Name | Type | Description |
|---|-----------|------|-------------|`;

    axes.forEach((axis, index) => {
      md += `\n| ${index + 1} | ${axis.name} | ${axis.type} | ${axis.description} |`;
    });

    return md;
  }

  private renderPersonas(personas: Persona[], axes: DiversityAxis[]): string {
    let md = `## Generated Personas (N=${personas.length})`;

    personas.forEach((persona, index) => {
      md += `\n\n### Persona ${index + 1}: ${persona.name}

**Coordinates:**`;

      for (const coord of persona.coordinates) {
        const axis = axes.find((a) => a.id === coord.axisId);
        const axisName = axis?.name ?? coord.axisId;
        md += `\n- ${axisName}: ${coord.mappedValue} (${coord.rawValue.toFixed(2)})`;
      }

      md += `

**Description:**

${persona.description}`;

      if (Object.keys(persona.traits).length > 0) {
        md += `

**Traits:**`;
        for (const [key, value] of Object.entries(persona.traits)) {
          md += `\n- ${key}: ${value}`;
        }
      }

      if (persona.behaviorPatterns.length > 0) {
        md += `

**Behavior Patterns:**`;
        for (const pattern of persona.behaviorPatterns) {
          md += `\n- ${pattern}`;
        }
      }

      md += '\n\n---';
    });

    return md;
  }

  private renderMetrics(metrics: DiversityMetrics): string {
    const formatMetric = (value: number) => value.toFixed(2);

    return `## Diversity Evaluation

| Metric | Value | Interpretation |
|--------|-------|----------------|
| Coverage | ${formatMetric(metrics.coverage)} | ${this.interpretCoverage(metrics.coverage)} |
| Convex Hull Volume | ${formatMetric(metrics.convexHullVolume)} | ${this.interpretHullVolume(metrics.convexHullVolume)} |
| Mean Pairwise Distance | ${formatMetric(metrics.meanPairwiseDistance)} | ${this.interpretMeanDistance(metrics.meanPairwiseDistance)} |
| Min Pairwise Distance | ${formatMetric(metrics.minPairwiseDistance)} | ${this.interpretMinDistance(metrics.minPairwiseDistance)} |
| Dispersion | ${formatMetric(metrics.dispersion)} | ${this.interpretDispersion(metrics.dispersion)} |
| KL Divergence | ${formatMetric(metrics.klDivergence)} | ${this.interpretKL(metrics.klDivergence)} |
| **Overall** | **${formatMetric(metrics.overall)}** | ${this.interpretOverall(metrics.overall)} |`;
  }

  private renderDistribution(personas: Persona[], axes: DiversityAxis[]): string {
    let md = `## Coordinate Distribution`;

    for (const axis of axes) {
      const values = personas
        .map((p) => p.coordinates.find((c) => c.axisId === axis.id)?.rawValue)
        .filter((v): v is number => v !== undefined);

      if (values.length === 0) continue;

      const histogram = this.computeHistogram(values, 5);
      md += `\n\n### ${axis.name}\n\n\`\`\``;

      histogram.forEach((count, i) => {
        const rangeStart = (i * 0.2).toFixed(1);
        const rangeEnd = ((i + 1) * 0.2).toFixed(1);
        const bar = '█'.repeat(count);
        md += `\n[${rangeStart}-${rangeEnd}] ${bar} (${count})`;
      });

      md += '\n```';
    }

    return md;
  }

  private computeHistogram(values: number[], bins: number): number[] {
    const histogram = Array(bins).fill(0);
    for (const value of values) {
      const binIndex = Math.min(Math.floor(value * bins), bins - 1);
      histogram[binIndex]++;
    }
    return histogram;
  }

  // Interpretation helpers
  private interpretCoverage(value: number): string {
    if (value > 0.8) return 'Excellent coverage';
    if (value > 0.6) return 'Good coverage';
    if (value > 0.4) return 'Moderate coverage';
    return 'Low coverage';
  }

  private interpretHullVolume(value: number): string {
    if (value > 0.6) return 'Wide spread';
    if (value > 0.3) return 'Moderate spread';
    return 'Narrow spread';
  }

  private interpretMeanDistance(value: number): string {
    if (value > 0.5) return 'Well separated';
    if (value > 0.3) return 'Moderately separated';
    return 'Closely clustered';
  }

  private interpretMinDistance(value: number): string {
    if (value > 0.1) return 'No duplicates';
    if (value > 0.05) return 'Some similar pairs';
    return 'Very similar personas exist';
  }

  private interpretDispersion(value: number): string {
    if (value < 0.2) return 'Even distribution';
    if (value < 0.4) return 'Some gaps';
    return 'Large empty regions';
  }

  private interpretKL(value: number): string {
    if (value < 0.1) return 'Nearly uniform';
    if (value < 0.5) return 'Slight bias';
    return 'Significant bias';
  }

  private interpretOverall(value: number): string {
    if (value > 0.8) return '✓ Excellent diversity';
    if (value > 0.6) return '✓ Good diversity';
    if (value > 0.4) return '△ Moderate diversity';
    return '✗ Low diversity';
  }
}
