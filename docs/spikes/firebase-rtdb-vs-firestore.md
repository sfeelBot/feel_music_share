# 스파이크: Firebase Realtime Database vs Firestore (재생 동기화 백엔드 선택)

> 상태: v2 — 2026-07-26 초안 작성, 2026-07-27 RTDB 활성화 후 실측 절 추가(spiker 서브에이전트)
> 결정 문서 아님 — 이 문서는 조사/실측 결과를 정리한 참고 자료이며, 최종 선택은 사용자/리더의 몫이다. (2026-07-27 기준 이미 `docs/decision-log.md`에서 RTDB로 결정됨 — 아래 후속 절은 그 결정을 사후 실측으로 검증/보완하는 목적)

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

## 2026-07-27 후속 — RTDB 활성화 후 실측

> `docs/decision-log.md`(2026-07-27)에서 RTDB 단일 구성으로 이미 결정이 내려진 뒤, 후속 조치 항목("DB 활성화 후 실제 write→read round-trip 지연시간 실측")을 수행한 결과다. 이 절은 **결정을 재검토하지 않는다** — 이미 내려진 결정을 사후에 실측으로 검증/보완하는 목적이며, 새로운 데이터가 있어도 "권고"로만 기록한다.

### 배경

사용자가 오늘 Firebase 콘솔에서 RTDB를 실제로 활성화했다. 데이터베이스 URL: `https://feel-music-share-default-rtdb.asia-southeast1.firebasedatabase.app/` (리전: `asia-southeast1`, 즉 싱가포르). 이번 스파이크는 이 URL에 대해 REST API(`GET`/`PUT` + `.json` 경로)로 실제 write→read round-trip 지연시간을 curl로 직접 측정하는 것이 목표였다.

### 측정 방법(시도)

- 도구: curl (`-w "%{time_total}"`로 요청 전송~응답 완료까지의 총 소요시간 측정), 이 머신(Windows, `E:\music share`)에서 직접 실행.
- 대상 경로: `https://feel-music-share-default-rtdb.asia-southeast1.firebasedatabase.app/spikeTest.json`
- 계획: `PUT`으로 타임스탬프 값을 쓴 뒤 곧바로 `GET`으로 같은 경로를 읽어, 두 요청의 왕복 시간을 각각/합산으로 10회 이상 반복 측정할 계획이었다.

### 실제 결과: 보안 규칙에 막혀 실측 불가 (예상된 정상 동작)

```
$ curl -s -o /dev/null -w "HTTP:%{http_code} time_total:%{time_total}\n" \
    "https://feel-music-share-default-rtdb.asia-southeast1.firebasedatabase.app/spikeTest.json"
HTTP:401 time_total:0.211164

$ curl -s "https://feel-music-share-default-rtdb.asia-southeast1.firebasedatabase.app/spikeTest.json"
{
  "error" : "Permission denied"
}

$ curl -s -X PUT -d '{"ts": 1234567890}' -w "\nHTTP:%{http_code} time_total:%{time_total}\n" \
    "https://feel-music-share-default-rtdb.asia-southeast1.firebasedatabase.app/spikeTest.json"
{
  "error" : "Permission denied"
}
HTTP:401 time_total:0.171024
```

GET/PUT 둘 다 `HTTP 401` + `"Permission denied"`로 거부됐다. 이는 새로 생성된 RTDB 인스턴스의 **기본 잠금 보안 규칙**(`{"rules": {".read": false, ".write": false}}`)이 그대로 적용되어 있기 때문으로 보이며, 실패가 아니라 **예상된 정상 동작**이다(작업 지시에서 미리 언급된 시나리오와 정확히 일치). 이 프로젝트에 서비스 계정 키나 Firebase Admin SDK 인증 토큰이 없어(저장소 내 검색 결과 `serviceAccount*.json` 등 자격 증명 파일 없음 확인) 익명 REST 호출을 인증된 요청으로 우회할 방법도 없었다.

**따라서 실제 write→read round-trip(데이터가 실제로 저장/조회되는 왕복시간)은 이번에도 실측하지 못했다.** 보안 규칙을 직접 열어달라는 요청이 이번 스파이크의 지시 범위 밖이라(사용자/리더의 결정 사항) 규칙을 수정하려는 시도는 하지 않았다.

**진짜 write→read round-trip을 실측하려면 다음 중 하나가 필요하다:**
1. Firebase 콘솔에서 RTDB 보안 규칙을 임시로 테스트 모드(`{"rules": {".read": true, ".write": true}}`)로 완화 — 측정 후 반드시 원복 필요. 또는
2. 서비스 계정 키(Admin SDK)를 발급받아 REST 요청에 `?access_token=<OAuth2 토큰>`으로 인증을 실어 보내는 방식. 또는
3. 유효한 Firebase Auth 사용자 ID 토큰을 발급받아 `?auth=<ID_TOKEN>`으로 인증된 요청을 보내는 방식(단, 이 경우 규칙이 인증된 사용자에게 read/write를 허용하도록 이미 구성돼 있어야 함).

### 참고용 보조 측정 — "인증 거부 응답"의 네트워크 왕복시간 (실제 read/write 아님, 명확히 구분할 것)

실제 write/read는 못 했지만, 401 오류 응답 자체도 이 머신에서 `asia-southeast1` 리전 엣지까지 TCP+TLS 왕복 후 응답을 돌려받는 데 걸리는 시간을 반영한다는 점에서 **순수 네트워크 왕복시간(RTT)의 하한선**으로는 참고할 수 있다. 이는 **RTDB의 실제 데이터 read/write 처리 지연을 포함하지 않는다** — Firebase 프론트엔드가 보안 규칙 검사에서 조기에 거부하고 응답하는 경로이므로, 실제 값보다 오히려 더 빠를 가능성도, 인증 검사 오버헤드 때문에 다를 가능성도 있다(어느 쪽인지는 확인 불가). 참고 수치로만 취급해야 한다.

GET 요청을 동일 경로에 10회 연속 보내 `time_total`을 기록했다(위 "측정 방법"과 동일 curl 커맨드, 매 요청 새 TCP 연결):

| # | time_total (ms) |
|---|---|
| 1 | 176.9 |
| 2 | 173.8 |
| 3 | 159.3 |
| 4 | 172.5 |
| 5 | 158.7 |
| 6 | 170.5 |
| 7 | 160.8 |
| 8 | 166.9 |
| 9 | 155.8 |
| 10 | 170.4 |

- 평균: **약 166.6ms**
- 중앙값: **약 168.6ms**
- 최소: 155.8ms / 최대: 176.9ms

### 해석 — 공식 문서 수치와의 관계 (과장 금지)

- 이전 절(2026-07-26)이 인용한 공식 문서 수치 "RTDB typical response times no greater than 10ms"는 **Firebase 서버 인프라 내부에서 요청을 처리하는 데 걸리는 시간**을 가리키는 것으로 보이며, **클라이언트(이 머신)에서 서버까지의 네트워크 왕복시간(RTT)은 포함하지 않는 것**으로 보인다. 이는 정확히 작업 지시에서 미리 짚었던 우려와 일치한다.
- 이번에 측정된 약 155~177ms(평균 166.6ms)는 이 머신에서 `asia-southeast1`(싱가포르) 리전까지의 **네트워크 왕복시간 하한선**으로 해석하는 것이 타당하며, "RTDB 처리 자체가 10ms가 아니라 166ms 걸린다"는 뜻으로 잘못 해석해서는 안 된다 — 애초에 이번 측정은 실제 데이터 read/write가 아니라 보안 규칙에 의해 조기 거부된 응답의 왕복시간이다.
- 결론적으로 **"공식 문서의 ≤10ms가 이 프로젝트의 실제 클라이언트-서버 종단간(end-to-end) 체감 지연과는 다른 종류의 수치"라는 우려가 이번 실측(비록 완전한 실측은 아니지만)으로 뒷받침된다.** 실제 앱에서 참여자가 체감할 동기화 지연은 "네트워크 RTT(대략 150~180ms대, 사용자의 실제 모바일 네트워크 환경에 따라 더 나쁠 수 있음) + RTDB 서버 처리(공식 수치상 ~10ms 이하)"의 합에 가까울 것으로 추정되며, 이는 05 문서(`docs/specs/05-sync-architecture.md`)의 "서버 기준 시계 + 드리프트 보정" 설계가 RTDB 자체의 처리 속도보다 **네트워크 RTT 변동을 흡수하는 방향으로 설계되어야 함**을 시사한다(다만 이는 spiker의 해석이며, 05 문서의 설계 방향을 바꿀지는 리더/기획의 판단 영역이다).
- **진짜 write→read round-trip 실측치(데이터가 실제로 RTDB에 저장되고 다시 읽히는 데 걸리는 시간)는 여전히 확보하지 못했다** — 위 "실제 결과" 절 참고. 이 값이 네트워크 RTT(155~177ms)보다 유의미하게 커지는지(즉 RTDB 처리 자체가 체감 가능한 추가 지연을 더하는지)는 보안 규칙을 열거나 인증 토큰을 확보해야 확인 가능하다.

### 이 프로젝트 맥락에서의 참고용 권고 (결정 아님, 추가분)

1. 이전 절의 "RTDB가 이 앱의 저지연 요구사항에 구조적으로 더 잘 맞는다"는 권고는 이번 실측으로 **뒤집히지 않았다** — 다만 근거가 "공식 문서 비교"에서 "공식 문서 비교 + 실제 네트워크 RTT가 지배적 변수라는 확인"으로 보강됐다.
2. **진짜 write→read round-trip 실측은 여전히 남은 과제다.** 필요하면 아래 중 하나를 사용자/리더에게 요청할 것을 권고한다.
   - RTDB 보안 규칙을 짧은 시간만 테스트 모드로 완화(측정 즉시 원복) — 가장 간단하지만 보안 노출 시간이 생김.
   - 서비스 계정 키를 발급받아 spiker가 인증된 요청으로 측정 — 노출 없이 반복 측정 가능하지만 키 발급/보관 절차가 필요.
3. 네트워크 RTT(155~177ms대)가 이미 상당히 크다는 점을 감안하면, "RTDB vs Firestore" 선택 자체보다 **참여자의 실제 모바일 네트워크 환경(Wi-Fi/LTE/5G, 이동통신사 라우팅 등)에 따른 RTT 변동성**이 체감 동기화 품질에 더 큰 영향을 줄 가능성이 있다 — 05 문서의 드리프트 보정 로직이 이 변동성을 흡수하도록 설계·검증되었는지 확인하는 것이 이번 실측이 시사하는 다음 우선순위로 보인다(권고, 결정 아님).

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
