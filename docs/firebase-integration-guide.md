# Firebase 연동 가이드 (진행 중 — 2026-07-27 기준)

> 이 문서는 Firebase 실연동 작업을 여러 세션에 걸쳐 이어갈 수 있도록 현재 진행 상태와 다음 단계를 기록해두는 참고 문서다. `docs/decisions-needed.md`의 "Firebase 연동" 항목과 연결되어 있다 — 결정 대기 상태 자체는 그 파일에서 관리하고, 여기서는 절차·맥락을 상세히 설명한다.

## 지금까지 확정/완료된 것

- **Firebase 프로젝트 생성 완료**: 프로젝트 이름 `feel-music-share` (사용자가 Firebase 콘솔에서 직접 생성).
- **기술 스택 결정**: 실시간 동기화 백엔드는 Firebase로 확정(`CLAUDE.md`, `docs/specs/06-mvp-scope-and-tech-stack.md` "확정 — 기술 스택 결정" 절).
- **(2026-07-27 확정) Realtime Database vs Firestore → Realtime Database로 결정 완료** — 회의록: [`docs/decision-log.md`](decision-log.md). 저지연 요구사항 + "고빈도 소량 갱신/다수 동시 구독" 접근 패턴 + 읽기 연산이 무료인 비용 구조가 이 앱에 유리하다고 판단.
- **Android 패키지 이름**: `com.mobile` — Firebase 콘솔에 정확히 이 이름으로 재등록 완료.
- **`google-services.json` 배치 + Gradle 플러그인 연결 완료**(커밋 `2a6f51d`, Round 16 검증 통과).
- **`@react-native-firebase/app`+`/database` 설치 + `firebaseClient.ts` 실제 초기화 완료**(커밋 `58317c2`, Round 17 검증 통과) — 모듈러 API(`getApps`, `getDatabase`) 기반.
- **(2026-07-27) Realtime Database 콘솔 활성화 완료** — 데이터베이스 URL: `https://feel-music-share-default-rtdb.asia-southeast1.firebasedatabase.app/` (리전: `asia-southeast1`, 기본 리전 `us-central1`이 아님). `google-services.json` 재다운로드 없이 이 URL을 코드에서 직접 `getDatabase(app, url)`에 전달하는 방식으로 진행(비기본 리전 인스턴스는 URL 명시가 필수 — RNFB 공식 문서 근거).
- **(2026-07-27) RTDB 트리 스키마·보안 규칙 설계 완료 + 인증 방식 결정 완료** — `docs/specs/10-rtdb-schema-and-security-rules.md`(스키마), `docs/decision-log.md` 2026-07-27(시나리오 A: Firebase Auth 익명 인증 채택).
- **(2026-07-27, 1라운드) `sessionService.ts` 세션 생성/조회/참여를 RTDB로 교체 + `@react-native-firebase/auth` 익명 인증 도입 완료** — 아래 "진행 상태" 9번 참고. 콘솔 액션(Anonymous 제공업체 활성화, 규칙 배포)은 아직 남아 있음.
- **주의(중요)**: 이 프로젝트는 **React Native(bare CLI)** 다 — Flutter가 아니다. `flutterfire_cli`, `flutter pub`, `firebase_options.dart` 같은 Dart/Flutter 전용 도구·코드는 이 프로젝트에 적용되지 않는다. React Native에서는 `@react-native-firebase` 패키지 계열을 쓴다.

## 사용자가 마저 해줘야 하는 것

**(2026-07-27, 1라운드 구현으로 새로 발생)** 아래 두 가지는 코드가 아니라 Firebase 콘솔에서 직접 처리해야 하는 액션이다 — 구현 에이전트가 코드/CLI로 대신할 수 없다(Firebase CLI 로그인이 이 환경에서 불가능):

1. **Firebase 콘솔 → Authentication → Sign-in method → "익명(Anonymous)" 제공업체 활성화.** 1라운드에서 도입한 `@react-native-firebase/auth`의 `signInAnonymously()`가 실제로 성공하려면 이 제공업체가 켜져 있어야 한다(안 켜져 있으면 `auth/operation-not-allowed` 에러). RTDB 보안 규칙(시나리오 A)이 `auth.uid`에 의존하므로 이게 없으면 세션 생성/참여 자체가 원천적으로 안 된다.
2. **RTDB 보안 규칙 배포.** 저장소 루트의 `database.rules.json`(1라운드에서 작성, 아직 미배포)을 Firebase 콘솔 Realtime Database → 규칙 탭에 직접 붙여넣거나 `firebase deploy --only database`(Firebase CLI 프로젝트 초기화 필요)로 배포해야 한다. 배포 전까지는 RTDB가 여전히 기본 잠금 상태(`.read`/`.write` 모두 `false`)라 세션 생성/조회/참여 시도가 전부 거부된다(회귀 아님, 의도된 순서 — 아래 "1라운드 진행 상태" 참고).

두 액션 모두 지금 당장 앱을 실행해봐도 (1)이 없으면 uid 발급부터 막히고, (2)가 없으면 그 다음 RTDB read/write가 막힌다 — 코드는 두 상태 모두 정직하게 실패(에러/reject)하도록 작성되어 있다.

## 진행 상태 — 코드 준비 작업 (2026-07-27 착수, 같은 날 6번까지 완료)

1. ~~`apps/mobile/package.json`에 `@react-native-firebase/app` + `@react-native-firebase/database` 설치.~~ (완료 — `25.1.0` 고정 버전, RN 0.76.9 + New Architecture 조합에서 공식 테스트되는 조합. 근거: 구현 로그 2026-07-27 항목 참고)
2. ~~`google-services.json`을 `apps/mobile/android/app/google-services.json`에 배치.~~ (완료)
3. ~~Google Services Gradle 플러그인 연결.~~ (완료, Round 16)
4. ~~`services/firebase/firebaseClient.ts`의 STUB을 실제 초기화 코드로 교체.~~ (완료 — 모듈러 API(`getApps`, `getDatabase`) 기반. `getFirebaseConnectionStatus()`가 "앱 초기화됨"과 "DB 활성화 확인됨"을 필드로는 구분하되, 후자는 실제 read/write 전까지 알 수 없다는 한계를 코드 주석에 명시.)
5. ~~빌드 재검증(`tsc`/`eslint`/`jest` + `gradlew assembleDebug`, clean 빌드 포함)으로 새 네이티브 의존성이 기존 빌드를 깨뜨리지 않는지 확인.~~ (완료 — 전부 통과, androidx.browser 때와 같은 네이티브 버전 충돌 없었음, Round 17)
6. ~~Firebase 콘솔에서 RTDB 활성화, 데이터베이스 URL 확보.~~ (완료, 2026-07-27 — `https://feel-music-share-default-rtdb.asia-southeast1.firebasedatabase.app/`)
7. ~~`env.ts`의 `FIREBASE_DATABASE_URL` placeholder에 위 URL 반영 + `firebaseClient.ts`의 `getFirebaseDatabase()`가 이 URL을 `getDatabase(app, url)`로 명시 전달하도록 수정.~~ (완료, 2026-07-27 — 커밋 `c43ceb6`. RTDB가 비기본 리전(`asia-southeast1`)이라 URL 명시가 필수였음.)
8. **(2026-07-27 스파이크로 발견, 설계는 완료)** RTDB 보안 규칙(`security rules`)이 아직 미배포 — 새 인스턴스 기본값인 완전 잠금(`.read`/`.write` 모두 `false`) 상태 그대로다(`docs/spikes/firebase-rtdb-vs-firestore.md` "2026-07-27 후속" 절, 익명 REST 요청이 401로 거부됨을 실측으로 확인). 트리 스키마·규칙 설계는 `docs/specs/10-rtdb-schema-and-security-rules.md`(시나리오 A 채택, `docs/decision-log.md` 2026-07-27)로 완료됐고, 1라운드가 다루는 경로(`/inviteCodes`, `/sessions/{id}/meta`, `/sessions/{id}/participants`)에 대한 실제 JSON도 저장소 루트 `database.rules.json`으로 작성 완료됐다 — **배포만 남았다**(위 "사용자가 마저 해줘야 하는 것" 2번).
9. **(2026-07-27, 1라운드 완료)** `services/session/sessionService.ts`의 `createSession`/`getSessionByInviteCode`/`joinSessionByCode`를 실제 RTDB 호출(`update()`/`get()`/`set()`)로 교체 완료. `getSession`은 로컬 캐시 동기 접근용으로 남기고, 신규 `subscribeToSession`(RTDB `onValue`)을 추가해 참여자 목록 실시간 반영에 씀(`state/SessionContext.tsx`에서 구독). 같은 라운드에서 `@react-native-firebase/auth` 익명 인증도 도입해 `participantId`를 `auth.uid` 기준으로 통일(RTDB 보안 규칙의 "본인 여부" 검증 전제). **플레이리스트/재생상태/매칭/참여자 role 관리는 여전히 인메모리** — 2-A/2-B/3/4라운드에서 순차적으로 이어간다(로드맵: `docs/specs/10-rtdb-schema-and-security-rules.md` "요구사항 3"). 상세: `docs/agents/implementation-log.md` 2026-07-27 항목.
10. RTDB 실제 write→read round-trip 지연시간 실측은 보안 규칙이 아직 미배포라 여전히 못 함(순수 네트워크 RTT 하한선만 참고 확보: 평균 166.6ms, `asia-southeast1` 기준) — 8번 규칙이 배포되면 후속 스파이크로 재시도 가능.
11. iOS 쪽 `GoogleService-Info.plist`는 iOS 배포 자체가 추후 논의 보류 상태라 다루지 않는다(`docs/decisions-needed.md` 참고) — `@react-native-firebase/auth`도 Android만 실제 네이티브 설정이 있고 iOS는 아직 미설정인 기존 제약을 그대로 물려받는다.
12. **다음 라운드(2-A)**: 단일 서비스 플레이리스트 CRUD(`addTrack`/`removeTrack`/`reorderPlaylist`)를 RTDB로 교체 + fractional order 기반 정렬 키 도입(10번 문서 "정렬 키 설계" 절).

## 참고 문서
- `docs/specs/05-sync-architecture.md` — 서버 기준 시계 동기화 모델
- `docs/specs/06-mvp-scope-and-tech-stack.md` — 기술 스택 확정 근거
- `apps/mobile/.env.example` — 필요한 환경값 목록
- `docs/decisions-needed.md` — 이 작업의 대기 상태 항목
