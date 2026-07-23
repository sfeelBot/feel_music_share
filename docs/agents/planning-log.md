# 기획(Planning) 작업 로그

작업 시작/종료 시 아래 형식으로 항목을 **추가**한다 (append-only, 기존 내용 삭제 금지).

```
## YYYY-MM-DD
- 작업: ...
- 상태: 진행중 | 완료 | 블로커
- 산출물: ...
- 비고: ...
```

## 2026-07-23
- 작업: 프로젝트 최초 기획서 작성 시작. 기능 명세/사용자 스토리 정리, Spotify Web API/SDK 및 YouTube(Premium) 연동 가능성 리서치, MVP 범위 권고안 도출 예정.
- 상태: 진행중
- 산출물: (작성 예정) docs/specs/ 하위 문서들
- 비고: 사용자는 우선순위 지정 없이 "작성 시작해"만 지시. Spotify/YouTube 둘 다 다루되 MVP 범위는 기획 에이전트 판단으로 제안.

## 2026-07-23
- 작업: 기획서 초안(v1) 작성 완료. (1) 프로젝트 개요·문서 인덱스, (2) 에픽별 기능 명세/사용자 스토리, (3) Spotify Web API/SDK 리서치(App Remote SDK가 실질적 유일 경로, 전원 Premium 필요, Web Playback SDK는 모바일 네이티브에 부적합), (4) YouTube(Premium) 연동 리서치(YouTube Data API는 재생 제어 불가·메타데이터 전용, YouTube Music 공식 API 부재, 네이티브 재생 SDK 전부 단종/아카이브, WebView+IFrame Player API가 유일한 공식 우회 경로, 임베드 환경에서 Premium 무광고 보장 여부는 확인 필요·불리한 정황 다수, Google OAuth 임베디드 웹뷰 전면 차단 확인), (5) 저지연 재생 동기화 아키텍처 초기 방향(로컬 재생 + 서버 기준 시계 host-follower 모델 제안), (6) Spotify vs YouTube 리스크 비교표 및 MVP 범위 권고(Spotify 우선, YouTube는 2차 단계로 미룰 것을 권고) + 기술 스택 후보(모바일 프레임워크/백엔드·실시간 동기화 기술, 최종 확정은 미결정 상태로 남김).
- 상태: 완료
- 산출물:
  - docs/specs/00-overview.md
  - docs/specs/01-user-stories.md
  - docs/specs/02-spotify-integration.md
  - docs/specs/03-youtube-integration.md
  - docs/specs/04-playlist.md
  - docs/specs/05-sync-architecture.md
  - docs/specs/06-mvp-scope-and-tech-stack.md
- 비고: (1) 기술 스택은 후보 제안일 뿐 확정 아님 — 사용자 결정 필요. (2) YouTube의 "임베드 환경에서 Premium 무광고 보장 여부"는 공식 문서로 확답을 찾지 못해 "확인 필요"로 명시했고, 실기기 실측 스파이크를 YouTube 착수 전 선행 조건으로 제안함. (3) MVP는 Spotify만 우선 지원하고 YouTube는 2차로 미루는 것을 권고하나 최종 결정은 사용자/리더 몫. (4) 재생 동기화 목표 오차 수치는 근거 없이 확정하지 않고 구현 단계 프로토타입 실측 이후로 미룸. (5) 커밋은 하지 않았음 — 리더가 사용자와 확인 후 처리할 것.

## 2026-07-23 (추가)
- 작업: 신규 아이디어("호스트 단독 유료 계정 + 오디오/비디오 중계" 모델) 조사. Spotify에 대해서는 이미 사용자가 기각·기존 기조(전원 Premium) 유지를 결정한 상태였고, 이번엔 동일 모델이 YouTube(Premium)에 대해서도 성립하는지 조사 요청받음. (1) YouTube 공식 이용약관 PDF 원문(2023-12-15 발효본)을 직접 대조해 "personal, non-commercial use"만 허용하고 "you may not publicly screen videos or stream music from the Service"라는, 우리 시나리오를 사실상 그대로 지목한 명시적 금지 문구를 확인함(확실성 높음). (2) 기술적으로는 iOS/Android의 앱 간 오디오 캡처 제약(Android AudioPlaybackCaptureConfiguration, iOS는 특정 타사 앱 오디오만 캡처하는 공식 API 부재, FairPlay 보호 콘텐츠 캡처 시 검은 화면 등)과, 캡처 이후 저지연 중계를 위한 WebRTC/SFU 구조의 개략적 요구사항을 정리함. (3) 호스트가 우리 앱 자체 WebView 임베드로 재생하는 경우(같은 프로세스 내 재생)라면 캡처 자체의 기술 난이도는 Spotify App Remote 모델(항상 별도의 공식 앱 프로세스에 재생이 격리됨)보다 낮을 수 있다는 점을 확인했으나, ToS 위반이 명확하므로 채택 근거가 되지 않는다고 결론. (4) Spotify 쪽도 공식 이용약관에서 "will not redistribute, sell or transfer the Spotify Service or the Content" 조항을 직접 확인해 재인용하고, 이번 결정을 02-spotify-integration.md에 의사결정 기록으로 남겨 향후 동일 논의 반복을 방지함.
- 상태: 완료
- 산출물:
  - docs/specs/03-youtube-integration.md (6절 "호스트 단독 유료 계정 + 오디오/비디오 중계 모델 검토" 추가, 참고자료 보강)
  - docs/specs/02-spotify-integration.md (5절 "의사결정 기록: 호스트 단독 Premium + 오디오 중계 모델 검토 및 기각" 추가, 참고자료 보강)
- 비고: (1) 결론: YouTube에서도 이 모델은 채택 불가로 권고. Spotify와 동일한 결론(기각)이나 근거의 성격은 다르다 — Spotify는 "ToS 위반 확실 + 기술적으로도 거의 불가능"인 반면, YouTube는 "ToS 위반이 오히려 더 직접적으로 명시(우리 시나리오를 예시로 듦) + 기술적으로는 시도 자체는 상대적으로 더 쉬울 수 있음"이라는 조합이라, "쉬워 보인다고 채택 근거가 되지 않는다"는 점을 명확히 함. (2) YouTube API Services 이용약관 쪽 일부 인용(Section 16.3 등)은 WebFetch 요약을 통한 재확인이라 확실성이 중간 등급 — 구현 착수 전 원문 재대조 권고. 반면 메인 YouTube 이용약관(PDF)과 Spotify 이용약관은 원문을 직접 확인해 확실성 높음. (3) 기존 문서(00~06)의 다른 결론(YouTube는 각자 로컬 재생 + 명령 동기화 모델 유지, MVP는 Spotify 우선 등)은 변경 없음 — 이번 조사는 새 대안을 검토·기각한 기록을 추가한 것뿐임. (4) 커밋하지 않았음 — 리더가 사용자 확인 후 처리할 것.

## 2026-07-23 (추가 2)
- 작업: 03-youtube-integration.md 3)절에서 "확인 필요"로 남겨뒀던 단일 질문 심화 조사 — "세션 참여자 전원이 각자 Premium이면, 우리 앱(서드파티 임베드/재생 환경)에서 광고 없이 재생되는가?" 범위를 좁혀 (1) IFrame Player API 공식 문서/이슈트래커에서 로그인 세션→광고 제거 여부 명시 언급, (2) WebView 임베드가 아니라 기기 설치 공식 YouTube 앱으로 딥링크/인텐트를 넘겨 재생을 위임하는 경로에서 Premium 혜택 적용 여부, (3) 개발자 커뮤니티(Stack Overflow/Reddit/GitHub 이슈)의 실사용 경험담을 조사.
- 상태: 진행중 (조사 착수, 결과는 종료 로그에 기록)
- 산출물: (작성 예정) docs/specs/03-youtube-integration.md 신규 절
- 비고: 리더의 명시적 범위 축소 지시 — 이 질문 하나만 확인하고 곁가지 논의 없이 종료.

## 2026-07-23 (추가 3)
- 작업: Spotify/YouTube 외 "참여자 전원이 무료(유료 구독 없이)로 정식 곡을 공유해서 들을 수 있는" 대안 서비스 리서치 착수. SoundCloud, Deezer, Apple Music, Audius, Jamendo, Free Music Archive/ccMixter, Tidal/Napster 등 후보를 각각 (1) 전곡 무료 스트리밍 여부 (2) 공식 API/SDK로 원격 재생 제어 가능 여부 (3) 메인스트림 상업 음악 카탈로그 포함 여부 (4) ToS상 다중 사용자 동기화 재생 허용 여부 기준으로 조사 예정. 다른 서브에이전트(디자인/구현/YouTube 광고 재확인)와 병행 진행 중이라 신규 파일(07) 위주로 작업하고 06 파일은 append만 함.
- 상태: 진행중
- 산출물: (작성 예정) docs/specs/07-alternative-services.md
- 비고: 리더의 명시적 지시로 06-mvp-scope-and-tech-stack.md는 훼손 없이 참조 링크만 추가할 예정. 커밋은 하지 않음.

## 2026-07-23 (추가 4)
- 작업: 대안 서비스 조사 완료. SoundCloud/Deezer/Tidal/Apple Music/Audius/Jamendo/Free Music Archive·ccMixter/Amazon Music/Napster/Bandcamp 총 10개 서비스를 (1)전곡 무료 재생 여부 (2)공식 API 재생 제어 가능 여부 (3)메인스트림 상업 카탈로그 포함 여부 (4)ToS상 다중 사용자 동기화 재생 허용 여부 기준으로 비교표·상세분석 작성. 핵심 발견: 완전 무료 서비스(Audius, Jamendo, FMA/ccMixter)는 CC 라이선스/인디 카탈로그에 국한되어 메인스트림 인기곡이 없고, 메인스트림 카탈로그를 가진 서비스(Deezer, Tidal, Apple Music)는 전곡 재생에 예외 없이 최종 사용자 유료 구독을 요구(Spotify와 동일 구조, API 문서/개발자 포털에서 직접 확인). SoundCloud는 유일한 중간 지점이나 인기곡일수록 API 접근이 Go+ 전용으로 차단되는 경향 + API 이용약관의 "다중 사용자 콘텐츠를 집계한 온디맨드 리스닝 서비스" 금지 조항과의 충돌 가능성(법률 자문 없이는 확정 불가)이 있음. Amazon Music은 API가 비공개 베타, Napster는 2026년 1월 서비스 자체 종료, Bandcamp는 서드파티 스트리밍 API 자체가 폐쇄되어 각각 논외 처리. 결론: 3개 조건(전원무료+메인스트림+재생제어)을 모두 만족하는 서비스는 발견되지 않았으며, 이는 메이저 레이블 라이선스 비용을 광고/구독 중 하나로 회수해야 하는 업계 구조상 필연적임을 설명. 권고 3안(A: 기존 Spotify 중심 유지/B: 카탈로그 포기하고 완전무료 서비스로 제품 컨셉 재정의/C: SoundCloud 절충안, 비권장)을 제시하고 A를 기획 에이전트 의견으로 제안.
- 상태: 완료
- 산출물:
  - docs/specs/07-alternative-services.md (신규)
  - docs/specs/06-mvp-scope-and-tech-stack.md (말미에 요약·링크 참조만 추가, 기존 내용 변경 없음)
- 비고: (1) 최종 결론은 "전원 무료 + 정식 메인스트림 곡 공유"라는 요구사항 자체가 현재 음악 산업 라이선스 구조상 어떤 서비스를 골라도 사업 모델 층위에서 막혀 있다는 것 — 사용자에게 이 트레이드오프를 명확히 알리고 A/B/C 중 방향을 재확인받을 것을 리더에게 제안. (2) SoundCloud의 ToS "온디맨드 리스닝 서비스 집계 금지" 조항 해석은 회색지대로 명시했고, 실채택 검토 시 법률 자문 및 각 서비스 최신 약관 원문 재대조를 선행 조건으로 제안함(문서 내 "참고자료" 말미에 주의 문구로 명시). (3) 다른 서브에이전트(디자인/구현/YouTube 광고 재확인)와 병행 작업이라 07 신규 파일 위주로 작업했고 06은 append만 함. (4) 커밋하지 않았음 — 리더가 사용자 확인 후 처리할 것.

## 2026-07-23 (추가 5)
- 작업: "추가 2" 항목("세션 참여자 전원이 각자 Premium이면, 우리 앱에서 광고 없이 재생되는가?") 심화 조사 완료. (1) YouTube 공식 도움말 "Ads on embedded videos"(support.google.com/youtube/answer/132596) 원문 대조 — 시청자 로그인/Premium 여부에 대한 언급이 전혀 없고, 광고 노출은 영상 제작자의 수익화 설정에만 연동됨을 확인. (2) 프라이버시 강화 모드(youtube-nocookie.com)에서도 광고 자체는 유지되고 개인화 여부만 달라진다는 자료 확인 — "로그인 세션이 임베드 광고를 없앤다"는 가설에 불리한 정황. (3) 2008년에 등록된 "임베드 플레이어에 인증 토큰 파라미터를 달라"는 기능 요청(issuetracker.google.com/issues/35166088)이 지금까지 공식 파라미터로 채택되지 않았음을 확인(정황 증거, 이슈트래커 원문 로그인 필요로 전체 미확인 — 확실성 낮음으로 표기). (4) 2023년 임베디드 웹뷰 OAuth 전면 차단(기존 3절 사실)과 결합하면, 우리 앱의 WebView 안에서는 애초에 Premium 세션 자체를 새로 인증시킬 방법이 없다는 점이 결정적 근거. (5) Stack Overflow/Reddit/Quora 등에서 "임베드 플레이어 + Premium 로그인으로 광고가 사라졌다"는 검증 가능한 실사용 보고는 찾지 못함(비공식·미검증 주장 1건은 근거 부족으로 결론에 미반영). (6) 별도 경로로 "기기에 이미 설치·로그인된 공식 YouTube 앱으로 딥링크/인텐트를 넘겨 재생을 전적으로 위임"하는 방식은 (진짜 네이티브 앱을 그대로 쓰는 것이므로) 광고 없이 재생됨을 확인했으나, 이 경로는 우리 앱이 재생을 전혀 제어할 수 없어 핵심 요구사항(저지연 동기화)과 양립 불가함을 확인.
- 상태: 완료
- 산출물: docs/specs/03-youtube-integration.md (7절 "단일 질문 심화 검증" 신규 추가, 참고자료 보강)
- 비고: (1) 최종 결론 — 우리가 채택하려는 아키텍처(WebView+IFrame 임베드, 대안 A) 기준으로는 (a) "전원 Premium이어도 광고가 뜰 가능성이 높다"로 판정(확실성: 중간~높음, 100% 확정 공식 문구는 못 찾음). 네이티브 앱 딥링크 위임 경로는 (b)에 해당하나 동기화 요구사항을 포기해야 하므로 실질적 대안 아님. (2) 기존 3절의 "확인 필요" 결론과 방향은 일치하되 근거를 구체화하고 확실성 등급을 "중간~높음"으로 상향함. (3) 여전히 100% 확정을 위해서는 구현 착수 전 실기기 스파이크 테스트를 재차 권고함(기존 권고와 동일, 변경 없음). (4) 커밋하지 않았음 — 리더가 처리할 것.
