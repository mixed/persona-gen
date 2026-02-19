# Persona Generator — 계획 및 진행 관리

> 코드베이스 구조, 아키텍처, 타입 등 기술 참조는 `AGENTS.md`를 참조.

---

## 1. 현재 상태

**Phase 1 핵심 기능 완료.** 2-Stage 파이프라인, CLI, 다양성 평가, 설문 시뮬레이션, 간소화 Optimizer 모두 구현됨. Structured Outputs 적용 완료.

### 구현 완료 요약

- LLM Provider 추상화 (OpenAI 구현, Strategy 패턴)
- Halton 시퀀스 quasi-random 샘플러
- 축 값 매퍼 (continuous/categorical)
- 컨텍스트 확장 → 축 추출 → 페르소나 확장 파이프라인
- 6가지 다양성 메트릭 (Coverage, Convex Hull, Pairwise Distance, Dispersion, KL)
- Markdown / JSON 출력 렌더러
- CLI (generate, evaluate, inspect)
- 간소화 Optimizer (재시도 루프)
- 설문 생성 + 페르소나 응답 시뮬레이션
- Structured Outputs 4종 스키마
- `safeJSONParseArray` 자동 언래핑
- 포괄적 단위/통합 테스트

---

## 2. 완료된 태스크

- [x] **Task 01:** 프로젝트 초기 설정 (TypeScript, Vitest, 디렉토리)
- [x] **Task 02:** 타입 정의 + 인터페이스 (`types.ts`, `provider.ts`, `sampler.ts`)
- [x] **Task 03:** Halton Sequence 샘플러
- [x] **Task 04:** Axis Value Mapper
- [x] **Task 05:** LLM Provider (OpenAI)
- [x] **Task 06:** 프롬프트 템플릿 (4종)
- [x] **Task 07:** Context Expander
- [x] **Task 08:** Axis Extractor
- [x] **Task 09:** Persona Expander (병렬 처리)
- [x] **Task 10:** Pipeline 오케스트레이터
- [x] **Task 11:** 다양성 메트릭 (6종)
- [x] **Task 12:** Output 렌더러 (Markdown + JSON)
- [x] **Task 13:** CLI (generate, evaluate, inspect)
- [x] **Task 14:** 간소화 Optimizer (재시도 루프)
- [x] **Task 15:** 설문 시뮬레이션
- [ ] **Task 16:** README.md + Examples

### 추가 완료 태스크

- [x] Structured Outputs 스키마 (`schemas.ts`) + OpenAI `buildResponseFormat()` 통합
- [x] `safeJSONParseArray` 자동 언래핑 로직
- [x] `AGENTS.md` / `PLANNING.md` 분리
- [x] 메트릭 가중치 조정 + 개별 메트릭 기반 재생성 조건 추가
  - `convexHullVolume` 가중치 0.15→0.20, `meanPairwiseDistance` 0.20→0.15 교환
  - Optimizer에서 `convexHullVolume >= 0.5` 및 정규화 `meanPairwiseDistance >= 0.5` 미충족 시 재생성
  - `maxRetries` 기본값 2→5
- [x] Coverage 메트릭 차원 적응형 epsilon 적용
  - `adaptiveEpsilon(d)`: 2D epsilon=0.2의 부피 비율(~12.6%)을 모든 차원에서 유지
  - Lanczos 근사법 `logGamma` 헬퍼 추가
  - `computeCoverage()` epsilon 파라미터를 optional로 변경 (생략 시 자동 적응)
  - 6D에서 coverage > 0 생성 확인 테스트 추가
- [x] API 임베딩 PCA 차원축소 + min-max 정규화
  - `src/evaluation/pca.ts`: PCA 클래스 (공분산 행렬 → 고유벡터 → 투영 → [0,1] 정규화)
  - `embedding.ts`에서 API 임베딩 후 PCA 파이프라인 적용
- [x] ConvexHullVolume: bbox 방식 → MC + Away-Step Frank-Wolfe
  - `isInsideConvexHull()`: Away-Step Frank-Wolfe 알고리즘으로 선형 수렴 볼록 껍질 내부 판정
  - `computeConvexHullVolume()`: MC 샘플링으로 부피 비율 추정
- [x] ConvexHullVolume MC 샘플 수 1000 → 5000 인상 (실측 기반 정확도 최적값)
- [x] ConvexHullVolume `V^(1/d)` 정규화 (characteristic spread)
  - 고차원 curse of dimensionality 해결: 25점 6D 원시 부피 ~0.005 → d-th root ~0.43
  - 등가 hypercube 변 길이로 변환하여 차원 무관하게 유의미한 [0,1] 값 산출

---

## 3. 진행 중 / 다음 태스크

| 우선순위 | 태스크 | 상태 | 비고 |
|---------|--------|------|------|
| 1 | Task 16: README.md + Examples | 미착수 | 마지막 문서화 |
| 2 | E2E 테스트 (실제 API 호출) | 미착수 | `RUN_E2E=true` 환경에서 실행 |
| 3 | 테스트 커버리지 개선 | 미착수 | 현재 커버리지 측정 후 목표 설정 |

---

## 4. 미래 로드맵

### Phase 2: 확장

- **Anthropic Provider 추가** — `LLMProvider` 구현체 하나만 추가
- **로컬 모델 (Ollama 등)** — 같은 인터페이스로 래핑
- **풀 AlphaEvolve** — `Optimizer` 인터페이스 구현체 교체
- **다국어 확장** — 프롬프트 언어 매개변수 활용 (이미 설계에 포함)

### Phase 3: 통합

- **웹 UI** — React/Next.js에서 라이브러리 import
- **CI/CD 통합** — `persona-gen evaluate` 결과를 GitHub Actions 품질 게이트로 활용
- **Concordia 연동** — 페르소나 JSON → Concordia agent context 변환 어댑터

---

## 5. 태스크 의존성 그래프

```
Task 01 (프로젝트 설정) ✅
  │
  ├── Task 02 (타입/인터페이스) ✅ ─┬── Task 03 (Halton) ✅
  │                                ├── Task 04 (Mapper) ✅
  │                                ├── Task 05 (OpenAI Provider) ✅
  │                                └── Task 06 (프롬프트) ✅
  │                                      │
  │                      ┌────────────────┤
  │                      │                │
  │                Task 07 (Context) ✅  Task 08 (Axis) ✅
  │                      │                │
  │                      └────────┬───────┘
  │                               │
  │                         Task 09 (Persona Expander) ✅
  │                               │
  │                         Task 10 (Pipeline) ✅ ← Task 03, 04
  │                               │
  │                ┌──────────────┼──────────────┐
  │                │              │              │
  │          Task 11 (Metrics) ✅ Task 12 (Output) ✅ Task 13 (CLI) ✅
  │                │                             │
  │          Task 14 (Optimizer) ✅              │
  │                │                             │
  │          Task 15 (Questionnaire) ✅          │
  │                │                             │
  │                └──────────────┬──────────────┘
  │                               │
  │                         Task 16 (README) ⬜
  │
  └── [모든 Task 완료]
```

**병렬 가능 그룹 (참고):**
- Task 03 + 04 + 05 + 06 (기반 모듈, 서로 독립) — 완료
- Task 07 + 08 (06에만 의존) — 완료
- Task 11 + 12 + 13 (10에 의존하지만 서로 독립) — 완료
