# persona-gen

Generate diverse synthetic personas at scale using quasi-random sampling and LLMs.

Based on the paper ["Persona Generators: Generating Diverse Synthetic Personas at Scale"](https://arxiv.org/abs/example) by Paglieri et al.

## Quick Start

```bash
# Install
npm install persona-gen

# Set your API key
export OPENAI_API_KEY=sk-...

# Generate personas
npx persona-gen generate "early adopters of autonomous vehicles" -n 25 -e
```

## Installation

```bash
npm install persona-gen
```

## CLI Usage

### Generate Personas

```bash
# Basic generation
persona-gen generate "mental health chatbot users" -n 10

# With evaluation metrics
persona-gen generate "remote work professionals" -n 25 -e --verbose

# Korean output
persona-gen generate "자율주행 자동차 초기 채택자" -l ko -n 20

# JSON output
persona-gen generate "fitness app users" -f json -o personas.json

# Custom axes from file
persona-gen generate "e-commerce shoppers" --axes-file custom-axes.json

# Dry run (no API calls, shows sampling only)
persona-gen generate "test" --dry-run -n 5 -a 4
```

### Evaluate Existing Population

```bash
persona-gen evaluate ./personas.json
persona-gen evaluate ./personas.json -o ./evaluated.json
```

### Inspect Population

```bash
# Show summary
persona-gen inspect ./personas.json

# Show specific persona
persona-gen inspect ./personas.json --id persona-3
```

### CLI Options

```
generate <context>
  -n, --count <number>     Number of personas (default: 25)
  -a, --axes <number>      Number of diversity axes (default: 6)
  --axes-file <path>       Custom axes JSON file
  -m, --model <string>     LLM model (default: gpt-4o-mini)
  -o, --output <path>      Output file path
  -f, --format <type>      Output format: md | json | both (default: md)
  -l, --language <lang>    Language: en | ko (default: en)
  -e, --evaluate           Run diversity evaluation
  --verbose                Show detailed progress
  --dry-run                Show sampling without API calls
```

## Programmatic API

### Basic Usage

```typescript
import { PersonaGenerator, OpenAIProvider } from 'persona-gen';

const provider = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o-mini',
});

const generator = new PersonaGenerator(provider, {
  language: 'en',
});

const population = await generator.generate('autonomous vehicle early adopters', {
  populationSize: 25,
  numAxes: 6,
  evaluateAfter: true,
});

// Output as Markdown
const markdown = generator.toMarkdown(population);
fs.writeFileSync('personas.md', markdown);

// Output as JSON
const json = generator.toJSON(population);
fs.writeFileSync('personas.json', json);
```

### Custom Axes

```typescript
import { PersonaGenerator, OpenAIProvider, type DiversityAxis } from 'persona-gen';

const customAxes: DiversityAxis[] = [
  {
    id: 'tech-literacy',
    name: 'Technology Literacy',
    description: 'Ability to understand and use technology',
    type: 'continuous',
    anchors: [
      { value: 0, label: 'Tech-averse' },
      { value: 0.5, label: 'Average user' },
      { value: 1, label: 'Early adopter' },
    ],
  },
  {
    id: 'age-group',
    name: 'Age Group',
    description: 'Life stage affecting technology adoption',
    type: 'categorical',
    categories: ['18-25', '26-35', '36-45', '46-55', '55+'],
  },
];

const population = await generator.generate('fitness app users', {
  customAxes,
  populationSize: 20,
});
```

### Individual Pipeline Steps

```typescript
import { Pipeline, OpenAIProvider, HaltonSampler } from 'persona-gen';

const provider = new OpenAIProvider({ apiKey: '...' });
const pipeline = new Pipeline(provider);

// Step 1: Expand context
const context = await pipeline.expandContext('telehealth service users');

// Step 2: Extract diversity axes
const axes = await pipeline.extractAxes(context.expanded!, 6);

// Step 3: Generate quasi-random coordinates
const sampler = new HaltonSampler();
const coordinates = sampler.generate(25, axes.length);

// Step 4: Full generation
const population = await pipeline.generate('...', { evaluateAfter: true });
```

## Custom LLM Provider

Implement the `LLMProvider` interface to use any LLM:

```typescript
import type { LLMProvider, ChatMessage, LLMOptions } from 'persona-gen';

class CustomProvider implements LLMProvider {
  name = 'custom';

  async chat(messages: ChatMessage[], options?: LLMOptions): Promise<string> {
    // Your implementation
  }

  async chatJSON<T>(messages: ChatMessage[], options?: LLMOptions): Promise<T> {
    const response = await this.chat(messages, { ...options, responseFormat: 'json' });
    return JSON.parse(response);
  }

  // Optional: for API embedding mode
  async embed(texts: string[]): Promise<number[][]> {
    // Return embeddings for each text
  }
}
```

## Diversity Metrics

| Metric | Direction | Description |
|--------|-----------|-------------|
| Coverage | ↑ Higher is better | Fraction of space covered by personas |
| Convex Hull Volume | ↑ Higher is better | Volume of the space enclosed by personas |
| Mean Pairwise Distance | ↑ Higher is better | Average distance between all persona pairs |
| Min Pairwise Distance | ↑ Higher is better | Closest pair distance (no duplicates) |
| Dispersion | ↓ Lower is better | Largest empty region radius |
| KL Divergence | ↓ Lower is better | Deviation from uniform distribution |
| Overall | ↑ Higher is better | Weighted composite score |

## Architecture

```
┌─────────────────────────────────────────────────┐
│                PersonaGenerator                  │
├─────────────────────────────────────────────────┤
│  ┌──────────┐   ┌──────────┐   ┌────────────┐  │
│  │ LLM      │   │ Sampler  │   │ Diversity  │  │
│  │ Provider │   │ Engine   │   │ Evaluator  │  │
│  └────┬─────┘   └────┬─────┘   └─────┬──────┘  │
│       │              │               │          │
│  ┌────┴─────┐   ┌────┴─────┐   ┌─────┴──────┐  │
│  │ OpenAI   │   │ Halton   │   │ 6 Metrics  │  │
│  │ Custom   │   │ Sequence │   │            │  │
│  └──────────┘   └──────────┘   └────────────┘  │
└─────────────────────────────────────────────────┘
```

**Pipeline:**
1. **Context Expansion**: LLM expands short context into detailed description
2. **Axis Extraction**: LLM identifies relevant diversity dimensions
3. **Quasi-Random Sampling**: Halton sequence generates uniform coordinates
4. **Coordinate Mapping**: Raw values mapped to semantic labels
5. **Persona Expansion**: LLM generates rich, action-oriented personas
6. **Evaluation**: Compute diversity metrics

## Configuration

### GeneratorConfig

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `populationSize` | number | 25 | Number of personas to generate |
| `numAxes` | number | 6 | Number of diversity axes to extract |
| `customAxes` | DiversityAxis[] | - | Use custom axes instead of extracting |
| `samplerType` | 'halton' \| 'sobol' | 'halton' | Quasi-random sequence type |
| `evaluateAfter` | boolean | false | Compute diversity metrics |
| `language` | string | 'en' | Output language ('en' or 'ko') |

### Environment Variables

```bash
OPENAI_API_KEY=sk-...           # Required for OpenAI
PERSONA_GEN_MODEL=gpt-4o-mini   # Default model override
PERSONA_GEN_LANGUAGE=en         # Default language override
```

## Why Quasi-Random Sampling?

The paper found that **quasi-random (Halton/Sobol) sampling outperforms pure random sampling** for persona diversity:

- Pure `Math.random()` tends to cluster in some regions
- Halton sequences have low-discrepancy properties
- Better coverage of the entire diversity space
- More consistent results across runs

## Paper Reference

> Paglieri, F., et al. "Persona Generators: Generating Diverse Synthetic Personas at Scale." (2026)

Key findings from the paper:
1. **Support coverage > density matching**: Generate rare/extreme combinations, not just common types
2. **Action-oriented descriptions**: Behavior patterns trump background stories
3. **Quasi-random sampling**: Halton/Sobol sequences survive evolutionary selection
4. **6 diversity metrics**: Comprehensive evaluation of population diversity

## Examples

See the `examples/` directory:
- `basic-usage.ts` - Simple generation
- `custom-axes.ts` - Using custom diversity axes
- `with-evaluation.ts` - Including diversity metrics

## License

MIT
