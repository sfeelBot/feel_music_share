# 외부 서비스 콘솔 설정 가이드

> 이 파일은 **살아있는(live) 참고 문서**다 — Firebase/Spotify/YouTube 등 외부 서비스 콘솔에서 사용자가 직접 클릭해서 처리해야 하는 절차를, 다음에 똑같은 걸 또 하거나(예: 새 기기, 재설정) 비슷한 걸 해야 할 때 처음부터 다시 설명 듣지 않고 이 문서만 보고 따라갈 수 있도록 기록해둔다. `docs/decisions-needed.md`(지금 당장 해야 할 액션의 살아있는 목록)와는 성격이 다르다 — 그쪽은 "무엇을 해야 하는지"의 목록이고, 이 문서는 "어떻게 하는지"의 절차서다. 항목이 완료돼도 지우지 않고 상태만 "완료"로 표시해서 남겨둔다(나중에 같은 걸 또 해야 할 상황 — 예: 새 Firebase 프로젝트를 또 만들 때 — 대비).

## Firebase 콘솔

### 콘솔 접속

1. **https://console.firebase.google.com** 접속
2. 프로젝트 목록에서 **`feel-music-share`** 선택

### Realtime Database 활성화 (완료, 2026-07-27)

1. 왼쪽 사이드바 **Build → Realtime Database**
2. **"데이터베이스 만들기"** 클릭
3. 리전 선택(이 프로젝트는 `asia-southeast1` 싱가포르로 생성됨 — 한 번 정하면 나중에 못 바꾸므로 신중히)
4. 생성 시 표시되는 **데이터베이스 URL**을 기록해둘 것(`https://<프로젝트ID>-default-rtdb.<리전>.firebasedatabase.app/` 형태) — 이 URL이 `apps/mobile/src/config/env.ts`의 `FIREBASE_DATABASE_URL`에 들어간다(리전이 기본값 `us-central1`이 아니면 앱 코드에서 이 URL을 명시적으로 넘겨야 함 — `apps/mobile/src/services/firebase/firebaseClient.ts` 참고).

### 익명 인증(Anonymous Authentication) 활성화 (완료, 2026-07-27)

1. 왼쪽 사이드바 **Build → Authentication**
   - 처음 쓰는 프로젝트라면 "시작하기"(Get started) 버튼이 먼저 보일 수 있음 — 클릭해서 초기 설정
2. 상단 탭 **"Sign-in method"**(로그인 방법)
3. 로그인 제공업체 목록에서 **"익명"**(Anonymous) 클릭
4. 오른쪽 위 **"사용 설정"**(Enable) 토글 켜기 → **저장**(Save)
5. 별도 API 키·도메인 설정 불필요(가장 단순한 제공업체)

### RTDB 보안 규칙 배포 (⏳ 대기 중 — 아직 안 함)

1. 왼쪽 사이드바 **Build → Realtime Database → 규칙**(Rules) 탭
2. 저장소 루트의 **`database.rules.json`** 파일 전체 내용을 복사해서, 콘솔의 규칙 편집창 내용을 전부 지우고 붙여넣기
   - 이 파일은 라운드가 진행되면서 계속 갱신된다(지금은 세션 생성/조회/참여 경로만 다룸) — **항상 저장소의 최신 파일 내용을 그대로 복사할 것**, 이 가이드 문서에 JSON을 따로 박아두지 않는 이유가 이거다(내용이 여기 있으면 파일이 바뀌어도 이 가이드는 안 바뀌어서 헷갈림).
3. 오른쪽 위 **"게시"**(Publish) 클릭
4. 배포 전까지는 RTDB가 기본 잠금 상태(`.read`/`.write` 모두 `false`)라 앱에서 세션 생성/조회/참여가 전부 실패한다 — 배포하면 바로 반영됨(별도 앱 재시작 불필요).

## Google Cloud Console (YouTube Data API v3)

### API 활성화 + 키 발급 (완료, 2026-07-27)

Firebase 프로젝트는 내부적으로 같은 이름의 Google Cloud 프로젝트이므로 새로 만들 필요 없이 그대로 쓴다.

1. **https://console.cloud.google.com** 접속 → 상단 프로젝트 선택기에서 **`feel-music-share`** 선택
2. 왼쪽 메뉴 **API 및 서비스 → 라이브러리**(APIs & Services → Library)
3. 검색창에 **"YouTube Data API v3"** 입력 → 선택 → **"사용"**(Enable)
4. **API 및 서비스 → 사용자 인증 정보**(Credentials) → **"+ 사용자 인증 정보 만들기"** → **"API 키"**
5. 생성된 키에서 **"키 제한"**(Restrict Key) 설정:
   - **API 제한**: "키 제한" 선택 → **"YouTube Data API v3"만 체크** (유출 시 피해 범위 최소화)
   - **애플리케이션 제한**: **"없음"** 권장 — 이 프로젝트는 앱에서 직접 HTTPS REST 호출을 하는 방식이라, Android/iOS 앱 제한(구글 네이티브 SDK 전용 검증 방식)을 걸면 정상 요청까지 막힐 수 있음
6. 생성된 키 문자열을 리더(Claude)에게 전달 → `apps/mobile/src/config/env.ts`의 `YOUTUBE_API_KEY`에 반영 완료, `services/youtube/youtubeSearch.ts`(실제 `search.list`+`videos.list` 호출)로 교체 완료(커밋 `07d57ac`) — 앱 내 실기기 검색 동작 확인은 아직 대기 중

**쿼터 참고**: 기본 할당량 하루 10,000유닛, `search.list` 1회 호출당 100유닛 소모 → 하루 최대 약 100회 검색이 무료 한도. 여러 참여자가 자주 검색하면 빨리 소진될 수 있어 디바운스/캐싱 적용 예정(`docs/specs/04-playlist.md` 참고).

## Spotify Developer Dashboard

### Client ID / Redirect URI 등록 (완료)

- **https://developer.spotify.com/dashboard** 접속 → 앱 등록 → Client ID 발급, Redirect URI 2개(Android/iOS 커스텀 URL 스킴) 등록까지 완료됨. Client ID는 `apps/mobile/src/config/env.ts`의 `SPOTIFY_CLIENT_ID`에 반영돼 있음(PKCE 공개 클라이언트 식별자라 비밀값 아님, 코드에 그대로 커밋해도 안전).

### User Management에 테스트 계정 추가 (완료)

- Dashboard → 앱 선택 → **Settings → User Management** → 로그인할 계정의 이메일 추가(Development Mode는 최대 25명까지 등록 가능).

### Extended Quota Mode 신청 (필요 여부 재검토 중 — 아직 신청 안 함)

- 2026-07-27 기준: 애초에 이게 필요하다고 진단했던 검색 오류가 사실은 코드 버그(`limit` 파라미터 값)였음이 밝혀져(`docs/decisions-needed.md` 참고), **실기기 재확인 후 정말 필요한지 다시 판단할 예정** — 아직 신청 절차를 안내할 단계가 아님. 필요해지면 이 섹션에 실제 신청 단계를 추가한다. 참고로 2025년 3월 기준 심사 요건이 "정식 등록 사업자 + 월간 활성 사용자 25만 명 이상"이라 개인 프로젝트로는 사실상 신청 자격 자체가 어렵다.

## 참고

- 이 문서에 없는 새로운 외부 서비스 설정이 필요해지면, 그 안내를 한 시점에 리더가 이 문서에 새 절을 추가한다.
- 완료된 항목도 지우지 않는다 — 새 기기 설정, 프로젝트 재구성 등에서 다시 필요할 수 있다.
