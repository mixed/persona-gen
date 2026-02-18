import type { DiversityAxis, PersonaCoordinate } from '../types.js';

/**
 * Map a raw value [0, 1] to a semantic label based on axis definition.
 */
export function mapValue(rawValue: number, axis: DiversityAxis): string {
  // Clamp value to [0, 1]
  const value = Math.max(0, Math.min(1, rawValue));

  if (axis.type === 'categorical') {
    return mapCategoricalValue(value, axis);
  } else {
    return mapContinuousValue(value, axis);
  }
}

function mapCategoricalValue(value: number, axis: DiversityAxis): string {
  const categories = axis.categories;

  if (!categories || categories.length === 0) {
    return `Category ${value.toFixed(2)}`;
  }

  if (categories.length === 1) {
    return categories[0];
  }

  // Divide [0, 1) into equal segments for each category
  const index = Math.min(
    Math.floor(value * categories.length),
    categories.length - 1
  );

  return categories[index];
}

function mapContinuousValue(value: number, axis: DiversityAxis): string {
  const anchors = axis.anchors;

  if (!anchors || anchors.length === 0) {
    return `Value ${value.toFixed(2)}`;
  }

  // Sort anchors by value
  const sortedAnchors = [...anchors].sort((a, b) => a.value - b.value);

  // Find exact match
  for (const anchor of sortedAnchors) {
    if (Math.abs(value - anchor.value) < 0.001) {
      return anchor.label;
    }
  }

  // Find the two anchors to interpolate between
  let lowerAnchor = sortedAnchors[0];
  let upperAnchor = sortedAnchors[sortedAnchors.length - 1];

  for (let i = 0; i < sortedAnchors.length - 1; i++) {
    if (value >= sortedAnchors[i].value && value <= sortedAnchors[i + 1].value) {
      lowerAnchor = sortedAnchors[i];
      upperAnchor = sortedAnchors[i + 1];
      break;
    }
  }

  // Calculate interpolation ratio
  const range = upperAnchor.value - lowerAnchor.value;
  const ratio = range > 0 ? (value - lowerAnchor.value) / range : 0.5;

  // Generate interpolated label
  return generateInterpolatedLabel(lowerAnchor.label, upperAnchor.label, ratio);
}

function generateInterpolatedLabel(
  lowerLabel: string,
  upperLabel: string,
  ratio: number
): string {
  // If ratio is close to 0, use lower label
  if (ratio < 0.25) {
    return lowerLabel;
  }

  // If ratio is close to 1, use upper label
  if (ratio > 0.75) {
    return upperLabel;
  }

  // Generate a blended description
  // Extract key descriptors from labels
  const lowerKey = extractKeyDescriptor(lowerLabel);
  const upperKey = extractKeyDescriptor(upperLabel);

  if (ratio < 0.5) {
    // Closer to lower: include lower key
    return `${lowerKey} (낮음)`;
  } else {
    // Closer to upper: include upper key
    return `${upperKey} (높음)`;
  }
}

function extractKeyDescriptor(label: string): string {
  // Remove common prefixes like "매우", "약간", etc.
  const cleanLabel = label
    .replace(/^매우\s*/g, '')
    .replace(/^약간\s*/g, '')
    .replace(/^상당히\s*/g, '')
    .trim();

  // If label becomes empty, generate a default
  if (!cleanLabel) {
    return 'Medium';
  }

  return cleanLabel;
}

/**
 * Mapper class that holds axis definitions and maps raw values to semantic labels.
 */
export class AxisMapper {
  constructor(private axes: DiversityAxis[]) {}

  /**
   * Map an array of raw values to PersonaCoordinate objects.
   * @param rawValues - Array of values in [0, 1], one per axis
   * @returns Array of PersonaCoordinate objects
   */
  map(rawValues: number[]): PersonaCoordinate[] {
    if (rawValues.length !== this.axes.length) {
      throw new Error(
        `Expected ${this.axes.length} values, got ${rawValues.length}`
      );
    }

    return rawValues.map((value, index) => ({
      axisId: this.axes[index].id,
      rawValue: value,
      mappedValue: mapValue(value, this.axes[index]),
    }));
  }
}

/**
 * Map multiple samples' raw coordinates to semantic coordinates.
 */
export function mapCoordinates(
  rawSamples: number[][],
  axes: DiversityAxis[]
): PersonaCoordinate[][] {
  const mapper = new AxisMapper(axes);
  return rawSamples.map((sample) => mapper.map(sample));
}
