# Firebase 연동 가이드 (진행 중 — 2026-07-25 기준)

> 이 문서는 Firebase 실연동 작업을 여러 세션에 걸쳐 이어갈 수 있도록 현재 진행 상태와 다음 단계를 기록해두는 참고 문서다. `docs/decisions-needed.md`의 "Firebase 연동" 항목과 연결되어 있다 — 결정 대기 상태 자체는 그 파일에서 관리하고, 여기서는 절차·맥락을 상세히 설명한다.

## 지금까지 확정/완료된 것

- **Firebase 프로젝트 생성 완료**: 프로젝트 이름 `feel-music-share` (사용자가 Firebase 콘솔에서 직접 생성).
- **기술 스택 결정**: 실시간 동기화 백엔드는 Firebase로 확정(`CLAUDE.md`, `docs/specs/06-mvp-scope-and-tech-stack.md` "확정 — 기술 스택 결정" 절). Realtime Database와 Firestore 중 무엇을 쓸지는 아직 미정 — 아래 "결정 필요" 참고.
- **Android 패키지 이름**: `com.mobile` (`apps/mobile/android/app/build.gradle`의 `applicationId`/`namespace`). Firebase 콘솔에 Android 앱을 등록할 때 이 값과 정확히 일치해야 한다.
- **코드 쪽 준비 상태**: `apps/mobile/src/services/firebase/firebaseClient.ts`가 현재 STUB이다 — `getFirebaseConnectionStatus()`가 항상 `{isConfigured: false}`를 반환하며, 실제 Firebase SDK는 아직 설치·초기화되지 않았다. `apps/mobile/.env.example`에 필요한 값(`FIREBASE_PROJECT_ID`, `FIREBASE_API_KEY`, `FIREBASE_APP_ID`, `FIREBASE_DATABASE_URL`)이 이미 문서화되어 있다.
- **주의(중요)**: 이 프로젝트는 **React Native(bare CLI)** 다 — Flutter가 아니다. `flutterfire_cli`, `flutter pub`, `firebase_options.dart`, `Firebase.initializeApp(options: ...)` 같은 Dart/Flutter 전용 도구·코드는 이 프로젝트에 적용되지 않는다(2026-07-25 대화에서 사용자가 두 차례 혼동해 리더가 정정함). React Native에서는 `@react-native-firebase` 패키지 계열을 쓴다.

## 사용자가 마저 해줘야 하는 것 (`decisions-needed.md`와 동일)

1. **Firebase 콘솔** (console.firebase.google.com) → `feel-music-share` 프로젝트 → 프로젝트 설정(⚙️) → "앱 추가" → **Android** 선택 → 패키지 이름 `com.mobile` 입력 → 앱 등록.
2. 등록 직후 나오는 **`google-services.json` 다운로드** → 파일 경로 또는 내용 전체를 리더에게 공유.
3. Firebase 콘솔 왼쪽 메뉴 "빌드(Build)" 아래에서 **Realtime Database**를 켤지 **Firestore**를 켤지 결정(또는 아직 안 정했다고 알려주기 — 그러면 다음 단계에서 같이 정한다). 참고로 `docs/specs/05-sync-architecture.md`는 "서버 기준 시계 + host-follower 모델"을 전제로 하는데, 이 모델은 Realtime Database의 낮은 지연 특성이 다소 유리하지만 Firestore로도 구현 가능하다 — 확정 트레이드오프 분석은 아직 없음(실측 후 결정 예정이었던 항목).

## 파일/정보를 받으면 리더가 진행할 작업 (다음 세션 예정)

1. `apps/mobile/package.json`에 `@react-native-firebase/app` 설치, 그리고 위 2번에서 정해지는 대로 `@react-native-firebase/database`(Realtime DB) 또는 `@react-native-firebase/firestore` 추가.
2. `google-services.json`을 `apps/mobile/android/app/google-services.json`에 배치.
3. `apps/mobile/android/build.gradle`(루트)에 Google Services Gradle 플러그인 classpath 추가, `apps/mobile/android/app/build.gradle`에 `apply plugin: 'com.google.gms.google-services'` 추가.
4. `services/firebase/firebaseClient.ts`의 STUB을 실제 초기화 코드로 교체하고, `getFirebaseConnectionStatus()`가 실제 연결 상태를 반환하도록 갱신.
5. 빌드 재검증(`tsc`/`eslint`/`jest` + `gradlew assembleDebug`)으로 새 네이티브 의존성이 기존 빌드를 깨뜨리지 않는지 확인 — implementer/verifier 라운드로 진행.
6. 이후 실제 세션 상태(플레이리스트, 재생 위치, 참여자 목록) 읽기/쓰기 로직을 STUB인 `services/session/sessionService.ts`(현재 인메모리 목업)에서 Firebase 호출로 단계적으로 교체 — 이건 큰 작업이라 여러 라운드로 나눠 진행할 예정.
7. iOS 쪽 `GoogleService-Info.plist`는 iOS 배포 자체가 추후 논의 보류 상태라 이번 라운드에서는 다루지 않는다(`docs/decisions-needed.md` 참고).

## 참고 문서
- `docs/specs/05-sync-architecture.md` — 서버 기준 시계 동기화 모델
- `docs/specs/06-mvp-scope-and-tech-stack.md` — 기술 스택 확정 근거
- `apps/mobile/.env.example` — 필요한 환경값 목록
- `docs/decisions-needed.md` — 이 작업의 대기 상태 항목
