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
