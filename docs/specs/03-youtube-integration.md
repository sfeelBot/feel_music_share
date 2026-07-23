# 03. YouTube(Premium) 연동 리서치 및 제약

> 상태: v1 (2026-07-23) + 6절 추가(2026-07-23, 같은 날 — "호스트 단독 유료 계정 + 오디오/비디오 중계" 모델 검토)
> 리서치 근거: Google/YouTube 공식 개발자 문서, YouTube Help, Google Developers Blog, GitHub 이슈, 각종 개발자 커뮤니티 (2026-07-23 기준 WebSearch/WebFetch로 확인). 6절은 YouTube 공식 이용약관 PDF 원문 직접 대조를 포함.
> **주의**: 이 문서는 CLAUDE.md에서 "리스크가 크다"고 명시한 영역이다. 결론 대부분에 확실성 등급을 표기했으며, 불확실한 부분은 "확인 필요"로 명시했다.

## 배경

YouTube는 Spotify와 달리 "서드파티 앱이 재생을 원격 제어하면서 동시에 프리미엄(무광고) 혜택까지 보장"하는 공식 API/SDK가 존재하지 않는다. 이 문서는 (1) YouTube Data API로 할 수 있는 것/없는 것, (2) YouTube Music API 존재 여부, (3) 서드파티가 실제로 재생을 원격 제어·동기화할 방법이 있는지, (4) 없다면 대안(예: 각자 로컬 재생 + 타임스탬프 동기화)을 정리한다.

## 요구사항 대비 조사 결과

### 1) YouTube Data API v3 — 할 수 있는 것 / 없는 것

YouTube Data API v3는 **메타데이터 API**다. 검색, 동영상/재생목록 정보 조회, 재생목록 항목 추가/삭제/순서 변경(사용자의 유튜브 계정 소유 재생목록에 한함), 채널 정보 등을 다룬다.

- 가능: 동영상 검색, 메타데이터(제목/채널/길이/썸네일) 조회, 사용자 소유 YouTube 재생목록의 항목 추가/삭제/순서 변경(OAuth로 사용자 인증 시).
- **불가능**: Data API 자체에는 "재생(play)"이라는 개념이 없다. 즉 Data API 호출로 어떤 기기에서 동영상 재생을 시작/정지시키거나 재생 위치를 가져오는 기능은 **존재하지 않는다**. Data API는 순수 메타데이터/카탈로그 관리용이며 플레이어 제어와 무관하다.
- **YouTube Music API**: 공식적으로 서드파티에게 공개된 "YouTube Music Data/Player API"는 **존재하지 않는다** (YouTube Music은 YouTube 계정/카탈로그를 공유하지만 별도의 공식 오픈 API가 없음). 일부 비공식 리버스 엔지니어링 라이브러리(ytmusicapi 등)가 존재하나, 이는 Google 비공식·ToS 위반 소지가 있어 상용 서비스에 채택 권고하지 않는다.

### 2) 실제 재생을 제어하는 공식 수단 — IFrame Player API

재생 제어(재생/일시정지/탐색/음량 등)가 가능한 공식 수단은 **IFrame Player API** (`https://developers.google.com/youtube/iframe_api_reference`)뿐이다.

- 이는 웹페이지에 `<iframe>`으로 삽입된 YouTube 플레이어를 JavaScript로 제어하는 API다. 모바일 네이티브 앱에서는 **WebView(Android WebView / iOS WKWebView) 안에 IFrame Player를 로드**하고, JS 브릿지로 네이티브 코드와 통신하는 방식으로 우회 구현한다.
- 과거 존재했던 **YouTube Android Player API**(네이티브 SDK)는 2023년에 사실상 단종되었고, 2025년 1월 Google 공식 문서(Required Minimum Functionality/개발자 가이드)에서 관련 언급이 완전히 제거되었다. **YouTube iOS Player Helper** 라이브러리(GitHub `youtube/youtube-ios-player-helper`)도 2024년 12월 5일 Google에 의해 **아카이브(read-only) 처리**되어 더 이상 유지보수되지 않는다.
- 따라서 현재(2026년) 기준 Google이 실질적으로 권장하는 유일한 경로는 **WebView 내 IFrame Player API**이며, 이는 우리 프로젝트가 채택할 수 있는 최선의 "공식" 수단이다. (다만 이는 애초에 "임베드 플레이어" 용도로 설계된 것이지, 모바일 앱의 1급 시민 SDK로 설계된 것이 아니다.)

이 IFrame Player API JS 함수로 할 수 있는 것: 동영상 큐잉, 재생/일시정지/정지, 특정 위치로 seek, 음량 조절, 현재 재생 상태·위치 조회(polling), 이벤트 리스너(상태 변경, 재생 완료 등)를 등록. → **우리가 필요로 하는 재생 명령/상태 조회 자체는 기술적으로 가능**하다.

### 3) 광고 제거(Premium 혜택) — 가장 큰 리스크 영역

이 부분이 CLAUDE.md가 우려한 핵심 리스크이며, 조사 결과 다음과 같이 정리된다.

- **YouTube Developer Policies(ToS)**: "API 서비스에서, 유튜브 본편이나 임베드 영상에서 광고가 재생되었을 상황에 광고 재생을 막는 행위"를 명시적으로 금지한다. 즉 서드파티 앱이 의도적으로 광고를 차단/우회하는 기능을 만드는 것은 **명백한 ToS 위반**이며, 발각 시 API 키 정지 등 제재 대상이다. (실제로 Google은 2024년부터 NewPipe 등 광고 차단 서드파티 앱에 대해 API 레벨 차단 조치를 강화해왔다.)
- **임베드 플레이어와 Premium 무광고 혜택의 관계**: YouTube Premium의 무광고 혜택은 "**로그인한 사용자 본인이 시청할 때**" 적용되는 개인 단위 혜택이다. 그런데:
  - 2024년 8월 1일부터 Google은 오히려 **임베드 플레이어의 광고 노출을 늘렸다**(서드파티 사이트에 노출되는 프리롤/미드롤/포스트롤 빈도 증가).
  - 임베드 IFrame이 "이 세션이 Premium 계정으로 로그인된 세션"임을 인식하려면 유튜브 로그인 세션(쿠키)이 그 iframe 컨텍스트에 전달되어야 하는데, 모바일 WebView 환경에서는 서드파티 쿠키 정책·세션 격리 때문에 이것이 안정적으로 보장되지 않는다.
  - 결정적으로, **Google은 2023년 7월 24일부터 임베디드 웹뷰(Android `WebView`, iOS `WKWebView` 포함)를 통한 Google 계정 OAuth/로그인 자체를 전면 차단**했다(`disallowed_useragent` 오류). 즉 우리 앱의 WebView 안에서 사용자가 구글 계정에 새로 로그인하는 플로우 자체가 원천적으로 불가능하다. 시스템 브라우저(예: iOS `ASWebAuthenticationSession`, Android Chrome Custom Tabs)로 로그인시킨 뒤 세션/쿠키를 임베드 WebView로 안전하게 이전하는 것도 보장되지 않고, 시도 자체가 계정 보안 정책 회피로 해석될 소지가 있다.
  - 종합하면: **우리 앱의 WebView 안에 임베드된 YouTube 플레이어가 사용자의 YouTube Premium 무광고 혜택을 안정적으로 상속받는다는 보장이 없다.** 즉 "YouTube Premium 회원이면 광고 없이 본다"는 CLAUDE.md의 기대가 서드파티 임베드 환경에서는 **기술적으로 보장되지 않을 가능성이 높다** (등급: 중간 확실성 — 공식 문서가 "임베드에서 로그인 세션에 따라 광고가 사라진다"고 명시적으로 확언하지도, 부인하지도 않아 **확인 필요**로 최종 분류. 다만 여러 정황 근거(웹뷰 로그인 차단, 2024년 임베드 광고 증가 정책)는 "보장 안 됨" 쪽에 무게가 실린다).
- 참고로 공식 유튜브 앱/유튜브 뮤직 앱/유튜브 공식 웹사이트에서는 Premium 로그인 시 광고가 확실히 제거된다 — 문제는 어디까지나 "우리 앱 안에 심은 서드파티 임베드"에서의 보장 여부다.

### 4) 원격 제어/동기화 관련 공식 기능 (참고, 우리 용도에는 부적합)

- YouTube 공식 앱에는 "휴대폰을 TV의 리모컨처럼 쓰는" 기능이 있으나, 이는 **동일 사용자 계정이 로그인된 YouTube 공식 앱들 사이의 1:1 기능**이며 서드파티 개발자에게 공개된 API가 아니다. 우리 다인원·다계정 세션 요구사항에는 적용 불가.
- VideoSync 등 서드파티 라이브 스트림(방송) 동기화 사례들은 존재하지만, 이들은 모두 "각자의 브라우저에서 열린 임베드 플레이어를 외부에서 seek 명령으로 맞추는" 방식이지, YouTube가 공식적으로 동기화를 지원하는 것이 아니다 — 우리가 검토 중인 "로컬 재생 + 타임스탬프 동기화" 아이디어와 사실상 동일한 접근이다.

### 5) IFrame 임베드 시 준수해야 할 정책 (Required Minimum Functionality)

- 임베드 플레이어는 최소 200x200px 이상 크기 유지, YouTube 컨트롤 위에 자체 UI를 겹쳐 가리면 안 됨, 커스텀 재생 버튼은 허용되나 탭 시 반드시 실제 재생을 트리거해야 함, 광고 차단/우회 금지 등 규정이 있다. 우리 앱의 커스텘 플레이어 UI(방 화면에 임베드된 플레이어) 설계 시 이 규정을 준수해야 계정/API 정지 리스크를 피할 수 있다.

## 제약/리스크 (요약)

| 리스크 | 내용 | 확실성 |
|---|---|---|
| 재생 제어 자체 가능 여부 | WebView + IFrame Player API로 재생/정지/seek/상태조회 가능 | 높음(공식 문서 확인) |
| 네이티브 전용 공식 SDK 부재 | Android Player API, iOS Player Helper 모두 단종/아카이브 | 높음(공식 확인) |
| YouTube Music 공식 API 부재 | 서드파티에 공개된 공식 API 없음 | 높음 |
| Premium 무광고 혜택이 임베드에서 보장되는가 | 보장된다는 공식 확언 없음. 정황상 보장 안 될 가능성 높음 | **중간 — 확인 필요** (구현 전 실기기 프로토타입 실측 강력 권고) |
| 광고 제거 시도 시 ToS 위반 | 의도적 광고 차단/우회는 명백히 금지, 계정/API 정지 리스크 | 높음(공식 정책 확인) |
| WebView 내 Google 로그인 불가 | 2023년부터 임베디드 웹뷰 OAuth 전면 차단 | 높음(공식 발표 확인) |
| 동기화를 위한 공식 지원 | 없음. 모두 자체 구현(각자 로컬 재생 + 명령 동기화) | 높음 |

## 제안

### 대안 A — 채택 권고: "로컬 임베드 재생 + 타임스탬프 동기화" (CLAUDE.md에서 언급한 방향과 동일)

- 각 참여자의 기기에서 WebView 기반 IFrame Player로 **동일한 videoId**를 각자 로컬로 로드/재생한다.
- 우리 서버/실시간 채널은 오디오가 아니라 "재생 명령(재생/정지/seek) + 기준 타임스탬프"만 중계한다 (Spotify 방식과 구조적으로 동일 — `05-sync-architecture.md` 참고).
- 광고는 완전히 제거하지 않는다(=시도하지 않는다). ToS 위반 리스크를 피하기 위해 **광고 차단/우회 기능은 만들지 않는다**. 사용자에게는 "YouTube 정책상 무광고가 100% 보장되지 않을 수 있음"을 명확히 고지한다(기대치 관리).
- 로그인은 YouTube Data API 사용을 위한 최소 범위(재생목록 검색/조회 등)에 한해 **시스템 브라우저 기반 OAuth**(임베드 웹뷰 아님)로 진행한다.

### 대안 B — 대안: YouTube Music 전용 앱과의 연동 시도 안 함

- 비공식 API(ytmusicapi 류) 사용은 ToS 위반·불안정성(리버스 엔지니어링이라 언제든 깨질 수 있음) 리스크가 커서 **채택하지 않을 것을 권고**한다.

### 대안 C — 장기 검토: 광고가 있는 상태를 전제로 UX 설계

- 광고가 나올 수 있음을 전제로, 광고 재생 중에는 동기화를식(각자 광고 길이가 다를 수 있음)를 어떻게 처리할지 UX적으로 고민이 필요하다(예: "광고 시청 중" 상태를 참여자들에게 표시하고, 광고가 끝나는 시점에 맞춰 재동기화). 이는 상세 설계 단계(디자인/구현) 몫으로 남긴다.

### 종합 제안

- YouTube 지원은 기술적으로 **불가능하지 않지만**, (1) 무광고 보장 불확실, (2) 네이티브 공식 SDK 부재로 WebView 우회 구현 필요, (3) ToS 준수 부담이 Spotify 대비 뚜렷이 크다.
- 따라서 YouTube는 **MVP 1차 범위에서 제외하고 2차 단계로 미루는 것을 권고**한다. 상세 비교와 최종 권고 근거는 `06-mvp-scope-and-tech-stack.md`에 정리했다.
- YouTube를 2차로 착수할 경우, 가장 먼저 해야 할 일은 "실기기에서 Premium 계정으로 로그인한 상태의 WebView 임베드 플레이어에 실제로 광고가 뜨는지 안 뜨는지"를 직접 실측하는 스파이크(구현 이전 검증 실험)다 — 이 결과에 따라 제품 카피/기대치 관리 방향이 달라진다.

## 6) [추가 조사 — 2026-07-23] "호스트 단독 유료 계정 + 오디오/비디오 중계" 모델 검토

> 배경: 사용자가 제안한 대안 아키텍처 — 방장(호스트) 한 명만 YouTube Premium 계정을 갖고, 호스트 기기에서 실제 재생되는 오디오(또는 오디오+비디오)를 캡처해 서버/앱이 다른 참여자에게 실시간 중계하고, 참여자는 별도 계정이 필요 없게 하는 방식. 동일 모델을 Spotify에 대해 먼저 검토했으나(리더의 사전 지식 기반 리스크 제기), 사용자가 Spotify는 리스크로 인해 기각하고 기존 기조(전원 Premium)를 유지하기로 결정함(`02-spotify-integration.md` 참고). 이 절은 같은 모델이 YouTube에서는 성립하는지를 별도로 검토한 결과다.

### 6-1. YouTube 이용약관/정책상 명시적 근거

**핵심 결론부터: 명확한 금지 근거를 찾았다 (확실성: 높음 — YouTube 공식 이용약관 원문(PDF, 2023-12-15자 발효본)을 직접 확인).**

YouTube 이용약관(`https://www.youtube.com/static?template=terms`, 2023년 12월 15일 발효본, PDF 원문 직접 대조 확인) "Your Use of the Service" 절의 "Permissions and Restrictions" 항목:

> "You may view or listen to Content for your **personal, non-commercial use**. You may also show YouTube videos through the embeddable YouTube player."
>
> "The following restrictions apply to your use of the Service. You are not allowed to:
> 1. access, reproduce, download, distribute, **transmit, broadcast, display**, sell, license, alter, modify or otherwise use any part of the Service or any Content **except**: (a) as expressly authorized by the Service; or (b) with prior written permission from YouTube and, if applicable, the respective rights holders;
> ...
> 9. use the Service to view or listen to Content **other than for personal, non-commercial use** (for example, **you may not publicly screen videos or stream music from the Service**); or"

- 조항 9의 괄호 예시("you may not publicly screen videos or stream music from the Service")는 사실상 **우리가 검토 중인 시나리오(한 사람이 재생하는 것을 다른 사람들에게 중계/스트리밍)를 정확히 지목해 금지**하고 있다. "장거리 연인·친구 여러 명이 호스트가 재생하는 음악을 함께 듣는다"는 우리의 핵심 시나리오는 정확히 "stream music from the Service"에 해당할 소지가 매우 크다.
- 조항 1은 "Content의 일부라도 전송(transmit)·방송(broadcast)·표시(display)"하는 행위를 서비스가 명시적으로 허용한 경우(임베드 플레이어 등) 외에는 금지한다. 호스트가 캡처한 오디오/비디오를 우리 서버(WebRTC 등)를 거쳐 다른 참여자에게 전달하는 것은 "서비스가 명시적으로 허용한 방식"(임베드 재생, 각자 로컬 재생)이 아니라 우리가 임의로 구축한 별도의 재전송 경로이므로 이 예외에 해당하지 않는다.
- "License to Other Users" 절: 다른 사용자의 Content에 대해 "only as enabled by a feature of the Service (such as video playback or embeds). ... this license does not grant any rights or permissions for a user to make use of your Content independent of the Service." — 이는 업로더가 부여하는 라이선스 범위에 관한 조항이라 시청자 간 중계에 직접 적용되는 조항은 아니지만, "서비스가 제공하는 기능(재생/임베드) 밖에서 Content를 이용할 권리는 없다"는 전체 취지를 재확인한다.
- 추가로 YouTube API Services 이용약관(`developers.google.com/youtube/terms/api-services-terms-of-service`) 쪽에도 "sell, purchase, lease, lend, convey, redistribute, or sublicense all or any portion of YouTube API Services"를 금지하는 조항과 "no rights or licenses are granted to reproduce or distribute audiovisual content or make audiovisual content available in any manner other than through the use of the YouTube API Services in accordance with the Agreement"(Section 16.3)라는 조항이 있는 것으로 확인된다 — **다만 이 API 약관 쪽 인용은 WebFetch 요약을 통한 재확인이라 원문 조항 번호·정확한 문구는 구현 착수 전 원문 재대조를 권고**(확실성: 중간). 반면 위에서 인용한 일반 YouTube 이용약관(메인 ToS) 조항은 PDF 원문을 직접 읽어 확인했으므로 확실성이 높다.
- 참고 정황: 최근 Google은 YouTube Premium **가족 요금제의 "같은 가구" 요건 위반(타인과 계정 공유)** 을 실제로 단속하기 시작했다(경고 메일 발송 후 14일 뒤 혜택 정지). 이는 계정/구독 경계를 넘어선 이용을 Google이 실제로 모니터링·집행하고 있다는 정황 근거이며, "호스트의 유료 혜택을 참여자들에게 우회적으로 나눠준다"는 우리 모델의 정신과 유사한 종류의 위반이 실제로 단속 대상이 되고 있음을 보여준다(확실성: 중간 — 가족 요금제 단속 사례이지 우리 시나리오에 대한 직접 사례는 아님).

**결론**: 이 모델은 YouTube 메인 이용약관에서 "개인적·비상업적 시청"만 허용하고 "다른 사람에게 음악을 스트리밍하는 것"을 명시적으로 금지한 조항에 정면으로 저촉될 가능성이 매우 높다. Spotify 때와 달리 이번에는 "확인 필요"가 아니라 **원문에서 우리 시나리오를 거의 그대로 지목한 명시적 금지 문구를 확인**했다.

### 6-2. 기술적 가능성 조사

호스트 기기에서의 캡처 방식은 크게 두 갈래로 나뉜다.

**(A) 호스트가 YouTube 공식 앱을 사용하는 경우 (우리 앱과 별개 프로세스)**
- Android: 다른 앱의 오디오를 캡처하려면 `MediaProjection` + `AudioPlaybackCaptureConfiguration`(Android 10/API 29+)이 필요하며, 캡처 대상 앱이 `android:allowAudioPlaybackCapture`를 명시적으로 `false`로 설정하지 않은 경우에만 가능하다(기본값은 `true`이지만, YouTube 공식 앱이 실제로 이 값을 어떻게 설정해 두었는지는 **확인 필요** — 상업 스트리밍 앱들이 저작권 보호 목적으로 이 값을 `false`로 두는 경우가 흔하다).
- iOS: 다른 특정 앱 하나를 지정해 그 앱의 오디오만 캡처하는 공식 API 자체가 **존재하지 않는다**. `ReplayKit`의 브로드캐스트 확장(Broadcast Upload Extension)으로 기기 전체 화면/오디오를 캡처할 수는 있으나, 이는 "특정 앱"이 아니라 "그 순간 기기에서 나오는 모든 소리"를 잡는 방식이라 정밀도가 떨어지고, 사용자가 시스템 UI를 거쳐 브로드캐스트를 명시적으로 시작해야 한다. 이 방식으로 타사 앱 콘텐츠를 재중계하는 목적의 기능은 App Store 심사에서 거부될 개연성이 있다(단, 이는 Apple 심사 가이드라인의 특정 조항을 직접 인용한 것은 아니며 **확인 필요**로 분류한다).

**(B) 호스트가 (섹션 2에서 제안한) 우리 앱 안의 WebView 임베드 IFrame Player를 사용하는 경우 (우리 앱과 같은 프로세스)**
- 이 경우 오디오/비디오가 "다른 앱"이 아니라 "우리 앱 자신"의 프로세스 안에서 재생되므로, 앱 자신의 재생을 캡처하는 것은 기술적으로 상대적으로 쉽다 — Android는 자기 자신의 오디오를 캡처하는 데 특별한 시스템 권한 장벽이 없고, iOS도 `ReplayKit`으로 자기 앱 내 화면/오디오를 녹화하는 인앱 캡처가 가능하다.
- 다만 이는 어디까지나 **일반적인(유료 영화 대여 등이 아닌) 통상적 YouTube 동영상**이 하드웨어 DRM(FairPlay/Widevine) 없이 서비스된다는 전제에서 성립한다. 만약 특정 콘텐츠가 DRM으로 보호되어 있다면, iOS에서는 FairPlay가 적용된 화면은 캡처 시 검은 화면으로 나오는 것으로 알려져 있다(단, 이 경우도 오디오 자체는 캡처되는 사례가 보고되어 있어 오디오만 필요한 우리 목적에는 완전한 차단이 아닐 수 있음). 일반 YouTube 동영상·뮤직비디오 대부분이 이런 하드웨어 DRM을 쓰는지는 콘텐츠별로 다를 수 있어 **실기기 검증이 필요**(확인 필요).
- 종합하면: **순수 기술적 캡처 가능성만 놓고 보면, "우리 앱 프로세스 안에서 재생 중인 콘텐츠를 캡처하는 것"은 Spotify의 App Remote SDK 모델(콘텐츠가 항상 별도의 공식 Spotify 앱 프로세스 안에 격리됨)보다 상대적으로 더 열려 있을 가능성이 있다.**

**(C) 캡처 이후, 다른 참여자에게 실시간 중계하려면**
- 저지연이 핵심 요구사항이므로 RTMP/HLS 같은 방식(수 초 지연)은 부적합하고, **WebRTC 기반 SFU(Selective Forwarding Unit, 예: mediasoup/LiveKit/Janus) 구조**가 사실상 유일한 실용적 선택지다. 호스트가 캡처한 미디어를 SFU에 publish하고, 나머지 참여자들이 subscribe하는 구조로 수백 ms 이내 지연을 노릴 수 있다.
- 이는 프로젝트가 어차피 검토할 법한 음성/영상 통화 인프라와 기술 스택이 겹치므로 "새로운 기술을 도입해야 하는" 부담은 크지 않다. 다만 (1) 호스트 1인의 업로드 대역폭/기기 성능이 전체 세션 품질의 단일 병목·단일 장애점이 되고, (2) 서버가 오디오/비디오 트래픽을 중계해야 하므로 "각자 로컬 재생 + 명령만 동기화"하는 기존 모델보다 인프라 비용이 유의미하게 커진다는 트레이드오프가 있다.

### 6-3. Spotify 사례와의 비교

| 항목 | Spotify | YouTube |
|---|---|---|
| ToS상 재배포/중계 금지 명시 여부 | 명시적("You agree that you will not redistribute, sell or transfer the Spotify Service or the Content", "personal, non-commercial use"만 허용) — Spotify 공식 이용약관(`spotify.com/legal/end-user-agreement`) 직접 확인, 확실성 높음 | 명시적, 그리고 **우리 시나리오를 사실상 그대로 예시로 든 문구**("you may not publicly screen videos or stream music from the Service") — YouTube 공식 이용약관 PDF 원문 직접 확인, 확실성 높음 |
| 캡처의 기술적 난이도 | 매우 높음 — App Remote SDK 구조상 재생이 항상 별도의 공식 Spotify 앱 프로세스 안에 격리되어, 우리 앱이 그 오디오 파이프라인에 접근할 합법적 방법이 없음(별도 앱 오디오를 캡처하려면 OS 레벨 시스템 캡처 API + 대상 앱의 캡처 허용 필요, Spotify 앱이 이를 허용해 뒀을 가능성은 낮을 것으로 추정 — 확인 필요) | 상대적으로 낮음 — 우리 앱 자체 WebView 임베드로 재생한다면 "자기 앱 프로세스 안" 캡처이므로 기술 장벽이 더 낮음(단, 콘텐츠별 DRM 여부는 실기기 확인 필요) |
| 종합 리스크 | ToS 위반 확실 + 기술적으로도 사실상 불가능 | ToS 위반 확실(오히려 문구가 더 직접적) + 기술적으로는 시도 자체는 가능할 수 있음 |

**결론**: 기술적 실현 가능성만 보면 YouTube 쪽이 Spotify보다 다소 더 열려 있을 수 있으나(우리 앱 프로세스 내 재생이라는 구조 때문), **정책/ToS 위반 리스크는 YouTube가 Spotify와 동등하거나 오히려 더 명확하게 확인되었다** — YouTube 이용약관은 "다른 사람에게 음악을 스트리밍하는 것"을 별도 예시로 들어 금지하고 있어, 오히려 우리 시나리오에 가장 직접적으로 들어맞는 금지 문구를 가진 쪽은 YouTube다. "기술적으로 더 쉬워 보인다"는 이유로 채택할 근거가 되지 않는다 — 오히려 "쉽게 구현할 수 있는데 정책 위반이 명백하다"는 조합은 나중에 발각 시 계정/API 접근 정지, 서비스 신뢰도 훼손 등의 리스크를 실제로 실행에 옮기기 쉽게 만든다는 점에서 더 위험하다고도 볼 수 있다.

### 6-4. 권고안

**채택 불가 권고 (Spotify와 동일한 결론).**

- YouTube 이용약관은 "개인적·비상업적 시청"만 허용하고 "다른 사람에게 스트리밍하는 것"을 명시적으로 금지하는 문구를 갖고 있어(6-1), 기술적 실현 가능성(6-2)과 무관하게 이 모델은 정책 위반이 사실상 확정적이다.
- 기술적으로 "우리 앱 프로세스 내 재생 캡처"가 Spotify보다 쉬워 보인다는 점(6-2, 6-3)은 오히려 "구현하기 쉬운 정책 위반"이라는 점에서 리스크를 낮추는 근거가 아니라 높이는 근거로 봐야 한다.
- 따라서 Spotify와 마찬가지로 YouTube에 대해서도 "호스트 단독 유료 계정 + 오디오/비디오 중계" 모델은 채택하지 않는다. 이미 6절 이전(`제안` 절, 대안 A)에 정리한 "각자 로컬 임베드 재생 + 재생 명령/타임스탬프만 서버가 중계" 모델을 YouTube의 유일한 실행 방향으로 유지한다.
- 참고로 참여자 전원이 YouTube Premium이어야 하는지 여부는 이 결론과 별개다 — 각자 로컬로 재생하는 모델에서는 광고 노출 여부만 각자의 Premium 가입 여부에 달려 있을 뿐, 세션 참여 자체(재생 명령 동기화)에는 Premium이 필수 조건은 아니다(Spotify처럼 "곡 지정 재생 자체가 막히는" 제약은 YouTube Data API/IFrame Player 쪽에는 없음). 이 부분은 기존 문서 4)절/`06-mvp-scope-and-tech-stack.md`와 일관된다.
- 이번 조사로 얻은 새로운 시사점: 만약 향후 다른 서비스(예: Apple Music 등)에 대해서도 유사한 "호스트 중계" 아이디어가 제안된다면, 매번 개별 서비스의 이용약관에서 "개인적 시청/재배포 금지" 문구를 먼저 찾아 확인하는 것이 이 모델의 채택 가능 여부를 가장 빠르게 판별하는 방법이라는 점을 리더/사용자에게 참고로 남긴다.

## 참고자료
- YouTube IFrame Player API Reference: https://developers.google.com/youtube/iframe_api_reference
- YouTube Embedded Players and Player Parameters: https://developers.google.com/youtube/player_parameters
- YouTube API Services - Developer Policies: https://developers.google.com/youtube/terms/developer-policies
- YouTube API Services - Required Minimum Functionality: https://developers.google.com/youtube/terms/required-minimum-functionality
- YouTube Android Player API 단종 관련 논의(GitHub): https://github.com/davidohayon669/react-native-youtube/issues/554
- youtube-ios-player-helper 아카이브 공지(GitHub): https://github.com/youtube/youtube-ios-player-helper/issues/76
- YouTube Premium 혜택 안내(공식): https://support.google.com/youtube/answer/6308116
- YouTube 임베드 광고 증가(2024) 및 서드파티 광고차단 단속 관련: https://www.theregister.com/2024/04/16/youtube_ad_blocking/ , https://phonearena.com/news/youtube-cracks-down-third-party-apps-blocking-ads_id157353
- Google OAuth 임베디드 웹뷰 차단 공지: https://developers.googleblog.com/upcoming-security-changes-to-googles-oauth-20-authorization-endpoint-in-embedded-webviews/ , https://auth0.com/blog/google-blocks-oauth-requests-from-embedded-browsers/
- 유튜브 멀티기기 리모컨 기능(공식 앱 전용) 참고: https://www.androidcentral.com/apps-software/youtube/youtube-update-remote-control

### 6절(호스트 단독 중계 모델 검토) 관련 추가 참고자료
- YouTube 이용약관(메인 ToS, PDF 원문, 2023-12-15 발효): https://yt-terms.static.usercontent.goog/pdf/terms/20231215/en_us_20231215.pdf / 웹 버전: https://www.youtube.com/static?template=terms
- YouTube API Services Terms of Service: https://developers.google.com/youtube/terms/api-services-terms-of-service
- YouTube Premium 가족 요금제 "동일 가구" 단속 관련 보도: https://www.tomsguide.com/entertainment/streaming/youtube-follows-netflix-and-quietly-rolls-out-account-sharing-restrictions-heres-what-we-know
- Android 오디오 재생 캡처(Android 10, `AudioPlaybackCaptureConfiguration`) 공식 가이드: https://developer.android.com/media/platform/av-capture , 공식 블로그: https://android-developers.googleblog.com/2019/07/capturing-audio-in-android-q.html
- iOS FairPlay 보호 콘텐츠의 화면 캡처(검은 화면) 관련 Apple 개발자 포럼 논의: https://developer.apple.com/forums/thread/63725 , https://developer.apple.com/forums/thread/86521
- Spotify 이용약관(재배포·개인적 이용 제한 조항): https://www.spotify.com/us/legal/end-user-agreement/plain/
