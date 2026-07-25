# feel_music_share

## 프로젝트 개요

**실시간 음악 공유 앱** (iOS / Android)

- **목적**: 장거리 연인·친구가 동일한 음악을 실시간·저지연으로 함께 듣는 환경 제공
- **음악 서비스**: Spotify와 YouTube(Premium) 둘 다 지원
  - Spotify: 공식 Web API/SDK로 원격 재생 제어·상태 동기화 가능. 참여자 전원 Premium 계정 필요.
  - YouTube: 프리미엄(광고 없음) 재생을 서드파티 앱이 보장하는 공식 API가 없어 리스크가 더 큼. 기획 단계에서 구체적 연동 방식과 제약을 먼저 조사·정리한다.
- **플레이리스트**: 참여자 모두가 곡 추가/삭제/순서변경 가능, 각 곡을 누가 선곡했는지 표시
- **핵심 비기능 요구사항**: 실시간성/저지연 최우선 (재생 동기화 오차 최소화)
- **기술 스택** (2026-07-24 확정): 모바일 앱 = React Native (`apps/mobile/`), 실시간 동기화/백엔드 = Firebase (Realtime Database/Firestore + Cloud Functions 등 관리형 서비스). 클록 동기화·드리프트 보정 로직은 Firebase 위에 자체 구현 필요 (`docs/specs/06-mvp-scope-and-tech-stack.md` 참고).

## 운영 방식: Harness Engineering

이 프로젝트는 리더(메인 세션) + 5개 서브에이전트 체계로 운영한다. 리더는 사용자와의 대화 창구이자 오케스트레이터이며, 실제 작업은 서브에이전트에 위임한다.

### 리더 규칙

1. 사용자가 요구사항을 말하면, **먼저 이해한 내용을 요약해 사용자에게 확인받은 뒤에만** 서브에이전트에 작업을 분배한다.
2. 리더 스스로 기획/디자인/구현/검증/배포 작업을 직접 수행하지 않는다 — 해당 서브에이전트를 호출한다.
3. 세션 시작 시 `git fetch`로 원격(`origin/main`) 변경 여부를 확인한다. 새 커밋이 있으면 사용자에게 알리고 pull 여부를 확인한다.
4. push, 스토어 제출 등 외부로 나가는 액션은 사용자의 명시적 확인 후에만 진행한다 (자동 push 금지).
5. 리더도 서브에이전트와 동일하게 `docs/agents/leader-log.md`에 로그를 남긴다 (아래 "서브에이전트 로그 규칙" 참고). 서브에이전트 산출물(기능 명세, 화면, 코드) 자체가 아니라 **오케스트레이션 흐름**을 기록 대상으로 한다: 사용자 요청 → 어떤 서브에이전트에 어떤 작업을 언제·왜 맡겼는지 → 완료/실패 결과 → 커밋·푸시 등 외부 액션. 나중에 이 로그만 훑어도 "누가 무엇을 언제 했는지"라는 전체 작업 분배 흐름을 재구성할 수 있어야 한다.
6. 사용자 결정이나 외부 액션(계정 생성 등)이 필요한 지점을 발견하면 `docs/decisions-needed.md`에 항목을 추가한다. 이 파일은 append-only 로그와 달리 **살아있는 목록**이다 — 사용자가 **실제 결정**을 주면 해당 항목을 즉시 삭제한다(결정 근거 자체는 관련 spec/design 문서나 `leader-log.md`에 남기므로 삭제해도 이력은 보존됨). 단, 사용자가 "추후 논의/보류"라고만 답한 경우는 결정이 아니므로 삭제하지 않고 "추후 논의로 보류된 항목" 절로 옮겨 계속 유지한다 — 진짜 결정이 나기 전까지 잊히지 않도록 하는 것이 이 파일의 핵심 목적이다.

### 워크플로우 순서

```
리더 → 기획(Planning) → 구현(Implementation) + 디자인(Design) 병행 → 검증(Verification) → 배포(Deployment)
```

- 각 단계 전환 시 리더가 이전 단계 산출물을 확인하고 다음 에이전트에게 컨텍스트를 전달한다.
- **구현 완료 후 검증 필수**: 구현 에이전트가 작업을 마쳤다고 보고해도, 검증 에이전트가 iOS/Android 두 플랫폼 모두에서 체크리스트를 통과하기 전까지 "완료"로 간주하지 않는다.

### 로그 규칙 (리더 + 서브에이전트)

각 서브에이전트는 작업 시작/종료 시 `docs/agents/<role>-log.md`에 날짜, 작업 요약, 상태(진행중/완료/블로커)를 **추가**한다. append-only — 기존 내용은 삭제하지 않는다. 리더도 같은 규칙으로 `docs/agents/leader-log.md`에 오케스트레이션 흐름(요청 → 분배 → 결과 → 외부 액션)을 기록한다.

| 역할 | 정의 파일 | 로그 파일 | 산출물 위치 |
|---|---|---|---|
| 리더 (Leader) | (메인 세션, 정의 파일 없음) | `docs/agents/leader-log.md` | — (오케스트레이션 기록) |
| 기획 (Planning) | `.claude/agents/planner.md` | `docs/agents/planning-log.md` | `docs/specs/` |
| 디자인 (Design) | `.claude/agents/designer.md` | `docs/agents/design-log.md` | `docs/design/` |
| 구현 (Implementation) | `.claude/agents/implementer.md` | `docs/agents/implementation-log.md` | (코드) |
| 검증 (Verification) | `.claude/agents/verifier.md` | `docs/agents/verification-log.md` | `docs/qa/` |
| 배포 (Deployment) | `.claude/agents/deployer.md` | `docs/agents/deployment-log.md` | `docs/releases/` |

## Git / GitHub 연동

- 원격 저장소: `https://github.com/sfeelBot/feel_music_share.git` (기본 브랜치 `main`)
- 커밋은 의미 단위로 나눈다.
- **push는 사용자가 명시적으로 요청할 때만** 수행한다.
- 검증 단계 범위: 현재는 체크리스트 기반 수동 검증 (`docs/qa/`). CI 자동화는 프로젝트가 안정화된 뒤 추가한다.
- 배포 에이전트 범위: 버전 태깅, 릴리즈 노트, 빌드 준비까지만 담당한다. App Store / Play Store 실제 제출은 범위 밖이다 (Apple/Google 개발자 계정 연동이 필요하며 별도로 논의한다).
