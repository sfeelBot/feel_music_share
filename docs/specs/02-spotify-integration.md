# 02. Spotify 연동 리서치 및 제약

> 상태: v1 (2026-07-23) + 5절 추가(2026-07-23, 같은 날 — "호스트 단독 Premium + 오디오 중계" 모델 검토/기각 기록)
> 리서치 근거: Spotify for Developers 공식 문서, Spotify Community 포럼, Spotify Engineering 블로그, Spotify 공식 이용약관 (2026-07-23 기준 WebSearch/WebFetch로 확인)

## 배경

Spotify는 공식적으로 서드파티 앱이 재생을 제어할 수 있는 SDK/API를 제공한다. 다만 "제어"의 의미와 "실제 오디오가 어디서 재생되는가"를 정확히 구분해야 아키텍처를 잘못 설계하지 않는다.

## 요구사항 대비 조사 결과

### 1) 사용 가능한 공식 수단

| 수단 | 용도 | 실제 오디오 재생 위치 | 비고 |
|---|---|---|---|
| **Web API** (`/v1/me/player/*`) | 재생/일시정지/탐색/디바이스 전환/현재 재생 정보 조회 등 REST 제어 | 사용자가 지정한 디바이스(Spotify 앱, Spotify Connect 기기, Web Playback SDK 인스턴스 등) | HTTP 폴링 기반. 실시간 push 아님 |
| **App Remote SDK** (iOS/Android) | 모바일 앱에서 기기에 설치된 **Spotify 공식 앱**을 백그라운드 서비스처럼 원격 제어 (재생/일시정지/곡 전환, 현재 트랙·재생위치 상태 구독) | **Spotify 공식 앱 프로세스 내부** (우리 앱 프로세스 아님) | 우리 앱은 오디오 스트림 자체를 다루지 않음. Spotify 앱이 백그라운드에서 재생 |
| **Web Playback SDK** (JS, 브라우저 전용) | 브라우저(웹페이지) 안에서 Spotify Connect 기기처럼 동작하며 직접 오디오 스트리밍/재생 | 브라우저 탭 내부 (EME/DRM 사용) | 모바일 네이티브 앱에는 해당 없음. iOS Safari는 iOS 13.4+부터 EME 지원되지만, 오토플레이 제약과 크로스오리진 iframe 정책(`encrypted-media`, `autoplay` 허용 필요) 등 모바일 특유 제약 존재 |
| **Spotify Connect** | "재생 디바이스"를 다른 기기로 전환 | 전환 대상 기기 (스피커, 다른 앱 등) | App Remote/Web API와 조합해 활용 가능하나 참여자마다 별도 기기 제어 개념이라 우리의 "여러 사람, 각자 로컬 재생" 시나리오와는 성격이 다름 |

**핵심 결론**: 모바일 네이티브 앱(iOS/Android)에서 "각 참여자 기기에서 로컬로 음악이 실제 재생되게" 하려면 사실상 **App Remote SDK**가 유일한 실질적 경로다. 이는 반드시 각 참여자의 단말기에 **Spotify 공식 앱이 설치되어 있어야** 동작한다(App Remote는 설치된 Spotify 앱과 IPC로 통신하는 구조).

### 2) 레거시 SDK 이력 (참고)

- 2014년 출시된 구 "Mobile (Streaming) SDK"는 2022년 9월 1일부로 사실상 종료(sunset)되었고, Spotify는 이후 App Remote SDK로 이전할 것을 공식 권고했다. 즉 현재 유효한 경로는 App Remote SDK뿐이며, 별도의 "우리 앱 프로세스 안에서 직접 오디오 디코딩/스트리밍"을 하는 공식 SDK는 더 이상 존재하지 않는다.
- 이는 처음부터 "Spotify 오디오를 우리 서버/우리 앱이 직접 스트리밍한다"는 설계가 애초에 성립하지 않음을 의미한다 — 이 프로젝트 성격상 문제는 없다(우리는 로컬 재생 + 동기화 모델을 취할 것이므로).

### 3) 계정/라이선스 제약

- Web API 기반 재생 제어(`/me/player/play` 등 on-demand 재생)는 **Premium 계정에서만 동작**한다. Free 계정은 임의 트랙 재생을 요청할 수 없다(셔플 전용 등 제한).
- App Remote SDK도 실질적으로 곡 지정 재생은 Premium 전제다. 앱은 재생 시도 전에 Web API의 사용자 정보(구독 등급)를 조회해 Premium 여부를 확인하고 안내해야 한다.
- → **방의 모든 참여자가 Spotify Premium이어야** 한다는 CLAUDE.md의 전제가 리서치로 확인됨.

### 4) 상태 구독 및 지연 특성

- App Remote SDK는 플레이어 상태(현재 트랙, 재생 위치, 재생 중 여부 등)를 **구독(subscribe) 콜백**으로 push 방식 수신 가능 — Web API를 폴링하는 것보다 지연이 낮다.
- 다만 콜백은 Spotify 앱 → App Remote 라이브러리 → 우리 앱 순으로 전달되며, 정확한 push 주기(예: 몇 ms 단위인지)는 공식 문서에 수치가 명시돼 있지 않음 — **확인 필요**: 실측은 프로토타입 단계에서 검증 권고.
- 다중 참여자 동기화의 기준 시계는 "방장 기기의 App Remote 재생 위치"가 되고, 나머지 참여자는 자신의 App Remote로 seek 명령을 보내 맞추는 host-follower 구조가 자연스럽다 (`05-sync-architecture.md` 참고).

## 제약/리스크

1. **Spotify 공식 앱 설치 필수** — 참여자가 Spotify 앱을 지우면 기능이 동작하지 않는다. 앱 미설치 시 스토어 유도 안내가 필요하다.
2. **전원 Premium 필요** — Free 계정 참여자는 곡 선택 재생이 불가하므로 세션 참여 자체를 제한하거나 "듣기 전용" 등 제한된 역할로 강등하는 정책이 필요하다 (기획 결정 필요 — 사용자 확인 요망).
3. **App Remote 연결 안정성** — iOS/Android OS의 백그라운드 프로세스 정책(배터리 최적화, 앱 강제 종료 등)에 따라 Spotify 앱과의 연결이 끊길 수 있음. 재연결 로직 필요.
4. **Rate Limit** — Web API는 Rate Limit이 존재한다(정확한 수치는 애플리케이션 등급별로 상이 — **확인 필요**, 구현 단계에서 Spotify Developer 대시보드의 앱 등급에 따라 재확인). 다인원 세션에서 폴링 방식(Web API)에 과도하게 의존하면 제한에 걸릴 수 있으므로 App Remote의 push 구독을 우선 사용.
5. **Spotify Developer 앱 등록 심사** — Web API/SDK를 상용 서비스에 쓰려면 Spotify 앱 등록 및 확장 사용량(quota extension) 심사를 받아야 할 수 있다. 정확한 심사 기준/소요기간은 **확인 필요** — 배포 단계 이전에 재확인 권고.
6. **iOS 특유 제약** — App Remote iOS SDK는 커뮤니티 포럼에 인증 오류 사례들이 다수 보고되어 있어(예: 인증 재발급 이슈), 구현 단계에서 최신 SDK 버전 기준으로 재검증이 필요하다.

## 제안

1. **아키텍처 방향**: 각 참여자 단말 = App Remote SDK로 로컬의 Spotify 앱을 제어하는 "재생 노드". 우리 백엔드/실시간 채널은 오디오가 아니라 "재생 명령 + 상태(트랙 ID, 위치, 재생여부, 타임스탬프)"만 중계한다 (상세 `05-sync-architecture.md`).
2. **Premium 게이팅**: 로그인 시 Web API로 구독 등급을 조회해 Free 계정은 방 생성/참여 전 안내 화면을 노출하는 정책을 제안한다. 최종 정책(제한 vs 강등)은 사용자 확인 필요.
3. **모니터링 지표**: 구현 단계에서 App Remote 상태 콜백의 실제 지연/빈도를 측정하는 프로토타입(스파이크) 작업을 가장 먼저 수행할 것을 권고 — 이 수치가 전체 프로젝트의 "저지연 동기화" 목표 실현 가능성을 좌우하는 핵심 변수이기 때문이다.
4. Spotify 개발자 앱 등록/쿼터 확장 절차는 늦어도 MVP 구현 착수 시점에 함께 진행해야 배포 지연을 막을 수 있다.

## 5) [의사결정 기록 — 2026-07-23] "호스트 단독 Premium + 오디오 중계" 모델 검토 및 기각

사용자가 다음 대안 아키텍처를 제안하고 검토를 요청했다: 방장(호스트) 한 명만 Spotify Premium 계정을 갖고, 호스트 기기에서 실제 재생되는 오디오를 서버/앱이 캡처해 다른 참여자에게 실시간 중계(음성 통화처럼)하여, 참여자는 별도 Premium 계정 없이 함께 들을 수 있게 하는 방식.

**검토 결과 및 결정: 기각. 기존 기조(참여자 전원 Premium 필요)를 유지한다.**

근거:
1. **ToS 위반**: Spotify 이용약관은 "You agree that you will not redistribute, sell or transfer the Spotify Service or the Content"(personal, non-commercial use만 허용)라고 명시한다(`spotify.com/legal/end-user-agreement`, 확실성 높음 — 공식 페이지 직접 확인). 호스트가 재생 중인 콘텐츠를 다른 참여자에게 중계하는 것은 이 조항이 금지하는 재배포/전송에 해당할 가능성이 매우 높다.
2. **기술적 실현 가능성이 극히 낮음**: 이 문서 1)절에서 확인했듯, 모바일 네이티브 앱에서 Spotify 재생을 제어하는 사실상 유일한 공식 경로는 App Remote SDK이며, 이는 항상 **별도의 공식 Spotify 앱 프로세스** 안에서 오디오가 재생되는 구조다. 우리 앱은 그 오디오 파이프라인에 대한 접근 권한이 없고, OS 레벨에서 다른 앱의 오디오를 캡처하려면 시스템 캡처 API(Android `AudioPlaybackCaptureConfiguration` 등) + 대상 앱의 캡처 허용이 필요한데, Spotify 공식 앱이 이를 허용해 두었을 가능성은 낮을 것으로 추정된다(상용 스트리밍 앱들이 저작권 보호 목적으로 캡처를 차단해 두는 경우가 흔함 — 확인 필요이나 정황상 낮음).
3. 동일 모델을 YouTube에 대해서도 검토했으며(`03-youtube-integration.md` 6절), YouTube 쪽은 오히려 "다른 사람에게 스트리밍하는 것을 금지"하는 문구가 이용약관에 더 직접적으로 명시되어 있어 결론(기각)이 동일하게 유지됨을 확인했다. 두 서비스 모두 "호스트 단독 유료 계정 + 중계" 모델은 채택하지 않는다.

이 결정에 따라 MVP 아키텍처는 계속 "각 참여자가 자신의 기기/계정으로 로컬 재생 + 서버는 재생 명령·타임스탬프만 중계"하는 host-follower 동기화 모델을 따르며, Spotify는 참여자 전원 Premium 계정이 필요하다는 전제를 그대로 유지한다. 이 논의를 다시 반복하지 않기 위해 기록을 남긴다.

## 참고자료
- Spotify for Developers — Android SDK: https://developer.spotify.com/documentation/android
- Spotify for Developers — iOS SDK: https://developer.spotify.com/documentation/ios
- Spotify App Remote SDK (Android) 문서: https://spotify.github.io/android-sdk/app-remote-lib/
- Spotify Web API Reference: https://developer.spotify.com/documentation/web-api
- Spotify Engineering — Player API 소개: https://engineering.atspotify.com/2022/04/spotifys-player-api
- 모바일 스트리밍 SDK 종료 공지(2022): https://developer.spotify.com/blog/2022-07-15-mobile-streaming-sdks-update
- Web Playback SDK out of beta 공지: https://developer.spotify.com/blog/2021-09-13-web-playback-sdk-out-of-beta
- Spotify Community — iOS SDK App Remote 인증 오류 사례: https://community.spotify.com/t5/Spotify-for-Developers/Spotify-iOS-SDK-5-0-1-App-Remote-Authentication-Returns-error/td-p/7482096
- Spotify 이용약관(재배포·개인적 이용 제한 조항, 5절 관련): https://www.spotify.com/us/legal/end-user-agreement/plain/
