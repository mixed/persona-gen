import type { LLMProvider } from '../../src/llm/provider.js';
import type { ChatMessage, LLMOptions, DiversityAxis, Persona } from '../../src/types.js';

export const MOCK_EXPANDED_CONTEXT = `자율주행 자동차의 초기 채택자는 다양한 배경을 가진 사람들로 구성됩니다.
이들은 기술에 대한 신뢰도, 위험 감수 성향, 경제적 여유, 운전 경험, 그리고 기술 숙련도 면에서
크게 다릅니다. 일부는 새로운 기술의 얼리어답터로서 혁신을 추구하고, 다른 이들은 실용적인
필요(장애, 고령 등)로 인해 자율주행에 관심을 가집니다. 도시 거주자와 교외/농촌 거주자 간에도
자율주행 차량의 인프라 접근성과 필요성이 다르게 나타납니다.`;

export const MOCK_EXTRACTED_AXES: DiversityAxis[] = [
  {
    id: 'tech-literacy',
    name: '기술 숙련도',
    description: '새로운 기술을 이해하고 사용하는 능력',
    type: 'continuous',
    anchors: [
      { value: 0, label: '기술 기피자' },
      { value: 0.5, label: '일반 사용자' },
      { value: 1, label: '얼리어답터' },
    ],
  },
  {
    id: 'risk-tolerance',
    name: '위험 감수 성향',
    description: '새로운 기술의 불확실성을 받아들이는 정도',
    type: 'continuous',
    anchors: [
      { value: 0, label: '매우 보수적' },
      { value: 0.5, label: '중립적' },
      { value: 1, label: '모험적' },
    ],
  },
  {
    id: 'age-group',
    name: '나이대',
    description: '생애 주기에 따른 기술 수용 패턴',
    type: 'categorical',
    categories: ['20대', '30대', '40대', '50대', '60대 이상'],
  },
  {
    id: 'driving-frequency',
    name: '운전 빈도',
    description: '일상적인 운전 필요성',
    type: 'continuous',
    anchors: [
      { value: 0, label: '거의 안 함' },
      { value: 0.5, label: '주 2-3회' },
      { value: 1, label: '매일' },
    ],
  },
  {
    id: 'residence-type',
    name: '거주 지역',
    description: '자율주행 인프라 접근성',
    type: 'categorical',
    categories: ['대도시', '중소도시', '교외', '농촌'],
  },
  {
    id: 'economic-status',
    name: '경제적 여유',
    description: '새 기술에 투자할 수 있는 재정적 능력',
    type: 'continuous',
    anchors: [
      { value: 0, label: '제한적' },
      { value: 0.5, label: '중간' },
      { value: 1, label: '여유로움' },
    ],
  },
];

export const MOCK_PERSONA: Persona = {
  id: 'persona-1',
  name: 'Alex Chen',
  coordinates: [
    { axisId: 'tech-literacy', rawValue: 0.82, mappedValue: '얼리어답터' },
    { axisId: 'risk-tolerance', rawValue: 0.65, mappedValue: '적당히 모험적' },
    { axisId: 'age-group', rawValue: 0.3, mappedValue: '30대' },
    { axisId: 'driving-frequency', rawValue: 0.45, mappedValue: '주 2-3회' },
    { axisId: 'residence-type', rawValue: 0.1, mappedValue: '대도시' },
    { axisId: 'economic-status', rawValue: 0.7, mappedValue: '중상' },
  ],
  description: `Alex는 IT 스타트업에서 일하는 32세 소프트웨어 엔지니어입니다.
새로운 기술을 일찍 시도하는 것을 즐기며, 자율주행 차량의 기술적 원리에 대해
깊이 이해하고 있습니다. 출퇴근 시 대중교통을 주로 이용하지만, 주말 여행 시
자동차를 운전합니다.`,
  traits: {
    직업: '소프트웨어 엔지니어',
    학력: '공학 석사',
    관심사: '기술, 자동화, 스마트홈',
  },
  behaviorPatterns: [
    '새 기술 제품이 나오면 리뷰를 꼼꼼히 읽고 초기에 구매하는 경향이 있다',
    '자율주행 기능의 안전성 데이터를 직접 분석하려 한다',
    '기술적 문제가 생기면 스스로 해결책을 찾는다',
  ],
};

export class MockLLMProvider implements LLMProvider {
  name = 'mock';
  callCount = 0;
  lastMessages: ChatMessage[] = [];
  private errorToSimulate: Error | null = null;
  private shouldSimulateJSONParseError = false;

  async chat(messages: ChatMessage[], _options?: LLMOptions): Promise<string> {
    this.callCount++;
    this.lastMessages = messages;

    // Check for simulated errors
    if (this.errorToSimulate) {
      const error = this.errorToSimulate;
      this.errorToSimulate = null; // Reset after throwing
      throw error;
    }

    // Check for JSON parse error simulation
    if (this.shouldSimulateJSONParseError) {
      this.shouldSimulateJSONParseError = false; // Reset after returning
      return 'This is not valid JSON { broken';
    }

    // Check all messages for keywords
    const allContent = messages.map(m => m.content).join(' ').toLowerCase();

    // Order matters: check more specific patterns first
    if (allContent.includes('diversity ax') || allContent.includes('extract') && allContent.includes('ax')) {
      return JSON.stringify(MOCK_EXTRACTED_AXES);
    }

    if (allContent.includes('persona') || allContent.includes('페르소나')) {
      return JSON.stringify(MOCK_PERSONA);
    }

    if (allContent.includes('expand') || allContent.includes('확장')) {
      return MOCK_EXPANDED_CONTEXT;
    }

    return 'Mock response';
  }

  async chatJSON<T>(messages: ChatMessage[], options?: LLMOptions): Promise<T> {
    const response = await this.chat(messages, options);
    return JSON.parse(response) as T;
  }

  async embed(texts: string[]): Promise<number[][]> {
    // Check for simulated errors
    if (this.errorToSimulate) {
      const error = this.errorToSimulate;
      this.errorToSimulate = null; // Reset after throwing
      throw error;
    }

    // Return mock embeddings: 64D with realistic range [-0.05, 0.05]
    return texts.map((text) => {
      const seed = text.length;
      return Array.from({ length: 64 }, (_, i) =>
        Math.sin(seed * (i + 1) * 0.1) * 0.05
      );
    });
  }

  /**
   * Configure the mock to throw an error on the next call.
   * The error is automatically cleared after being thrown.
   */
  simulateError(error: Error): void {
    this.errorToSimulate = error;
  }

  /**
   * Configure the mock to return invalid JSON on the next call.
   * Useful for testing JSON parse error handling.
   */
  simulateJSONParseError(): void {
    this.shouldSimulateJSONParseError = true;
  }

  reset(): void {
    this.callCount = 0;
    this.lastMessages = [];
    this.errorToSimulate = null;
    this.shouldSimulateJSONParseError = false;
  }
}
