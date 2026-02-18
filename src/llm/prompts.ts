import type { ChatMessage, DiversityAxis, PersonaCoordinate } from '../types.js';

const LANGUAGE_INSTRUCTIONS = {
  ko: '모든 응답은 한국어로 작성하세요.',
  en: 'Write all responses in English.',
};

/**
 * Build prompt for expanding a short context into a detailed description.
 */
export function buildContextExpansionPrompt(
  context: string,
  language: string = 'en'
): ChatMessage[] {
  const langInstruction = LANGUAGE_INSTRUCTIONS[language as keyof typeof LANGUAGE_INSTRUCTIONS]
    ?? LANGUAGE_INSTRUCTIONS.en;

  return [
    {
      role: 'system',
      content: `You are an expert at understanding and expanding user research contexts.
Your task is to take a brief context description and expand it into a comprehensive overview
that covers:
- Who are the potential users/personas in this context
- What environments or situations are they in
- What motivations, needs, and concerns might they have
- What stakeholders or groups are involved

${langInstruction}

Keep the expansion focused and relevant. Aim for 2-3 paragraphs.`,
    },
    {
      role: 'user',
      content: `Please expand the following context into a detailed description:

Context: "${context}"

Provide a comprehensive overview that will help in generating diverse personas for this context.`,
    },
  ];
}

/**
 * Build prompt for extracting diversity axes from an expanded context.
 */
export function buildAxisExtractionPrompt(
  expandedContext: string,
  numAxes: number,
  language: string = 'en'
): ChatMessage[] {
  const langInstruction = LANGUAGE_INSTRUCTIONS[language as keyof typeof LANGUAGE_INSTRUCTIONS]
    ?? LANGUAGE_INSTRUCTIONS.en;

  return [
    {
      role: 'system',
      content: `You are an expert at identifying dimensions of human diversity relevant to a specific context.
Your task is to extract diversity axes that can be used to generate varied personas.

Each axis should be either:
- "continuous": A spectrum with values from 0 to 1, with anchor points describing what different values mean
- "categorical": A set of distinct categories

Return a JSON array of axes. Each axis must have:
- id: A unique kebab-case identifier (e.g., "tech-literacy")
- name: A human-readable name
- description: Why this axis is relevant to diversity in this context
- type: Either "continuous" or "categorical"
- anchors (for continuous): Array of {value, label} objects (at least 2, recommend 3)
- categories (for categorical): Array of category strings

Focus on axes that:
1. Are relevant to behavior and decision-making in this context
2. Are orthogonal (independent) from each other
3. Capture meaningful variation in the population

${langInstruction}

Respond with ONLY a valid JSON array, no additional text.`,
    },
    {
      role: 'user',
      content: `Based on the following context, identify ${numAxes} diversity axes for generating varied personas:

Context:
${expandedContext}

Provide ${numAxes} axes as a JSON array.`,
    },
  ];
}

/**
 * Build prompt for expanding coordinates into a full persona.
 */
export function buildPersonaExpansionPrompt(
  context: string,
  axes: DiversityAxis[],
  coordinates: PersonaCoordinate[],
  language: string = 'en'
): ChatMessage[] {
  const langInstruction = LANGUAGE_INSTRUCTIONS[language as keyof typeof LANGUAGE_INSTRUCTIONS]
    ?? LANGUAGE_INSTRUCTIONS.en;

  const coordinateDescription = coordinates
    .map((coord) => {
      const axis = axes.find((a) => a.id === coord.axisId);
      const axisName = axis?.name ?? coord.axisId;
      return `- ${axisName}: ${coord.mappedValue} (raw: ${coord.rawValue.toFixed(2)})`;
    })
    .join('\n');

  return [
    {
      role: 'system',
      content: `You are an expert persona designer. Your task is to create a rich, realistic persona
based on given diversity coordinates.

IMPORTANT GUIDELINES:
1. Focus on ACTION-ORIENTED descriptions:
   - Describe how this person BEHAVES in relevant situations
   - Describe their decision-making patterns and tendencies
   - Describe their typical reactions and responses

2. AVOID pure background/memory-based descriptions:
   - Do NOT focus heavily on childhood memories or past experiences
   - Do NOT create elaborate backstories that don't connect to behavior
   - 피해야 할 것: 단순히 과거 경험만 나열하는 것

3. Make the persona feel realistic and grounded:
   - Include small, specific behavioral details
   - The persona should feel like a real person you might meet

Return a JSON object with:
- name: A realistic full name appropriate for the context
- description: 2-3 paragraphs describing the persona (action-oriented)
- traits: Key-value pairs of notable characteristics
- behaviorPatterns: Array of 3-5 specific behavioral patterns

${langInstruction}

Respond with ONLY valid JSON, no additional text.`,
    },
    {
      role: 'user',
      content: `Create a persona for the following context and coordinates:

Context: ${context}

Diversity Coordinates:
${coordinateDescription}

Generate a realistic, action-oriented persona as JSON.`,
    },
  ];
}

/**
 * Build prompt for generating questionnaire items.
 */
export function buildQuestionnairePrompt(
  context: string,
  axes: DiversityAxis[],
  numQuestions: number = 10,
  language: string = 'en'
): ChatMessage[] {
  const langInstruction = LANGUAGE_INSTRUCTIONS[language as keyof typeof LANGUAGE_INSTRUCTIONS]
    ?? LANGUAGE_INSTRUCTIONS.en;

  const axisDescriptions = axes
    .map((axis) => `- ${axis.name}: ${axis.description}`)
    .join('\n');

  return [
    {
      role: 'system',
      content: `You are an expert at designing questionnaires and surveys.
Your task is to create questions that can reveal how different personas might vary
along specific diversity dimensions.

Create questions that:
1. Are relevant to the context
2. Would elicit different responses from people at different positions on the axes
3. Are clear and unambiguous
4. Could be answered with a Likert scale or short response

Return a JSON array of question objects with:
- id: A unique identifier
- text: The question text
- relatedAxes: Array of axis IDs this question relates to
- responseType: "likert" | "multiple-choice" | "short-text"

${langInstruction}

Respond with ONLY valid JSON.`,
    },
    {
      role: 'user',
      content: `Create ${numQuestions} 설문 questions for the following context and axes:

Context: ${context}

Diversity Axes:
${axisDescriptions}

Generate ${numQuestions} questions as a JSON array.`,
    },
  ];
}
