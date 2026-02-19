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
    it('should call llm.embed() and return PCA+normalized points', async () => {
      // Return high-dimensional embeddings like a real API
      const mockEmbeddings = [
        Array.from({ length: 32 }, (_, i) => Math.sin(1 * (i + 1) * 0.1) * 0.05),
        Array.from({ length: 32 }, (_, i) => Math.sin(2 * (i + 1) * 0.1) * 0.05),
        Array.from({ length: 32 }, (_, i) => Math.sin(3 * (i + 1) * 0.1) * 0.05),
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

      // Should be PCA-reduced to default 6 dims (but n=3, so effective=2, rest 0.5)
      expect(points).toHaveLength(3);
      for (const p of points) {
        expect(p).toHaveLength(6);
        for (const v of p) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        }
      }
    });

    it('should respect targetDims parameter', async () => {
      const mockEmbeddings = Array.from({ length: 5 }, (_, i) =>
        Array.from({ length: 32 }, (_, j) => Math.sin((i + 1) * (j + 1) * 0.1) * 0.05)
      );
      const fivePersonas = Array.from({ length: 5 }, (_, i) =>
        makePersona([0.1 * (i + 1)], `Persona ${i}`)
      );
      const mockLLM: LLMProvider = {
        name: 'mock',
        chat: vi.fn(),
        chatJSON: vi.fn(),
        embed: vi.fn().mockResolvedValue(mockEmbeddings),
      };

      const points = await getPersonaPoints(fivePersonas, 'api', mockLLM, 3);

      expect(points).toHaveLength(5);
      for (const p of points) {
        expect(p).toHaveLength(3);
        for (const v of p) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        }
      }
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
