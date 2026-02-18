import { describe, it, expect } from 'vitest';
import {
  JSONParseError,
  safeJSONParse,
  safeJSONParseArray,
} from '../../../src/utils/json.js';

describe('JSONParseError', () => {
  it('should include context and truncated content in message', () => {
    const error = new JSONParseError(
      'Failed to parse',
      'test context',
      'invalid json content'
    );

    expect(error.message).toContain('Failed to parse');
    expect(error.message).toContain('test context');
    expect(error.message).toContain('invalid json content');
    expect(error.name).toBe('JSONParseError');
  });

  it('should truncate long content in message', () => {
    const longContent = 'x'.repeat(200);
    const error = new JSONParseError('Failed', 'context', longContent);

    expect(error.message.length).toBeLessThan(200);
    expect(error.message).toContain('...');
    expect(error.originalContent).toBe(longContent);
  });

  it('should preserve original content in property', () => {
    const content = '{"broken": true';
    const error = new JSONParseError('Failed', 'context', content);

    expect(error.originalContent).toBe(content);
    expect(error.context).toBe('context');
  });
});

describe('safeJSONParse', () => {
  it('should parse valid JSON', () => {
    const result = safeJSONParse<{ name: string }>('{"name": "test"}', 'test');
    expect(result).toEqual({ name: 'test' });
  });

  it('should parse numbers', () => {
    const result = safeJSONParse<number>('42', 'test');
    expect(result).toBe(42);
  });

  it('should parse arrays', () => {
    const result = safeJSONParse<number[]>('[1, 2, 3]', 'test');
    expect(result).toEqual([1, 2, 3]);
  });

  it('should parse null', () => {
    const result = safeJSONParse<null>('null', 'test');
    expect(result).toBeNull();
  });

  it('should throw JSONParseError on invalid JSON', () => {
    expect(() => safeJSONParse('not json', 'test context')).toThrow(
      JSONParseError
    );
  });

  it('should include context in error message', () => {
    try {
      safeJSONParse('invalid', 'axis extraction');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(JSONParseError);
      expect((error as JSONParseError).message).toContain('axis extraction');
    }
  });

  it('should throw on truncated JSON', () => {
    expect(() => safeJSONParse('{"key": "value', 'test')).toThrow(JSONParseError);
  });
});

describe('safeJSONParseArray', () => {
  it('should parse valid JSON array', () => {
    const result = safeJSONParseArray<number>('[1, 2, 3]', 'test');
    expect(result).toEqual([1, 2, 3]);
  });

  it('should parse array of objects', () => {
    const result = safeJSONParseArray<{ id: number }>(
      '[{"id": 1}, {"id": 2}]',
      'test'
    );
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('should parse empty array', () => {
    const result = safeJSONParseArray<never>('[]', 'test');
    expect(result).toEqual([]);
  });

  it('should unwrap single-key object containing an array', () => {
    const result = safeJSONParseArray<{ id: number }>(
      '{"axes": [{"id": 1}, {"id": 2}]}',
      'test'
    );
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('should throw JSONParseError on non-array JSON', () => {
    expect(() => safeJSONParseArray('{"key": "value", "other": 1}', 'test')).toThrow(
      JSONParseError
    );
  });

  it('should throw on string value', () => {
    expect(() => safeJSONParseArray('"string"', 'test')).toThrow(JSONParseError);
  });

  it('should throw on number value', () => {
    expect(() => safeJSONParseArray('42', 'test')).toThrow(JSONParseError);
  });

  it('should throw on null value', () => {
    expect(() => safeJSONParseArray('null', 'test')).toThrow(JSONParseError);
  });

  it('should include "Expected an array" in error for non-array', () => {
    try {
      safeJSONParseArray('{"a":1,"b":2}', 'test context');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(JSONParseError);
      expect((error as JSONParseError).message).toContain('Expected an array');
    }
  });

  it('should throw on invalid JSON before array check', () => {
    expect(() => safeJSONParseArray('invalid', 'test')).toThrow(JSONParseError);
  });
});
