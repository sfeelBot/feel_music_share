# Firebase 연동 가이드 (진행 중 — 2026-07-27 기준)

> 이 문서는 Firebase 실연동 작업을 여러 세션에 걸쳐 이어갈 수 있도록 현재 진행 상태와 다음 단계를 기록해두는 참고 문서다. `docs/decisions-needed.md`의 "Firebase 연동" 항목과 연결되어 있다 — 결정 대기 상태 자체는 그 파일에서 관리하고, 여기서는 절차·맥락을 상세히 설명한다.

## 지금까지 확정/완료된 것

- **Firebase 프로젝트 생성 완료**: 프로젝트 이름 `feel-music-share` (사용자가 Firebase 콘솔에서 직접 생성).
- **기술 스택 결정**: 실시간 동기화 백엔드는 Firebase로 확정(`CLAUDE.md`, `docs/specs/06-mvp-scope-and-tech-stack.md` "확정 — 기술 스택 결정" 절).
- **(2026-07-27 확정) Realtime Database vs Firestore → Realtime Database로 결정 완료** — 회의록: [`docs/decision-log.md`](decision-log.md). 저지연 요구사항 + "고빈도 소량 갱신/다수 동시 구독" 접근 패턴 + 읽기 연산이 무료인 비용 구조가 이 앱에 유리하다고 판단.
- **Android 패키지 이름**: `com.mobile` — Firebase 콘솔에 정확히 이 이름으로 재등록 완료.
- **`google-services.json` 배치 + Gradle 플러그인 연결 완료**(커밋 `2a6f51d`, Round 16 검증 통과) — 다만 RTDB가 아직 콘솔에서 활성화 전이라 이 파일에는 RTDB 데이터베이스 URL이 없는 상태(아래 "사용자가 마저 해줘야 하는 것" 참고).
- **코드 쪽 준비 상태**: `apps/mobile/src/services/firebase/firebaseClient.ts`가 현재 STUB — 다음 라운드에서 실제 초기화 코드로 교체 진행.
- **주의(중요)**: 이 프로젝트는 **React Native(bare CLI)** 다 — Flutter가 아니다. `flutterfire_cli`, `flutter pub`, `firebase_options.dart` 같은 Dart/Flutter 전용 도구·코드는 이 프로젝트에 적용되지 않는다. React Native에서는 `@react-native-firebase` 패키지 계열을 쓴다.

## 사용자가 마저 해줘야 하는 것 (`decisions-needed.md`와 동일)

1. Firebase 콘솔 → `feel-music-share` → Build → **Realtime Database** → "데이터베이스 만들기"로 활성화.
2. 활성화 시 생성되는 **데이터베이스 URL(리전 정보 포함)**을 공유하거나, `google-services.json`을 재다운로드해서 공유(현재 파일에는 RTDB URL이 없어 재다운로드가 필요할 가능성이 큼).

## 진행 상태 — 코드 준비 작업 (2026-07-27 착수, 같은 날 4~5번까지 완료)

1. ~~`apps/mobile/package.json`에 `@react-native-firebase/app` + `@react-native-firebase/database` 설치.~~ (완료 — `25.1.0` 고정 버전, RN 0.76.9 + New Architecture 조합에서 공식 테스트되는 조합. 근거: 구현 로그 2026-07-27 항목 참고)
2. ~~`google-services.json`을 `apps/mobile/android/app/google-services.json`에 배치.~~ (완료)
3. ~~Google Services Gradle 플러그인 연결.~~ (완료, Round 16)
4. ~~`services/firebase/firebaseClient.ts`의 STUB을 실제 초기화 코드로 교체.~~ (완료 — 모듈러 API(`getApps`, `getDatabase`) 기반. `getFirebaseConnectionStatus()`가 "앱 초기화됨"과 "DB 활성화 확인됨"을 필드로는 구분하되, 후자는 실제 read/write 전까지 알 수 없다는 한계를 코드 주석에 명시. **RTDB 자체는 여전히 콘솔에서 비활성 상태라 read/write는 다음 라운드까지 시도하지 않음.**)
5. ~~빌드 재검증(`tsc`/`eslint`/`jest` + `gradlew assembleDebug`, clean 빌드 포함)으로 새 네이티브 의존성이 기존 빌드를 깨뜨리지 않는지 확인.~~ (완료 — 전부 통과, androidx.browser 때와 같은 네이티브 버전 충돌 없었음)
6. 이후 실제 세션 상태(플레이리스트, 재생 위치, 참여자 목록) 읽기/쓰기 로직을 STUB인 `services/session/sessionService.ts`(현재 인메모리 목업)에서 RTDB 호출로 단계적으로 교체 — 이건 큰 작업이라 여러 라운드로 나눠 진행. **다음 라운드 시작점.**
7. iOS 쪽 `GoogleService-Info.plist`는 iOS 배포 자체가 추후 논의 보류 상태라 다루지 않는다(`docs/decisions-needed.md` 참고).

## 참고 문서
- `docs/specs/05-sync-architecture.md` — 서버 기준 시계 동기화 모델
- `docs/specs/06-mvp-scope-and-tech-stack.md` — 기술 스택 확정 근거
- `apps/mobile/.env.example` — 필요한 환경값 목록
- `docs/decisions-needed.md` — 이 작업의 대기 상태 항목
