# 배포(Deployment) 작업 로그

작업 시작/종료 시 아래 형식으로 항목을 **추가**한다 (append-only, 기존 내용 삭제 금지).

```
## YYYY-MM-DD
- 버전: ...
- 작업: ...
- 상태: 진행중 | 릴리즈 준비 완료 | 블로커
- 비고: ...
```

## 2026-07-24
- 버전: CI 파이프라인 신규 (버전 태그 없음 — 앱 자체는 아직 첫 정식 버전 태깅 전 단계)
- 작업: 사용자 요청("GitHub에서 Android 환경에서 바로 다운받을 수 있는 APK를 만들어달라")에 따라 `.github/workflows/android-debug-apk.yml` 신규 작성. `main` 브랜치의 `apps/mobile/**` 변경 push(경로 필터 적용) 또는 수동 실행(`workflow_dispatch`) 시 `ubuntu-latest` 러너에서 Node 20 + JDK 17(temurin) + Android SDK(`android-actions/setup-android` + `sdkmanager`로 `platforms;android-35`/`build-tools;35.0.0` 명시 설치) 환경을 구성하고, 저장소에 이미 커밋된 `apps/mobile/android/app/debug.keystore`로 서명되는 `assembleDebug`만 빌드(release APK는 실 서명 키 부재로 이번 범위에서 의도적으로 제외). 산출물은 워크플로 아티팩트로도 업로드하고, `ncipollo/release-action`(`allowUpdates`+`replacesArtifacts`+`makeLatest`)으로 고정 태그 `android-debug-latest` 릴리즈를 매번 갱신해 `https://github.com/sfeelBot/feel_music_share/releases/latest` 및 `.../releases/latest/download/feel-music-share-debug.apk` 고정 URL을 유지하도록 구성. `permissions: contents: write` 명시, `concurrency` 그룹으로 동시 갱신 경합 방지. README.md에 "다운로드(Android)" 섹션(위 두 고정 URL, "출처를 알 수 없는 앱" 설치 허용 안내, 초기 개발 단계로 Spotify 로그인·실시간 동기화 미동작 명시)과 "사용 방법" 섹션(온보딩→Spotify 연동→세션 생성/참여→플레이리스트→Now Playing, `docs/design/00-ux-flow.md` 근거) 추가. `docs/releases/ci-android-debug-apk.md`에 파이프라인 설계 근거·다음 단계 기록.
- 상태: 릴리즈 준비 완료 (워크플로 파일 작성 및 YAML 문법 검증(`js-yaml` 파싱)까지 완료 — 단, **아직 push되지 않아 실제 Actions 실행 이력은 없음**, 검증 불가)
- 비고: 이번 검증 라운드는 verifier의 "Round 2 통과"(커밋 `628c195`) 및 이후 커밋 `5bf722f`까지가 대상 — 검증 통과된 코드 위에 CI/배포 설정만 얹었으며 앱 코드 자체는 건드리지 않음. push는 리더가 사용자 확인 후 처리. 실 서명 키를 이용한 release 빌드, Play Store 제출, iOS 빌드(Windows/Linux CI로는 불가능, macOS 러너 필요)는 모두 이번 범위 밖 — 각각 별도 논의 필요. push 이후 첫 워크플로 실행 결과(SDK 컴포넌트 설치 성공 여부, Gradle 빌드 성공 여부 등)는 리더/검증 에이전트가 다음 라운드에서 확인해야 한다.

## 2026-07-26
- 버전: 동일 CI 파이프라인, 배포 산출물 파일명만 갱신 (앱 버전 태깅 아님)
- 작업: 앱 마케팅 이름이 "SameWave"로 확정됨에 따라, 배포 서브에이전트가 `.github/workflows/android-debug-apk.yml`의 rename 단계·아티팩트 업로드 경로·`ncipollo/release-action`의 `artifacts` 경로를 전부 `feel-music-share-debug.apk` → `SameWave-debug.apk`로 통일하고, 릴리즈 노트 본문 첫 문장을 "SameWave(개발 코드네임: feel_music_share) 안드로이드 debug APK 자동 빌드입니다"로 다듬었다. 릴리즈 태그(`android-debug-latest`)는 URL 안정성을 위해 그대로 유지. `README.md` 다운로드 섹션의 파일명·직접 다운로드 링크도 함께 갱신(저장소 경로는 불변). `docs/releases/ci-android-debug-apk.md`에도 "업데이트 이력"으로 반영.
- 상태: 릴리즈 준비 완료 (실질 파일 변경은 전부 완료·리더가 diff로 확인) — 단, **작업 도중 서브에이전트 프로세스가 사용자에 의해 중단(status: killed)되어 이 로그 항목 자체와 YAML 문법 최종 검증은 리더가 대신 마무리함**. 실제 Actions 실행 결과는 아직 push 전이라 미확인.
- 비고: 파일명 변경만 있고 코드/워크플로 로직 자체의 변경은 없어 리스크는 낮다고 판단. push 이후 첫 실행에서 새 파일명으로 릴리즈 자산이 정상 게시되는지 확인 필요.
