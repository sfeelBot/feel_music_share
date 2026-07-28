# 사용자 결정/액션 대기 목록

> 이 파일은 **살아있는(live) 목록**입니다 — append-only 로그(`docs/agents/*-log.md`)와 달리, **실제로 결정이 내려지거나 액션이 완료되면** 해당 항목을 이 파일에서 삭제합니다. 결정 자체의 근거·논의 이력은 관련 `docs/specs/`·`docs/design/` 문서나 `docs/agents/leader-log.md`에 남으니, 여기서 지워져도 기록이 사라지는 건 아닙니다.
>
> **주의 — "추후 논의로 보류"는 삭제 대상이 아닙니다.** 사용자가 아직 결정하지 않고 "나중에 다시 얘기하자"고 미룬 항목은 실제 결정이 아니라 **보류 상태**입니다. 시간이 지났다고, 혹은 같은 주제가 다시 언급됐다고 임의로 지우지 않고 아래 "추후 논의로 보류된 항목" 절에 계속 남겨둡니다 — 이 절의 항목은 사용자가 진짜 결정을 내렸을 때만 제거합니다.
>
> 리더는 사용자 결정이 필요한 지점을 발견할 때마다 이 파일에 항목을 추가하고, 사용자가 실제 결정을 주면 해당 항목을 제거합니다. 보류/연기 의사만 받은 경우는 "추후 논의" 절로 옮겨 계속 유지합니다.

## 제품/기술 결정 필요 (리더/사용자)

A. **Naver 로그인 — 지금 함께 붙일지, Cloud Functions 도입과 함께 후속 라운드로 미룰지 (2026-07-28 신규, 조사 완료)** — `docs/spikes/social-login-google-kakao-naver-firebase.md` 참고. 조사 결과 **Google/Kakao는 둘 다 Cloud Functions 없이(기존 "Firebase만 쓰는" 아키텍처 그대로) 붙일 수 있지만, Naver는 OIDC를 지원하지 않아 Firebase Custom Token 교환용 서버 로직(Cloud Functions + Blaze 요금제 전환)이 사실상 필수**다 — 이 프로젝트가 지금까지 회피해온 첫 서버 인프라 도입을 의미한다. 선택지:
   - **(1) 셋 다 지금 함께 진행** — "로그인 붙이기"가 사실상 "로그인 붙이기 + Cloud Functions 최초 도입" 두 결정을 동시에 포함하게 됨.
   - **(2) Google+Kakao 먼저, Naver는 후속 라운드로 분리** — 서버 불필요 그룹과 서버 필요 그룹을 나눠서, Naver는 Cloud Functions가 다른 이유로도 필요해지는 시점에 함께 처리.
   - Google 로그인은 이 결정과 무관하게 언제든 착수 가능(SHA-1 지문 등록 + `google-services.json` 재발급만 선행되면 됨).

## 외부 계정 설정 필요 (사용자 액션)

1. **Google — SHA-1/SHA-256 지문 등록 + `google-services.json` 재발급 (2026-07-28 신규)** — Firebase 콘솔 → 프로젝트 설정 → Android 앱(`com.mobile`)에 디버그 keystore SHA-1 등록 필요. 이 개발 환경에는 `keytool`이 PATH에 없어 리더가 직접 지문 값을 뽑지 못했음 — 사용자가 로컬에서 `cd apps/mobile/android && ./gradlew signingReport`(또는 `keytool -list -v -keystore debug.keystore -alias androiddebugkey -storepass android -keypass android`)로 SHA-1 확인 후 Firebase 콘솔에 등록, 등록 후 `google-services.json`을 재다운로드해서 공유해달라는 요청 예정.
2. **Kakao 개발자 계정/앱 등록 (2026-07-28 신규)** — Kakao Developers에 앱 생성 → REST API 키 확보 → [카카오 로그인] → [OpenID Connect] 활성화 → Redirect URI로 `https://feel-music-share.firebaseapp.com/__/auth/handler` 등록. 별도로 **Firebase 콘솔에서 "Firebase Authentication with Identity Platform"으로 업그레이드**도 필요(OIDC 커스텀 제공자 옵션 자체가 업그레이드 전에는 안 보임 — 앱 코드 변경은 불필요, 기존 익명 인증/RTDB 규칙에 영향 없음).
3. **Naver 개발자 계정/앱 등록** — 위 "제품/기술 결정" A항목이 먼저 정리된 뒤 진행(Cloud Functions 도입 여부와 묶여있음).
4. **RTDB 보안 규칙 배포 (2026-07-27 신규)** — 저장소 루트의 `database.rules.json`(1라운드에서 작성, 아직 미배포)을 Firebase 콘솔 Realtime Database → 규칙 탭에 직접 붙여넣거나 `firebase deploy --only database`(Firebase CLI 프로젝트 초기화 필요)로 배포해야 함. 배포 전까지는 RTDB가 여전히 기본 잠금 상태(`.read`/`.write` 모두 `false`)라 세션 생성/조회/참여 시도가 전부 거부됨(회귀 아님, 의도된 순서). 익명 인증 활성화는 완료됨(2026-07-27) — 이것만 되면 세션 생성이 실제로 되는지 바로 확인 가능.

## 추후 논의로 보류된 항목 (해결 전까지 계속 유지)

5. **iOS 배포 방향** — TestFlight / Ad Hoc 중 선택, 어느 쪽이든 유료 Apple Developer Program($99/년) 가입이 전제조건. (2026-07-24, 2026-07-25 두 차례 "추후 논의"로 보류 확인 — 아직 실제 결정 아님)

## 다음 라운드 예정 — 구현 후 실기기 확인 필요 (지금 당장 사용자가 할 일 아님, 참고용)

6. **YouTube 실기기 검증**: 지금은 `YouTubeNowPlayingView.tsx`/`youtubePlayerStub.ts`가 전부 자리표시자(placeholder)라 실제 재생 자체가 없다. 다음 구현 라운드에서 `react-native-webview` + YouTube IFrame Player를 실제로 붙인 뒤, 아래 순서로 진행될 예정이다 — **지금 사용자가 먼저 조사할 필요는 없고, 구현이 끝나면 실기기(가능하면 사용자 폰) 설치 → 확인 → 보고 순서로 자연스럽게 이어진다.** (2026-07-27 갱신: 검색은 실제 API로 교체 완료됐으나, 이 항목은 IFrame Player 재생 자체의 실기기 검증을 다룬다 — 여전히 유효.)
   - (a) **광고 노출 확인**: 실제 임베드 환경에서 영상 재생 시 프리롤/미드롤 광고가 뜨는지 육안 확인 — Premium이어도 서드파티 WebView 임베드에서 무광고가 보장되는지 공식 문서로 확답을 못 찾았기 때문(`docs/specs/03-youtube-integration.md` 7절).
   - (b) **명령 응답 지연 실측**: 재생/일시정지/탐색 명령을 내린 뒤 실제 화면 반영까지 걸리는 시간 측정 — 동기화 드리프트 보정 설계(`05-sync-architecture.md`)에 반영할 참고 수치를 얻기 위함.
   - 목적은 "YouTube를 포함할지 말지 판단"이 아니라(이미 포함하기로 결정됨) "제품 카피·사용자 기대치 문구를 정확히 쓰기 위한 실측"이다(`docs/specs/06-mvp-scope-and-tech-stack.md` 참고).
