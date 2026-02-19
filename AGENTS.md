# AGENTS.md — Codebase Reference for AI Agents

> 이 문서는 Claude Code 등 AI 에이전트가 코드베이스를 이해하고 작업하는 데 필요한 모든 정보를 담고 있다.
> 계획/진행 관리는 `PLANNING.md`를 참조.

---

## 1. 프로젝트 개요

논문 "Persona Generators: Generating Diverse Synthetic Personas at Scale" (Paglieri et al., 2026) 기반의 TypeScript 라이브러리(API + CLI).

**핵심 개념:** Persona Generator는 임의의 맥락(context)을 입력받아 다양한 합성 페르소나 인구집단을 출력하는 함수다. 단순 LLM 요청 시 발생하는 mode collapse(스테레오타입 수렴)를 **quasi-random 샘플링**으로 해결한다.

**2-Stage 파이프라인:**
1. **Stage 1** — 컨텍스트 확장 → 다양성 축(axes) 추출 → Halton 시퀀스로 N차원 좌표 샘플링
2. **Stage 2** — 각 좌표 조합을 LLM으로 풍부한 페르소나로 확장 (행동 지향적 서술)

**핵심 설계 원칙:**
- **Support coverage** (가능한 모든 유형 포괄) > density matching (가장 흔한 유형 복제)
- **Quasi-random**(Halton) 샘플링이 순수 랜덤/격자 방식보다 우수 (논문 AlphaEvolve 결과)
- **행동 지향적** 페르소나 서술이 기억/배경 기반 대비 다양성 점수 우수

---

## 2. 아키텍처

```
┌─────────────────────────────────────────────────────┐
│                  PersonaGenerator                    │
│                  (메인 오케스트레이터)                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────┐   ┌──────────┐   ┌────────────────┐  │
│  │ LLM      │   │ Sampler  │   │ Diversity      │  │
│  │ Provider │   │ Engine   │   │ Evaluator      │  │
│  │ (교체가능) │   │ (준랜덤)  │   │ (6 metrics)    │  │
│  └────┬─────┘   └────┬─────┘   └───────┬────────┘  │
│       │              │                  │           │
│  ┌────┴─────┐   ┌────┴─────┐   ┌───────┴────────┐  │
│  │ OpenAI   │   │ Halton   │   │ Coverage       │  │
│  │ (구현됨)  │   │ (구현됨)  │   │ ConvexHull     │  │
│  └──────────┘   └──────────┘   │ Pairwise Dist  │  │
│                                │ Dispersion     │  │
│                                │ KL Divergence  │  │
│                                └────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ Output Renderer (Markdown / JSON)             │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**파이프라인 흐름:**

```
사용자 입력 (짧은 컨텍스트)
       │
       ▼
[context-expander] ──LLM──▶ 확장된 컨텍스트
       │
       ▼
[axis-extractor] ──LLM+Schema──▶ DiversityAxis[] (5~10개)
       │
       ▼
[sampler] ──Halton──▶ number[][] (N명 × M축, 값 [0,1])
       │
       ▼
[mapper] ──규칙기반──▶ PersonaCoordinate[][] (의미론적 레이블)
       │
       ▼
[persona-expander] ──LLM+Schema──▶ Persona[] (N명)
       │
       ▼
[evaluator] ──수학──▶ DiversityMetrics (선택적)
       │
       ▼
[renderer] ──────▶ Markdown / JSON 출력
```

---

## 3. 디렉토리 구조

```
persona-gen-claude/
├── src/
│   ├── index.ts                    # 라이브러리 진입점 + PersonaGenerator 클래스
│   ├── types.ts                    # 전체 타입 정의
│   │
│   ├── llm/                        # LLM Provider 추상화
│   │   ├── provider.ts             # LLMProvider 인터페이스
│   │   ├── openai.ts               # OpenAI 구현체 (Structured Outputs 지원)
│   │   ├── prompts.ts              # 4개 프롬프트 빌더 함수
│   │   └── schemas.ts              # 4종 ResponseSchema (Structured Outputs용)
│   │
│   ├── sampler/                    # Stage 1: 준랜덤 샘플링
│   │   ├── sampler.ts              # Sampler 인터페이스
│   │   ├── halton.ts               # Halton Sequence 구현
│   │   └── mapper.ts               # [0,1] → 의미론적 값 매핑
│   │
│   ├── generator/                  # 핵심 파이프라인
│   │   ├── context-expander.ts     # 컨텍스트 확장 (LLM 1회)
│   │   ├── axis-extractor.ts       # 다양성 축 추출 (LLM + axisExtractionSchema)
│   │   ├── persona-expander.ts     # 좌표 → 페르소나 확장 (LLM + personaExpansionSchema)
│   │   └── pipeline.ts             # 전체 파이프라인 오케스트레이션
│   │
│   ├── evaluation/                 # 다양성 평가
│   │   ├── metrics.ts              # 6가지 메트릭 + computeAllMetrics()
│   │   ├── embedding.ts            # 좌표 기반 / API 임베딩 포인트 추출
│   │   ├── pca.ts                  # PCA 차원축소 (API 임베딩용)
│   │   └── questionnaire.ts        # 설문 생성 + 페르소나 응답 시뮬레이션
│   │
│   ├── evolution/                  # 간소화 AlphaEvolve
│   │   ├── optimizer.ts            # SimpleOptimizer (재시도 루프)
│   │   └── mutator.ts              # 프롬프트/설정 변이 전략
│   │
│   ├── cli/                        # CLI 진입점 (commander 기반)
│   │   ├── index.ts                # CLI 메인
│   │   ├── commands/
│   │   │   ├── generate.ts         # `persona-gen generate`
│   │   │   ├── evaluate.ts         # `persona-gen evaluate`
│   │   │   └── inspect.ts          # `persona-gen inspect`
│   │   ├── population-loader.ts    # JSON 파일 → Population 로드
│   │   └── utils.ts                # 스피너, 색상 등 CLI 유틸
│   │
│   ├── output/                     # 출력 렌더링
│   │   ├── markdown.ts             # Markdown 렌더러
│   │   └── json.ts                 # JSON 렌더러
│   │
│   └── utils/                      # 공용 유틸리티
│       ├── index.ts                # 유틸 re-export
│       └── json.ts                 # safeJSONParse, safeJSONParseArray
│
├── tests/
│   ├── unit/
│   │   ├── types.test.ts
│   │   ├── sampler/
│   │   │   ├── halton.test.ts
│   │   │   └── mapper.test.ts
│   │   ├── llm/
│   │   │   ├── openai.test.ts
│   │   │   ├── prompts.test.ts
│   │   │   └── schemas.test.ts
│   │   ├── generator/
│   │   │   ├── context-expander.test.ts
│   │   │   ├── axis-extractor.test.ts
│   │   │   └── persona-expander.test.ts
│   │   ├── evaluation/
│   │   │   ├── metrics.test.ts
│   │   │   ├── embedding.test.ts
│   │   │   ├── pca.test.ts
│   │   │   └── questionnaire.test.ts
│   │   ├── evolution/
│   │   │   └── optimizer.test.ts
│   │   ├── output/
│   │   │   └── markdown.test.ts
│   │   ├── cli/
│   │   │   └── population-loader.test.ts
│   │   └── utils/
│   │       └── json.test.ts
│   ├── integration/
│   │   ├── pipeline.test.ts
│   │   └── cli.test.ts
│   └── fixtures/
│       ├── mock-llm-responses.ts
│       ├── sample-context.json
│       ├── sample-axes.json
│       └── sample-population.json
│
├── package.json                    # persona-gen, bin 등록, vitest
├── tsconfig.json
├── vitest.config.ts
├── AGENTS.md                       # 이 파일
└── PLANNING.md                     # 계획/진행 관리
```

---

## 4. 핵심 타입 (`src/types.ts`)

```typescript
// LLM Provider 추상화
interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }
interface ResponseSchema { name: string; description?: string; schema: Record<string, unknown>; strict?: boolean }
interface LLMOptions { temperature?: number; maxTokens?: number; responseFormat?: 'text' | 'json'; responseSchema?: ResponseSchema }

// LLMProvider 인터페이스 (src/llm/provider.ts)
interface LLMProvider {
  name: string;
  chat(messages: ChatMessage[], options?: LLMOptions): Promise<string>;
  chatJSON<T>(messages: ChatMessage[], options?: LLMOptions): Promise<T>;
  embed?(texts: string[]): Promise<number[][]>;
}

// 핵심 도메인
interface Context { description: string; expanded?: string; domain?: string }
interface AxisAnchor { value: number; label: string }
interface DiversityAxis { id: string; name: string; description: string; type: 'continuous' | 'categorical'; anchors?: AxisAnchor[]; categories?: string[] }
interface PersonaCoordinate { axisId: string; rawValue: number; mappedValue: string }
interface Persona { id: string; name: string; coordinates: PersonaCoordinate[]; description: string; traits: Record<string, string>; behaviorPatterns: string[] }
interface Population { context: Context; axes: DiversityAxis[]; personas: Persona[]; metrics?: DiversityMetrics; generatedAt: string }

// 다양성 메트릭
interface DiversityMetrics { coverage: number; convexHullVolume: number; meanPairwiseDistance: number; minPairwiseDistance: number; dispersion: number; klDivergence: number; overall: number }

// 설정
interface GeneratorConfig { populationSize: number; numAxes?: number; customAxes?: DiversityAxis[]; samplerType?: 'halton'; evaluateAfter?: boolean; language?: string }

// 평가용
interface EvaluablePersona { coordinates: Pick<PersonaCoordinate, 'rawValue'>[] }
interface OptimizerResult { population: Population; iterations: number; bestScore: number }
```

---

## 5. 모듈별 설명

### 5.1 LLM Provider (`src/llm/`)

| 파일 | 역할 |
|------|------|
| `provider.ts` | `LLMProvider` 인터페이스 정의. `chat()`, `chatJSON<T>()`, `embed?()` |
| `openai.ts` | `OpenAIProvider` 구현. Structured Outputs(`responseSchema`) 지원. `buildResponseFormat()` 메서드로 `json_schema` / `json_object` / `undefined` 분기 |
| `prompts.ts` | 4개 프롬프트 빌더 함수 (섹션 7 참조) |
| `schemas.ts` | 4종 ResponseSchema 정의 (섹션 6 참조) |

### 5.2 Sampler (`src/sampler/`)

| 파일 | 역할 |
|------|------|
| `sampler.ts` | `Sampler` 인터페이스: `generate(numSamples, numDimensions): number[][]` |
| `halton.ts` | `HaltonSampler` 구현. 소수 base(2,3,5,7,11,...) 기반 저불일치 수열 |
| `mapper.ts` | `mapValue()`: [0,1] → 의미론적 레이블. continuous는 anchor 보간, categorical은 균등 분할. `mapCoordinates()`: 전체 좌표 매핑 |

### 5.3 Generator (`src/generator/`)

| 파일 | 역할 |
|------|------|
| `context-expander.ts` | `ContextExpander`: 짧은 컨텍스트 → 2~3 문단 확장 (LLM 1회, text 모드) |
| `axis-extractor.ts` | `AxisExtractor`: 확장된 컨텍스트 → `DiversityAxis[]` (LLM + `axisExtractionSchema`). `safeJSONParseArray` 언래핑 사용. `validateAxis()` 정적 메서드 |
| `persona-expander.ts` | `PersonaExpander`: 좌표 → `Persona` (LLM + `personaExpansionSchema`). `expandAll()`로 병렬 처리 (concurrency 제한) |
| `pipeline.ts` | `Pipeline`: 전체 6단계 오케스트레이션. `PersonaGenerator` 클래스(`src/index.ts`)가 이를 래핑 |

### 5.4 Evaluation (`src/evaluation/`)

| 파일 | 역할 |
|------|------|
| `metrics.ts` | 6가지 다양성 메트릭 함수 + `computeAllMetrics()` + `adaptiveEpsilon()` (섹션 9 참조) |
| `embedding.ts` | `getPersonaPoints()`: 좌표 기반(기본) / API 임베딩(고급) 모드 |
| `pca.ts` | `PCA` 클래스: API 임베딩 고차원 벡터를 축 수 차원으로 PCA 차원축소 + min-max 정규화 → [0,1]^d |
| `questionnaire.ts` | `QuestionnaireGenerator`: 설문 생성 (LLM + `questionnaireSchema`). `PersonaResponder`: 페르소나별 응답 시뮬레이션 (LLM + `personaResponseSchema`). `analyzeResponseDiversity()`: 응답 다양성 분석 |

### 5.5 Evolution (`src/evolution/`)

| 파일 | 역할 |
|------|------|
| `optimizer.ts` | `SimpleOptimizer`: overall 점수 threshold 미만 또는 개별 메트릭(`convexHullVolume >= 0.5`, 정규화 `meanPairwiseDistance >= 0.5`) 미충족 시 최대 5회 재시도. `Optimizer` 인터페이스로 풀 구현 교체 가능 |
| `mutator.ts` | `MutationStrategy` 인터페이스 + 4개 Mutator: `AxesCountMutator`, `PopulationSizeMutator`, `AxisDefinitionMutator`, `CompositeMutator` |

### 5.6 CLI (`src/cli/`)

| 파일 | 역할 |
|------|------|
| `index.ts` | commander 기반 CLI 메인. `generate`, `evaluate`, `inspect` 서브커맨드 |
| `commands/generate.ts` | 페르소나 생성 명령 구현 |
| `commands/evaluate.ts` | 기존 결과 다양성 평가 |
| `commands/inspect.ts` | 페르소나 상세 조회 |
| `population-loader.ts` | JSON 파일 → `Population` 로드 유틸 |
| `utils.ts` | 스피너(ora), 색상(chalk) 등 CLI 헬퍼 |

### 5.7 Output (`src/output/`)

| 파일 | 역할 |
|------|------|
| `markdown.ts` | `MarkdownRenderer`: Population → Markdown 문자열 (컨텍스트, 축 테이블, 페르소나, 메트릭, 히스토그램) |
| `json.ts` | `JSONRenderer`: Population → JSON 문자열 |

### 5.8 Utils (`src/utils/`)

| 파일 | 역할 |
|------|------|
| `json.ts` | `safeJSONParse<T>()`: 파싱 실패 시 `JSONParseError` throw. `safeJSONParseArray<T>()`: 배열 파싱 + **자동 언래핑** (LLM이 `{ "key": [...] }` 형태로 감쌀 때 첫 번째 배열 값 추출) |

---

## 6. LLM Structured Outputs

OpenAI Structured Outputs를 활용하여 LLM 응답의 JSON 형식을 보장한다.

### 6.1 4종 스키마 (`src/llm/schemas.ts`)

| 스키마 | 용도 | strict | 이유 |
|--------|------|--------|------|
| `axisExtractionSchema` | 다양성 축 추출 | `true` | 모든 필드가 정적 구조 |
| `personaExpansionSchema` | 페르소나 확장 | `false` | `traits`가 동적 key-value (`additionalProperties`) |
| `questionnaireSchema` | 설문 문항 생성 | `true` | 모든 필드가 정적 구조 |
| `personaResponseSchema` | 페르소나 설문 응답 | `true` | 모든 필드가 정적 구조 |

### 6.2 `buildResponseFormat()` 동작 (`src/llm/openai.ts`)

```typescript
private buildResponseFormat(options?: LLMOptions) {
  if (options?.responseSchema) {
    // → { type: 'json_schema', json_schema: { name, description, schema, strict } }
    return { type: 'json_schema', json_schema: { ... } };
  }
  if (options?.responseFormat === 'json') {
    // → { type: 'json_object' } (스키마 없는 JSON 모드)
    return { type: 'json_object' };
  }
  return undefined; // → text 모드
}
```

**우선순위:** `responseSchema` > `responseFormat: 'json'` > text 모드

### 6.3 strict vs non-strict 구분

- **strict: true** — OpenAI가 스키마에 100% 맞는 JSON만 생성. `additionalProperties: false` 필수, nullable은 `anyOf: [{type}, {type: 'null'}]`로 표현
- **strict: false** — `personaExpansionSchema`에만 사용. `traits`가 `additionalProperties: { type: 'string' }`이라 strict 불가

### 6.4 `safeJSONParseArray` 언래핑 로직 (`src/utils/json.ts`)

LLM이 배열 대신 `{ "axes": [...] }` 형태로 감싸서 응답할 때 자동 언래핑:

```typescript
// 1. 배열이면 그대로 반환
// 2. 객체이고 값이 하나뿐이며 그것이 배열이면 → 언래핑
// 3. 그 외 → JSONParseError throw
```

---

## 7. 프롬프트 시스템 (`src/llm/prompts.ts`)

4개 프롬프트 빌더 함수. 모두 `ChatMessage[]`를 반환하며, `language` 매개변수로 한/영 전환.

| 함수 | 입력 | LLM 응답 형식 | 사용되는 스키마 |
|------|------|--------------|----------------|
| `buildContextExpansionPrompt(context, language)` | 짧은 컨텍스트 | text (2~3 문단) | 없음 |
| `buildAxisExtractionPrompt(expandedContext, numAxes, language)` | 확장된 컨텍스트 | JSON `{ axes: [...] }` | `axisExtractionSchema` |
| `buildPersonaExpansionPrompt(context, axes, coordinates, language)` | 컨텍스트 + 축 + 좌표 | JSON `{ name, description, traits, behaviorPatterns }` | `personaExpansionSchema` |
| `buildQuestionnairePrompt(context, axes, numQuestions, language)` | 컨텍스트 + 축 | JSON `{ questions: [...] }` | `questionnaireSchema` |

---

## 8. CLI 명령어

패키지: `persona-gen` (bin 등록)

```bash
# 페르소나 생성
persona-gen generate <context> \
  -n, --count <number>       # 생성 수 (기본 25)
  -a, --axes <number>        # 축 수 (기본 6)
  --axes-file <path>         # 커스텀 축 JSON
  -m, --model <string>       # LLM 모델 (기본 gpt-4o-mini)
  -o, --output <path>        # 출력 파일
  -f, --format <md|json>     # 출력 형식 (기본 md)
  -l, --language <en|ko>     # 출력 언어 (기본 en)
  -e, --evaluate             # 다양성 평가 포함
  --sampler <halton>         # 샘플러 (기본 halton)
  --concurrency <n>          # LLM 병렬 호출 수 (기본 5)
  --verbose                  # 상세 출력

# 다양성 평가
persona-gen evaluate <file>
  --embedding-mode <coordinate|api>

# 페르소나 조회
persona-gen inspect <file>
  --id <persona-id>
  --summary
```

**환경 변수:** `OPENAI_API_KEY` (필수), `PERSONA_GEN_MODEL`, `PERSONA_GEN_LANGUAGE`

---

## 9. 다양성 메트릭

| 메트릭 | 최적 방향 | 의미 |
|--------|----------|------|
| Coverage (Monte Carlo) | ↑ 높을수록 좋음 | 공간에 랜덤 포인트를 뿌렸을 때 가까운 페르소나가 있는 비율. **차원 적응형 epsilon** 사용 |
| Convex Hull Volume (MC + Away-Step Frank-Wolfe) | ↑ 높을수록 좋음 | Monte Carlo 샘플(기본 5000개)을 뿌리고 Away-Step Frank-Wolfe 알고리즘으로 볼록 껍질 내부 판정하여 부피 비율 추정 |
| Mean Pairwise Distance | ↑ 높을수록 좋음 | 모든 페르소나 쌍 간 평균 거리 |
| Min Pairwise Distance | ↑ 높을수록 좋음 | 가장 가까운 두 페르소나 간 거리 (중복 방지) |
| Dispersion | ↓ 낮을수록 좋음 | 가장 큰 빈 영역의 반경 |
| KL Divergence | ↓ 낮을수록 좋음 | 균등분포와의 차이 (편향 정도) |

`computeAllMetrics(points)` → 6가지 + `overall` 가중 종합 점수.

**적응형 epsilon (`adaptiveEpsilon`):**
Coverage의 epsilon이 고정(0.2)이면 고차원(6D+)에서 epsilon-ball 부피가 0에 수렴한다. `adaptiveEpsilon(d)`는 2D에서 epsilon=0.2일 때의 부피 비율(~12.6%)을 모든 차원에서 유지하도록 자동 조절한다.
- 공식: `epsilon_d = (π × ref² × Γ(d/2+1) / π^(d/2))^(1/d)`
- 2D→0.200, 3D→0.311, 6D→0.538, 10D→0.740
- `computeCoverage()`에 epsilon을 생략하면 자동 적용. 명시적 epsilon 전달 시 기존 동작 유지

**overall 가중치:** coverage(0.20), convexHullVolume(0.20), meanPairwiseDistance(0.15), minPairwiseDistance(0.15), dispersion(0.15), klDivergence(0.15) = 1.0

**임베딩 모드:**
- **좌표 기반** (기본): 페르소나의 quasi-random 좌표를 직접 사용. 비용 0, 결정론적
- **API 임베딩** (고급): description을 `text-embedding-3-small`로 임베딩 → PCA로 축 수 차원까지 차원축소 → min-max 정규화하여 [0,1]^d 공간에 매핑. 텍스트 수준 다양성 측정

---

## 10. 설계 결정

| 항목 | 결정 | 근거 |
|------|------|------|
| LLM 추상화 | Strategy 패턴, `LLMProvider` 인터페이스 | 한 줄 교체로 Provider 전환 |
| Quasi-random | Halton 시퀀스 | 6~10차원에서 Sobol과 동등, 구현·디버깅 용이 |
| Structured Outputs | `ResponseSchema` 타입 + 4종 스키마 | JSON 형식 보장, strict/non-strict 혼용 |
| 임베딩 | 좌표 기반 (기본) + API (옵션) | 비용 vs 정확도 트레이드오프 |
| AlphaEvolve | 간소화 (재시도 루프) | 풀 구현 시 비용 비실용적, 인터페이스만 확장용 |
| 출력 | Markdown (기본) + JSON | 사람 가독성 + Git diff 가능 |
| 페르소나 스타일 | 행동 지향적 (논문 결론) | 기억/배경 기반 대비 다양성 우수 |
| JSON 파싱 | `safeJSONParseArray` 자동 언래핑 | LLM이 배열을 객체로 감싸는 경우 대응 |
| 병렬 처리 | `Promise.all` + concurrency 제한 | API rate limit 준수 |

---

## 11. API 비용 추정 (GPT-4o-mini 기준)

| 단계 | 호출 수 | 비용 |
|------|---------|------|
| Context Expansion | 1 | < $0.01 |
| Axis Extraction | 1 | < $0.01 |
| Persona Expansion (N=25) | 25 | ~$0.05 |
| Questionnaire (선택) | 25 × 10 | ~$0.10 |
| **총합 (기본)** | **27** | **~$0.07** |
| **총합 (설문 포함)** | **277** | **~$0.17** |

GPT-4o 사용 시 약 10~20배.
