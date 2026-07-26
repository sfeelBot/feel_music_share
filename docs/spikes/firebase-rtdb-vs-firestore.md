# 스파이크: Firebase Realtime Database vs Firestore (재생 동기화 백엔드 선택)

> 상태: 초안(v1) — 2026-07-26, spiker 서브에이전트 작성
> 결정 문서 아님 — 이 문서는 조사/실측 결과를 정리한 참고 자료이며, 최종 선택은 사용자/리더의 몫이다.

## 배경 / 질문

`docs/specs/06-mvp-scope-and-tech-stack.md` "확정 — 기술 스택 결정(2026-07-24)" 절에서 실시간 동기화 백엔드는 **Firebase**로 확정됐지만, **Realtime Database(RTDB)와 Firestore 중 무엇을 쓸지는 아직 미정**으로 남아 있다. `docs/firebase-integration-guide.md`도 동일하게 이 항목을 "결정 필요"로 표시하고 있다.

이 프로젝트의 핵심 비기능 요구사항은 **저지연 실시간 재생 동기화**(`CLAUDE.md`, `docs/specs/05-sync-architecture.md`)다. 05 문서가 제안한 "서버 기준 시계 + host-follower 모델"에서 RTDB/Firestore는 다음 역할을 맡는다.

- **쓰기**: 호스트(또는 조작자)의 재생/일시정지/seek/곡전환 조작이 서버(Cloud Functions 등)를 거쳐 "현재 곡 + 서버 기준 재생 시작 시각 + 재생 여부" 상태로 기록된다.
- **읽기(구독)**: 세션의 모든 참여자가 이 상태를 실시간 리스너(RTDB `onValue` / Firestore `onSnapshot`)로 구독하고, 변경이 생기면 즉시 로컬 플레이어를 맞춘다.

즉 이 앱의 접근 패턴은 "적은 수의 쓰기(방장이 조작할 때만) + 많은 수의 동시 리스너(참여자 전원이 항상 구독) + 매우 낮은 지연 요구"에 가깝다. 이 패턴에 어느 쪽이 더 적합한지가 이번 스파이크의 질문이다.

## 비교 방법

**혼합** — 아래 두 갈래로 진행했다.

1. **문서/사례 조사(완료)**: Firebase 공식 문서, 최신(2026년) 비교 아티클, 가격 문서를 WebSearch/WebFetch로 조사.
2. **실측 시도(불가로 판명, 근거 있음)**: 이 환경(Windows, 콘솔 계정 접근 권한 없음)에서 실제 프로젝트(`feel-music-share`, project_number `1000609556712`, `google-services.json`에서 확인한 API 키 사용)에 대해 RTDB/Firestore REST API로 write→read round-trip 지연시간을 직접 측정을 시도했다. 결과는 아래 "실측 시도 결과" 참고 — **두 서비스 모두 아직 콘솔에서 활성화되지 않은 상태임을 확인**했고, 그 이상의 실측(실제 지연시간 수치)은 불가능했다.

## 실측 시도 결과 (중요 — 정직하게 기록)

curl로 아래 요청을 보내 확인했다.

### Firestore
```
POST https://firestore.googleapis.com/v1/projects/feel-music-share/databases/(default)/documents/spikeTest
```
응답: **HTTP 403**, `status: PERMISSION_DENIED`, `reason: SERVICE_DISABLED`
```
"Cloud Firestore API has not been used in project feel-music-share before or it is disabled.
Enable it by visiting https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=feel-music-share ..."
```
이 오류는 **프로젝트는 실존하지만(다른 이름의 존재하지 않는 프로젝트로 같은 요청을 보내면 `CONSUMER_INVALID`라는 다른 오류가 난다 — 대조 확인함) Firestore API 자체가 이 프로젝트에서 켜져 있지 않다**는 뜻으로, 콘솔에서 Firestore 활성화가 아직 안 된 상태임을 명확히 확인해준다.

### Realtime Database
```
GET https://feel-music-share-default-rtdb.firebaseio.com/.json
```
응답: **HTTP 404**, `{"error": "404 Not Found"}` (Firebase RTDB 프론트엔드의 표준 오류 포맷)

다만 이 오류 포맷은 존재하지 않는 임의의 프로젝트명으로 같은 요청을 보내도 동일하게 나와(대조 확인함) Firestore 경우처럼 "프로젝트는 있는데 서비스만 꺼져 있다"를 명확히 구분해주지는 못한다. 그러나 `docs/firebase-integration-guide.md`가 이미 "Realtime Database를 켤지 Firestore를 켤지 아직 결정 안 됨"이라고 명시하고 있고, RTDB 인스턴스가 생성됐다면 부여됐을 리전별 호스트명(`*.firebasedatabase.app`)도 시도했으나 마찬가지로 404였다는 점을 종합하면, **RTDB 인스턴스도 아직 생성되지 않은 것으로 보는 것이 합리적**이다.

**결론: 두 서비스 모두 이 Firebase 프로젝트에서 아직 활성화되어 있지 않다. 실제 지연시간 실측(write→read round-trip)은 지금 불가능하다.**

**실측을 하려면 사용자가 다음을 먼저 해야 한다:**
1. Firebase 콘솔(console.firebase.google.com) → `feel-music-share` 프로젝트 → Build → Firestore Database(또는 Realtime Database) → "데이터베이스 만들기"로 최소 하나를 활성화.
2. (선택) 테스트 모드 보안 규칙으로 임시로 열어두면 API 키만으로 spiker가 REST API write/read 라운드트립을 스크립트로 측정 가능. 아니면 서비스 계정 키를 발급해 인증된 요청으로 측정.
3. 이 조건이 갖춰지면 spiker를 다시 호출해 실제 이 프로젝트/리전 기준 실측 스파이크를 후속으로 진행할 것을 권고한다(`docs/specs/06-mvp-scope-and-tech-stack.md`의 "후속 조치 제안"과 동일 항목).

## 옵션별 장단점 비교 (공식 문서 + 2026년 최신 자료 기반)

출처: [Firebase 공식 비교 문서](https://firebase.google.com/docs/database/rtdb-vs-firestore) (2026-07-03 UTC 갱신 확인) 및 아래 "참고 자료" 절의 최신 아티클.

| 항목 | Realtime Database | Cloud Firestore |
|---|---|---|
| 공식 명시 지연시간 | "typical response times no greater than **10 ms**" | "typical response times no greater than **30 ms**" |
| 데이터 모델 | 단일 JSON 트리 | 문서/컬렉션/서브컬렉션 계층 구조 |
| 실시간 리스너 | `onValue`/`onChildChanged` 등 — 트리 경로 단위 구독 | `onSnapshot` — 문서/쿼리 단위 구독, 로컬 캐시 기반 optimistic update |
| 쿼리 능력 | 한 속성에 대해서만 정렬 또는 필터(둘 다는 불가) | 복합 정렬/필터를 결합한 인덱스 쿼리 지원 |
| 오프라인 지원 | Apple/Android 클라이언트만 | Apple/Android/Web 클라이언트 모두 |
| 동시 연결/쓰기 확장성 | 데이터베이스 인스턴스당 동시 연결 약 **20만 개**, 쓰기 약 **초당 1,000건**까지 (그 이상은 인스턴스 샤딩 필요) | 동시 연결/전체 쓰기 속도에 사실상 제한 없음(자동 확장) |
| 가용성(공식 SLA 수치) | 99.95% | 99.999% |
| 가격 모델 | 대역폭 + 저장 용량 기준(단가는 더 높음) | 읽기/쓰기/삭제 연산 기준 + 저장/대역폭. 소량·저빈도 읽기에선 RTDB가, 문서 단위 최적화가 잘 된 경우엔 Firestore가 유리할 수 있음 — 접근 패턴에 따라 달라짐 |
| Cloud Functions 트리거 | 지원(RTDB 트리거) | 지원(Firestore 트리거) — 둘 다 05 문서가 요구하는 "서버 기준 시계 로직을 Cloud Functions에 구현" 방식과 호환 |
| 이 앱 접근 패턴과의 적합성 | 세션 상태(현재 곡/위치/재생여부)처럼 **단순한 키-값 트리 + 매우 잦은 소규모 갱신 + 다수 동시 구독자**에 구조적으로 잘 맞음. 05 문서의 "몇 초 간격 드리프트 보정" 같은 고빈도 소량 쓰기에도 유리 | 플레이리스트(곡 추가/삭제/순서/선곡자 검색·정렬)처럼 **구조화된 쿼리가 필요한 데이터**에 유리. 재생 상태 자체를 Firestore로 다뤄도 공식 수치상 큰 무리는 없으나(30ms), RTDB보다 원리적으로 약간의 지연 여유가 더 크다 |

### 2026년 최신 커뮤니티 자료 요약 (참고용, 공식 자료 아님 — 교차검증 필요)

- 실사용 벤치마크를 표방하는 여러 2025~2026년 아티클(Toxigon, Firemap 등)이 공통적으로 "평균 읽기 지연 RTDB 약 60ms vs Firestore 약 80ms, 초당 10건 연속 쓰기 시 RTDB는 꾸준히 ~50ms, Firestore는 간헐적으로 ~200ms까지 튐"이라는 유사한 경향을 보고한다. 다만 이 수치들은 공식 벤치마크가 아니라 개별 블로그의 자체 측정이라 **신뢰도는 참고 수준**이며, 이 프로젝트 고유의 리전/네트워크 조건에서 그대로 재현된다는 보장은 없다.
- 결론 경향은 다수 자료에서 일관됨: **"twitch-speed"(초저지연·고빈도 소량 갱신)가 최우선이면 RTDB, 복잡한 쿼리·오프라인 웹 지원·대규모 확장성이 필요하면 Firestore**. 이 프레이밍은 2020년대 초반 통념과 방향이 바뀌지 않았다 — 즉 "RTDB가 저지연에 유리하다"는 통념은 최신(2026년) 자료에서도 여전히 유효한 것으로 확인된다. Firestore의 실시간 리스너가 많이 개선되긴 했지만, 공식 문서 자체가 지금도 RTDB 쪽 지연시간을 더 낮게(10ms vs 30ms) 명시하고 있다.

## 이 프로젝트 맥락에서의 참고용 권고 (결정 아님)

> 아래는 spiker의 조사에 기반한 **권고**이며, 최종 선택은 사용자/리더의 몫이다. 실측 데이터가 아직 없다는 한계를 반드시 감안해야 한다.

1. **재생 동기화 상태(현재 곡/서버기준 시각/재생여부) 자체는 RTDB 쪽이 구조적으로 더 잘 맞아 보인다** — 05 문서가 요구하는 "고빈도 소량 갱신 + 다수 동시 구독"은 RTDB가 원래 최적화된 사용 사례이고, 공식 문서도 지연시간 수치를 더 낮게 제시한다.
2. **플레이리스트(검색/정렬/선곡자 표시 등 쿼리가 필요한 데이터)는 Firestore가 더 잘 맞아 보인다** — RTDB는 정렬과 필터를 동시에 못 쓰는 제약이 있어 이런 구조화된 데이터에는 불리하다.
3. 따라서 "RTDB 아니면 Firestore" 양자택일보다, **재생 동기화 상태 = RTDB, 플레이리스트/세션 메타데이터 = Firestore로 역할을 나눠 병행 사용하는 하이브리드 구성도 고려할 만하다.** 다만 이 경우 두 서비스를 동시에 콘솔에서 활성화·연동해야 해서 초기 설정 복잡도와 SDK 의존성(`@react-native-firebase/database` + `@react-native-firebase/firestore` 둘 다 설치)이 늘어난다는 점은 트레이드오프다.
4. **단일 서비스로 단순하게 가야 한다면**, 이 앱의 최우선순위가 "저지연 동기화"라는 CLAUDE.md의 명시적 요구사항과 가장 직접적으로 부합하는 쪽은 RTDB다. Firestore를 단일 선택할 경우에도 공식 수치상(30ms) 심각하게 부적합하진 않으므로, "구현 단순성·쿼리 편의성"을 더 우선한다면 Firestore 단일 구성도 현실적 대안이다.
5. **가장 중요한 다음 단계**: 위 권고는 모두 문서 조사 기반 추정이다. 이 프로젝트의 실제 리전·네트워크 조건에서 두 서비스 중 최소 하나(가능하면 둘 다)를 콘솔에서 활성화한 뒤, spiker가 후속 스파이크로 write→read round-trip 실측을 진행할 것을 강력히 권고한다 — `docs/specs/06-mvp-scope-and-tech-stack.md`가 이미 이 항목을 "후속 조치 제안"으로 명시해뒀다.

## 참고 자료

- [Firebase 공식: Choose a database — Cloud Firestore or Realtime Database](https://firebase.google.com/docs/database/rtdb-vs-firestore) (2026-07-03 UTC 갱신 확인)
- [Firemap: Firebase Realtime Database vs Firestore — Which One Should You Use in 2026?](https://firemap.dev/blog/firebase-realtime-database-vs-firestore)
- [Toxigon: Which Firebase database should you actually use in 2025?](https://toxigon.com/firestore-vs-realtime-database)
- [Estuary: Firestore vs. Realtime Database — Which Performs Better?](https://estuary.dev/blog/firestore-vs-realtime-database/)
- [Airbyte: Firebase Vs Firestore — Which is More Reliable for Real-Time Applications?](https://airbyte.com/data-engineering-resources/firebase-vs-firestore)

## 관련 문서

- `docs/specs/05-sync-architecture.md` — 서버 기준 시계 + host-follower 동기화 모델
- `docs/specs/06-mvp-scope-and-tech-stack.md` — 기술 스택 확정 근거, 후속 스파이크 제안 항목
- `docs/firebase-integration-guide.md` — Firebase 연동 진행 상태, "결정 필요" 항목
- `docs/decisions-needed.md` — Firebase 연동 항목(RTDB vs Firestore 포함)
