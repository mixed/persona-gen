import { describe, it, expect, vi } from 'vitest';
import { getPersonaPoints } from '../../../src/evaluation/embedding.js';
import type { LLMProvider } from '../../../src/llm/provider.js';
import type { Persona } from '../../../src/types.js';

const makePersona = (rawValues: number[], description = 'A test persona'): Persona => ({
  id: `p-${Math.random().toString(36).slice(2, 6)}`,
  name: 'Test',
  coordinates: rawValues.map((v, i) => ({
    axisId: `axis-${i}`,
    rawValue: v,
    mappedValue: `mapped-${v}`,
  })),
  description,
  traits: {},
  behaviorPatterns: [],
});

describe('getPersonaPoints', () => {
  const personas = [
    makePersona([0.1, 0.2, 0.3], 'Persona A description'),
    makePersona([0.4, 0.5, 0.6], 'Persona B description'),
    makePersona([0.7, 0.8, 0.9], 'Persona C description'),
  ];

  describe('coordinate mode', () => {
    it('should extract rawValue from coordinates', async () => {
      const points = await getPersonaPoints(personas, 'coordinate');
      expect(points).toEqual([
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
        [0.7, 0.8, 0.9],
      ]);
    });

    it('should default to coordinate mode', async () => {
      const points = await getPersonaPoints(personas);
      expect(points).toEqual([
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
        [0.7, 0.8, 0.9],
      ]);
    });
  });

  describe('api mode', () => {
    it('should call llm.embed() with persona descriptions', async () => {
      const mockEmbeddings = [
        [0.01, 0.02],
        [0.03, 0.04],
        [0.05, 0.06],
      ];
      const mockLLM: LLMProvider = {
        name: 'mock',
        chat: vi.fn(),
        chatJSON: vi.fn(),
        embed: vi.fn().mockResolvedValue(mockEmbeddings),
      };

      const points = await getPersonaPoints(personas, 'api', mockLLM);

      expect(mockLLM.embed).toHaveBeenCalledWith([
        'Persona A description',
        'Persona B description',
        'Persona C description',
      ]);
      expect(points).toEqual(mockEmbeddings);
    });

    it('should throw error when llm is not provided', async () => {
      await expect(getPersonaPoints(personas, 'api')).rejects.toThrow(
        'API embedding mode requires an LLM provider with embed support'
      );
    });

    it('should throw error when llm does not support embed', async () => {
      const mockLLM: LLMProvider = {
        name: 'mock',
        chat: vi.fn(),
        chatJSON: vi.fn(),
        // no embed method
      };

      await expect(getPersonaPoints(personas, 'api', mockLLM)).rejects.toThrow(
        'API embedding mode requires an LLM provider with embed support'
      );
    });
  });

  describe('unknown mode', () => {
    it('should throw error for unknown embedding mode', async () => {
      await expect(
        getPersonaPoints(personas, 'unknown' as any)
      ).rejects.toThrow('Unknown embedding mode: unknown');
    });
  });
});
