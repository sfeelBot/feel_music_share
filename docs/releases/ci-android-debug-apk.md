# Android Debug APK 자동 빌드/배포 파이프라인

- 상태: 워크플로 정의 완료, **아직 push되지 않음** (실행 이력 없음 — GitHub Actions는 원격에 push되어야 동작한다)
- 관련 파일: [`.github/workflows/android-debug-apk.yml`](../../.github/workflows/android-debug-apk.yml)
- 작성: 배포(Deployment) 서브에이전트, 2026-07-24

## 무엇을 만들었나

`apps/mobile/`(React Native bare CLI, Android) 앱을 GitHub Actions에서 자동으로 빌드해, GitHub Releases의 고정 URL로 항상 최신 debug APK를 사이드로드 다운로드할 수 있게 하는 CI 파이프라인.

- **트리거**: `main` 브랜치 push 중 `apps/mobile/**` 또는 워크플로 파일 자체가 바뀐 경우만 + `workflow_dispatch`(수동 실행). 기획/디자인 문서만 바뀐 push에는 반응하지 않는다.
- **러너**: `ubuntu-latest`. Android 빌드는 macOS가 필요 없고, Linux 러너가 Actions 무료 할당량 소모가 가장 적다.
- **빌드 단계**: checkout → Node 20 설정(`apps/mobile/package.json`의 `engines.node: >=18` 범위 내, npm 캐시 활성화, `apps/mobile/package-lock.json` 기준) → JDK 17(temurin) → `android-actions/setup-android`로 SDK 상태 보장 + `sdkmanager`로 `platforms;android-35`/`build-tools;35.0.0`(프로젝트의 `compileSdkVersion`/`buildToolsVersion`과 일치, `android/build.gradle` 참고) 명시적 설치 → `npm ci` → Gradle 캐시 복원 → `apps/mobile/android`에서 `./gradlew assembleDebug --no-daemon`.
- **서명**: 별도 시크릿 설정 없음. 저장소에 이미 커밋되어 있는 `apps/mobile/android/app/debug.keystore`(디버그 서명 키)로 서명되므로 설치 가능한 APK가 바로 나온다. **release APK(`assembleRelease`)는 이번 파이프라인에 포함하지 않았다** — 실제 배포용 서명 키/키스토어가 아직 없어 시도해도 실패하거나 무의미한 산출물만 나오기 때문. 실 서명 키 확보 후 release 빌드 잡을 별도로 추가해야 한다.
- **산출물 배포**: 두 갈래로 게시한다.
  1. `actions/upload-artifact`로 워크플로 실행별 아티팩트(`android-debug-apk`, 보관 30일) — Actions 탭에서 특정 실행 결과를 확인할 때 사용.
  2. `ncipollo/release-action`(`allowUpdates: true`, `replacesArtifacts: true`, `makeLatest: true`)으로 고정 태그 `android-debug-latest` 릴리즈를 매 빌드마다 갱신 — 새 릴리즈를 계속 늘어놓지 않고 하나의 릴리즈 엔트리와 첨부 파일만 최신 빌드로 교체한다. 릴리즈 노트 본문에 커밋 SHA(short/full), 빌드 일시(UTC), 워크플로 실행 링크를 자동 기입한다. 배포 대상 APK 파일명은 `feel-music-share-debug.apk`로 통일했다(원래 Gradle 산출물명 `app-debug.apk`를 릴리즈 업로드 전 rename). **(2026-07-26 갱신)** 마케팅 앱 이름이 "SameWave"로 확정됨에 따라 배포 산출물(APK) 파일명을 `SameWave-debug.apk`로 변경했다 — 자세한 내용은 아래 "업데이트 이력" 절 참고.
- **권한**: 워크플로 레벨에 `permissions: contents: write`를 명시 — 이게 없으면 기본 `GITHUB_TOKEN`으로 릴리즈 생성/갱신이 거부된다.
- **동시성 제어**: `concurrency: group: android-debug-apk`로 같은 릴리즈 태그를 여러 실행이 동시에 갱신하는 경합을 막았다(`cancel-in-progress: false` — 진행 중인 빌드를 취소하지 않고 순서대로 처리).

## 왜 이렇게 만들었나

- 사용자 요청이 "GitHub에서 Android 환경에서 바로 다운받을 수 있는 APK"였으므로, 매번 바뀌는 릴리즈 URL이 아니라 `github.com/sfeelBot/feel_music_share/releases/latest`(및 자산 직링크 `.../releases/latest/download/feel-music-share-debug.apk`)라는 **고정 URL**을 보장하는 것이 핵심 요구사항이었다.
- 이 앱은 아직 Firebase/Spotify Developer 앱이 실제로 연결되지 않은 초기 개발 단계다 — 릴리즈 노트 본문과 README 양쪽에 "로그인·동기화가 실제로 동작하지 않는다"는 한계를 명시해 사용자가 오인하지 않도록 했다(CLAUDE.md의 배포 에이전트 원칙 — 검증되지 않은/미완성 기능을 과장하지 않는다).
- 경로 필터를 둔 이유: `docs/specs/`, `docs/design/` 등 문서만 바뀐 커밋에도 매번 무거운 Android 빌드가 도는 것은 낭비이기 때문.

## 다음 단계(이번 라운드 범위 밖)

- 이 워크플로 파일은 로컬에만 존재하며 **아직 원격에 push되지 않았다** — 리더가 사용자 확인 후 커밋·push해야 실제로 Actions가 동작한다. push 전에는 실행 로그/성공 여부를 확인할 방법이 없다(로컬에서 워크플로를 실행해볼 수 없음, YAML 문법은 `js-yaml`로 파싱 검증만 완료).
- release(스토어 제출용 실서명) 빌드 파이프라인은 별도 논의 필요 — 키스토어 생성/보관(GitHub Secrets), Play Console 연동 등은 이 배포 에이전트의 범위 밖(App Store/Play Store 실제 제출은 사용자·리더가 별도로 결정).
- iOS 빌드는 이번 스코프에 포함하지 않았다(사용자·리더 합의로 추후 논의).

## 업데이트 이력

### 2026-07-26 — 배포 산출물 파일명을 "SameWave"로 변경

앱 마케팅 이름이 "SameWave"로 확정됨(`docs/design/04-app-naming.md`, `CLAUDE.md` 참고)에 따라, **배포 산출물(APK)의 파일명만** 아래와 같이 변경했다. 저장소 이름(`sfeelBot/feel_music_share`)과 개발 코드네임은 그대로 유지한다.

- `.github/workflows/android-debug-apk.yml`: rename 단계, 워크플로 아티팩트 업로드 경로, `ncipollo/release-action`의 `artifacts` 경로 모두 `feel-music-share-debug.apk` → `SameWave-debug.apk`로 통일. 릴리즈 노트 본문 첫 문장도 "SameWave(개발 코드네임: feel_music_share) 안드로이드 debug APK 자동 빌드입니다"로 다듬었다.
- 릴리즈 태그(`android-debug-latest`)는 URL 안정성을 위해 그대로 유지 — 태그명은 바꾸지 않았다.
- `README.md`의 다운로드 섹션 파일명 언급과 직접 다운로드 링크(`.../releases/latest/download/SameWave-debug.apk`)도 함께 갱신했다. 저장소 경로(`sfeelBot/feel_music_share/releases/...`)는 변경하지 않았다.
- 이 변경은 아직 push되지 않았다 — push 이후 다음 워크플로 실행에서 새 파일명으로 아티팩트/릴리즈가 정상 게시되는지 확인이 필요하다.
