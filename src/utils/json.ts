/**
 * JSON parsing utilities with better error handling.
 */

export class JSONParseError extends Error {
  constructor(
    message: string,
    public readonly context: string,
    public readonly originalContent: string
  ) {
    super(`${message} [${context}]: ${originalContent.slice(0, 100)}${originalContent.length > 100 ? '...' : ''}`);
    this.name = 'JSONParseError';
  }
}

/**
 * Safely parse JSON string with contextual error messages.
 * @param content - The JSON string to parse
 * @param context - Context description for error messages (e.g., "axis extraction response")
 * @returns Parsed JSON value
 * @throws JSONParseError if parsing fails
 */
export function safeJSONParse<T>(content: string, context: string): T {
  try {
    return JSON.parse(content) as T;
  } catch (error) {
    throw new JSONParseError('Failed to parse JSON', context, content);
  }
}

/**
 * Safely parse JSON string and validate it's an array.
 * @param content - The JSON string to parse
 * @param context - Context description for error messages
 * @returns Parsed array
 * @throws JSONParseError if parsing fails or result is not an array
 */
export function safeJSONParseArray<T>(content: string, context: string): T[] {
  const parsed = safeJSONParse<unknown>(content, context);

  if (Array.isArray(parsed)) {
    return parsed as T[];
  }

  // LLM이 { "key": [...] } 형태로 감싸서 응답한 경우 자동 언래핑
  if (parsed !== null && typeof parsed === 'object') {
    const values = Object.values(parsed as Record<string, unknown>);
    if (values.length === 1 && Array.isArray(values[0])) {
      return values[0] as T[];
    }
  }

  throw new JSONParseError('Expected an array', context, content);
}
