/**
 * Example using custom diversity axes
 */
import fs from 'fs';
import { PersonaGenerator, OpenAIProvider, type DiversityAxis } from '../src/index.js';

async function main() {
  const provider = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4o-mini',
  });

  const generator = new PersonaGenerator(provider, {
    language: 'en',
  });

  // Define custom axes for fitness app users
  const customAxes: DiversityAxis[] = [
    {
      id: 'fitness-level',
      name: 'Fitness Level',
      description: 'Current physical fitness and exercise habits',
      type: 'continuous',
      anchors: [
        { value: 0, label: 'Sedentary' },
        { value: 0.33, label: 'Beginner' },
        { value: 0.66, label: 'Intermediate' },
        { value: 1, label: 'Athlete' },
      ],
    },
    {
      id: 'motivation-type',
      name: 'Motivation Type',
      description: 'Primary driver for fitness activities',
      type: 'categorical',
      categories: ['Health', 'Appearance', 'Performance', 'Social', 'Mental wellness'],
    },
    {
      id: 'tech-comfort',
      name: 'Tech Comfort',
      description: 'Comfort level with fitness technology and apps',
      type: 'continuous',
      anchors: [
        { value: 0, label: 'Prefers analog' },
        { value: 0.5, label: 'Occasional user' },
        { value: 1, label: 'Tech enthusiast' },
      ],
    },
    {
      id: 'time-availability',
      name: 'Time Availability',
      description: 'Available time for exercise',
      type: 'continuous',
      anchors: [
        { value: 0, label: 'Very limited (<2h/week)' },
        { value: 0.5, label: 'Moderate (5-7h/week)' },
        { value: 1, label: 'Flexible (>10h/week)' },
      ],
    },
    {
      id: 'age-group',
      name: 'Age Group',
      description: 'Life stage affecting fitness needs',
      type: 'categorical',
      categories: ['18-24', '25-34', '35-44', '45-54', '55+'],
    },
  ];

  console.log('Generating personas with custom axes...');
  console.log(`Using ${customAxes.length} custom axes:`);
  customAxes.forEach((axis) => console.log(`  - ${axis.name}`));

  const population = await generator.generate('fitness app users', {
    customAxes,
    populationSize: 15,
    evaluateAfter: true,
  });

  console.log(`\nGenerated ${population.personas.length} personas`);

  // Show sample persona
  const sample = population.personas[0];
  console.log(`\nSample Persona: ${sample.name}`);
  console.log('Coordinates:');
  for (const coord of sample.coordinates) {
    console.log(`  - ${coord.axisId}: ${coord.mappedValue} (${coord.rawValue.toFixed(2)})`);
  }

  // Save
  const json = generator.toJSON(population);
  fs.writeFileSync('output-custom-axes.json', json);
  console.log(`\nSaved to output-custom-axes.json`);
}

main().catch(console.error);
