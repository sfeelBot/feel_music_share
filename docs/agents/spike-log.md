# 스파이크(선행검증) 작업 로그

작업 시작/종료 시 아래 형식으로 항목을 **추가**한다 (append-only, 기존 내용 삭제 금지).

```
## YYYY-MM-DD
- 질문: ...
- 방법: 실측 | 문서/사례 조사 | 혼합
- 결과 요약: ...
- 산출물: ...
- 비고: ...
```

## 2026-07-26
- 질문: 재생 동기화 백엔드로 Firebase Realtime Database(RTDB)와 Firestore 중 무엇이 이 프로젝트(저지연 host-follower 동기화 + 구조화된 플레이리스트 쿼리)에 더 적합한가 (`docs/specs/06-mvp-scope-and-tech-stack.md`, `docs/firebase-integration-guide.md`의 미결정 항목).
- 방법: 혼합 — (1) 공식 Firebase 문서·2026년 최신 커뮤니티 비교 아티클 조사, (2) 실제 프로젝트(`feel-music-share`)에 대해 RTDB/Firestore REST API로 write→read round-trip 실측을 시도.
- 결과 요약: 실측은 불가로 판명됨 — Firestore는 REST 호출 시 `PERMISSION_DENIED`/`SERVICE_DISABLED`로 API 자체가 미활성화 상태임을 명확히 확인했고(존재하지 않는 프로젝트명으로 대조 요청 시 다른 오류(`CONSUMER_INVALID`)가 나는 것으로 "프로젝트는 있으나 서비스만 꺼짐"을 검증), RTDB도 두 호스트명 패턴 모두 404로 인스턴스 미생성 정황을 확인했다. 문서 조사 결과, 공식 문서 기준 지연시간은 RTDB "10ms 이하", Firestore "30ms 이하"로 RTDB가 여전히 더 낮게 명시되어 있고, 2026년 최신 커뮤니티 자료들도 "고빈도 소량 갱신·다수 동시 구독자에는 RTDB, 복합 쿼리·오프라인 웹 지원·대규모 확장에는 Firestore"라는 기존 통념과 같은 방향의 결론을 유지하고 있음을 확인했다. 참고용 권고로 "재생 동기화 상태=RTDB, 플레이리스트=Firestore 하이브리드" 또는 "단순화 우선 시 RTDB 단일 구성"을 제시했으나 최종 결정은 아님.
- 산출물: `docs/spikes/firebase-rtdb-vs-firestore.md`
- 비고: 실측 자체는 못 했다 — 콘솔에서 RTDB 또는 Firestore 중 최소 하나를 사용자가 먼저 활성화해야 실제 write→read round-trip 지연시간 실측이 가능하다. 이 조건이 갖춰지면 후속 스파이크로 실측을 이어갈 것을 권고했다(`docs/specs/06-mvp-scope-and-tech-stack.md`의 "후속 조치 제안"과 동일 취지).

## 2026-07-26 (매칭 신뢰도 가중치/임계값)
- 질문: 혼합(Mixed) 세션 곡 매칭 로직(`apps/mobile/src/services/matching/trackMatcher.ts`)의 가중치(artist 0.45/title 0.35/duration 0.2)와 등급 임계값(high 85/medium 60)이 09문서가 우려한 실패 케이스(동명이곡, 리마스터/라이브, 표기 차이, 피처링, 리믹스/에디트)에 상식적으로 부합하는가(`docs/roadmap.md` "매칭 신뢰도 가중치/임계값 실측 스파이크", `docs/specs/09-cross-platform-mixed-mode.md` 결정 4).
- 방법: 실측 불가로 판명 — Spotify는 PKCE 로그인이 필요해 토큰을 얻을 수 없고, Client Credentials Flow도 실제로 시도해 `invalid_client`(Client Secret 미보유, 400)로 확인했다. YouTube는 목업 검색이 5곡뿐이라 표본 부족. 대신 `trackMatcher.ts`의 순수 함수(정규화/Levenshtein/가중합)를 그대로 복사한 스크립트로 카테고리별 합성 케이스 20건을 만들어 오프라인 벤치마크를 수행했다(문서/사례 조사가 아니라 "코드 자체를 합성 입력으로 실행"한 것이라 실측도 순수 조사도 아닌 절충 — 산출물에 한계를 명시).
- 결과 요약: 핵심 안전장치(동명이곡+아티스트 완전 불일치 → 55점, medium 문턱 아래로 확실히 떨어짐)는 잘 작동함을 확인, 가중치 유지 권장. 반면 (1) 괄호 밖 대시 접미사("- Remastered", "- Live")는 title 정규화가 못 잡아 high여야 할 케이스가 medium으로 떨어짐, (2) 길이차가 작은 라이브 버전(3초)은 "Live" 신호 자체가 정규화로 지워져 실제로는 다른 레코딩인데 high(95점)로 분류되고 안내 배너 임계값(5초)도 안 넘어 사용자에게 아무 신호가 없음, (3) feat./협업 표기 차이는 82점으로 high 문턱(85)에 못 미쳐 medium에 머묾, (4) 아티스트 부분 일치(`includes()`)가 짧은 이름의 우연한 substring에도 0.6을 줘 동명이곡 오탐 위험이 남아있음(단, 사용자 확인 UI가 잔여 리스크 방어선). 결론적으로 "가중치 숫자 자체를 바꿔야 한다"는 강한 근거는 없었고, 정규화 로직 사각지대와 구조적 한계(라이브 신호 손실)가 더 명확한 개선 지점으로 드러났다.
- 산출물: `docs/spikes/matching-confidence-benchmark.md` (계산 스크립트는 세션 스크래치패드, 프로덕션 코드 미수정)
- 비고: 합성 케이스 기반이라 실제 플랫폼의 제목/아티스트 포맷 분포를 반영하지 못한다(예: 대시 접미사가 실제로 얼마나 흔한지 모름). 실측 재개에는 (a) Spotify 실기기 PKCE 로그인으로 accessToken 발급, (b) YouTube Data API v3 키 발급 후 목업 검색을 실제 API로 교체가 선행돼야 한다.

## 2026-07-27
- 질문: Docker/컨테이너 가상화로 iOS·Android 실기기(런타임, 빌드를 넘어선 설치/실행/상호작용) 검증이 가능한가 — 기존 Android는 `assembleDebug` 빌드까지만, iOS는 macOS 부재로 구조적 불가로 결론난 상태에서 "Docker로 좁혀서" 재확인.
- 방법: 혼합 — Android는 이 머신(Windows 11 Pro build 26200, AMD Ryzen 5 7500F, Docker Desktop 29.2.0/WSL2)에서 실제로 `budtmo/docker-android:emulator_11.0`을 pull·기동해 KVM 가속 부팅 → 이 프로젝트의 실제 릴리즈 debug APK(`com.mobile`) 설치·실행·화면 캡처까지 엔드투엔드 실측. iOS는 실측이 원리상 불가능한 질문이라 컨테이너/커널 공유 원리, Apple 공식 macOS SLA PDF, `docker-osx` 프로젝트 실제 작동 방식을 문서 조사.
- 결과 요약: **Android — 이 머신에서는 실제로 됨.** `/dev/kvm`이 WSL2에 이미 노출되어 있고 Docker 컨테이너에 `--device /dev/kvm`으로 통과 성공, 에뮬레이터 로그에서 `CPU Acceleration status: KVM ... usable`/`-enable-kvm` 확인(소프트웨어 폴백 아님), 부팅 36초, `adb install`로 프로젝트 실제 APK 설치 후 실행 → 온보딩 화면("같은 곡을, 같은 순간에")이 한글까지 정상 렌더링된 스크린샷 확보. 단 이 결과는 CPU/BIOS/Windows 빌드에 의존하는 환경 특이적 결과이며 다른 머신에서 재현 보장 없음(관련 GitHub 이슈로 실패 사례도 다수 확인). 대안으로 로컬 Android SDK에 emulator·AVD(`Medium_Phone_API_36.1`)가 이미 설치되어 있음도 확인(부팅은 시도 안 함, Docker보다 설정 레이어 적어 더 직접적일 가능성). **iOS — 로컬 Docker 경로는 이중으로 막혀 있음을 확인.** (1) 컨테이너는 호스트 커널 공유 구조라 macOS(XNU) 커널을 원리적으로 담을 수 없음, (2) Apple macOS SLA가 "Apple-branded computer"에서만 가상화를 허용해 라이선스로도 차단. `docker-osx`는 이름과 달리 실제로는 Docker가 QEMU 전가상화 VM을 감싸는 실행 래퍼일 뿐 컨테이너가 macOS를 도는 게 아님을 README 기준 확인 — Windows에서의 활용은 검증 안 됨.
- 산출물: `docs/spikes/docker-virtualization-for-mobile-verification.md`
- 비고: Android 실측용으로 pull한 `budtmo/docker-android:emulator_11.0` 이미지(로컬 캐시, 약 8GB)는 정리하지 않고 남겨둠(후속 재실측 시 재사용 목적). 테스트 컨테이너는 정지·삭제 완료. iOS는 조사만 가능했고(원리상 실측 불가), 클라우드 대안(GitHub Actions macOS 러너 등) 재논의는 이번 스파이크 범위 밖.

## 2026-07-27 (RTDB 활성화 후 write→read round-trip 실측 후속)
- 질문: `docs/decision-log.md`(2026-07-27)의 RTDB 단일 구성 결정 이후 후속 조치 항목 — 사용자가 오늘 실제로 활성화한 RTDB(`https://feel-music-share-default-rtdb.asia-southeast1.firebasedatabase.app/`, 리전 `asia-southeast1`)에 대해 실제 write→read round-trip 지연시간을 curl로 실측하고, 이전 스파이크가 인용한 공식 문서 수치(RTDB ≤10ms)가 이 프로젝트 실제 환경에서도 근처로 나오는지 확인.
- 방법: 실측 시도(부분적으로만 가능) — REST API(`GET`/`PUT` `.json` 경로)에 curl로 직접 요청.
- 결과 요약: 진짜 write/read는 **불가**로 판명 — 새 RTDB 인스턴스의 기본 잠금 보안 규칙(`.read`/`.write` 모두 `false`)이 그대로 적용돼 있어 GET/PUT 모두 `HTTP 401 "Permission denied"`로 거부됨(작업 지시에서 미리 예상된 시나리오와 일치, 실패 아님). 서비스 계정 키 등 인증 수단이 저장소에 없어 우회도 불가 — 규칙을 직접 열려는 시도는 범위 밖이라 하지 않음. 대신 보조로, 동일 경로에 10회 연속 GET(401 거부 응답)의 `time_total`을 측정해 **순수 네트워크 왕복시간의 하한선**을 참고 수치로 확보: 평균 약 166.6ms, 중앙값 약 168.6ms, 범위 155.8~176.9ms. 이는 실제 RTDB read/write 처리를 포함하지 않는 값이라는 점을 명확히 구분해 기록함. 해석: 공식 문서의 "≤10ms"는 서버 내부 처리 지연이지 클라이언트-서버 종단간 RTT가 아니라는 우려가 이번 실측으로 뒷받침되며, 이 머신 기준 이 리전까지의 네트워크 RTT만으로도 150~180ms대에 달해 체감 동기화 지연에 훨씬 더 큰 변수일 가능성을 시사함(권고, 결정 아님).
- 산출물: `docs/spikes/firebase-rtdb-vs-firestore.md`("2026-07-27 후속 — RTDB 활성화 후 실측" 절 추가)
- 비고: 진짜 write→read round-trip 실측은 여전히 미완료 — 사용자/리더가 (a) 보안 규칙을 짧게 테스트 모드로 완화하거나 (b) 서비스 계정 키를 발급해줘야 다음 스파이크에서 완료 가능. 이번 결과로 RTDB 단일 구성 결정 자체를 재검토할 근거는 나오지 않았음(오히려 네트워크 RTT가 지배적 변수라는 방향의 보강).

## 2026-07-28 (Google/Kakao/Naver 소셜 로그인 × Firebase Auth 연동 방법)
- 질문: `docs/decision-log.md`(2026-07-28, "로그인 방식: 간편 로그인(Google + Kakao 등) 채택")로 결정된 소셜 로그인을, Cloud Functions가 아직 없는 이 프로젝트의 기존 Firebase Auth(익명 인증) 위에 붙이는 정확한 현재(2026년 기준) 방법은 무엇인가 — 특히 Kakao/Naver처럼 Firebase 기본 제공 제공자가 아닌 경우 서버(Cloud Functions) 도입이 정말 필요한지. (작업 도중 세션 한도로 한 차례 중단됐다가 리더 요청으로 Naver까지 범위를 넓혀 재개·완료.)
- 방법: 문서/사례 조사 — Firebase/React Native Firebase/Kakao Developers 공식 문서 + 2026년 최신 커뮤니티 자료 웹 조사. 순수 추측을 피하기 위해 이 저장소의 실제 파일(`google-services.json`의 `oauth_client: []`, `android/build.gradle`의 `kotlinVersion`/`compileSdkVersion`, `package.json` 의존성 버전)을 직접 읽어 조사 결과와 대조했다. `apps/mobile/` 코드는 수정하지 않았다(순수 조사 범위).
- 결과 요약: **Google**은 Firebase 표준 제공자라 Cloud Functions 불필요, `@react-native-google-signin/google-signin`(New Architecture 지원 명시, RN 0.76.0~0.86 범위라 이 프로젝트와 호환)로 붙이면 됨 — 단 `kotlinVersion`을 현재 1.9.25에서 올려야 할 가능성. **Kakao는 예상과 달리 Cloud Functions가 필요 없다** — Kakao가 OIDC(OpenID Connect)를 공식 지원하고(`kauth.kakao.com` issuer, `id_token` 발급), Firebase의 "OpenID Connect" 커스텀 제공자 설정만으로 클라이언트-Firebase 직접 연동이 된다(단, "Firebase Authentication with Identity Platform" 업그레이드가 전제조건 — MAU 50명까지 무료, 이후 $0.015/MAU). 이 프로젝트에 이미 있는 `react-native-app-auth`(Spotify PKCE 로그인용)를 그대로 재사용할 수도 있다는 점도 확인. **Naver는 정반대** — OIDC를 지원하지 않아(서드파티 SDK 응답에 `id_token` 없음, 공식 문서 직접 확인은 도구 제약으로 실패) Firebase Custom Token 교환 방식이 사실상 유일한 경로이고, 이는 Cloud Functions 신규 도입 + Blaze 요금제 전환을 동반한다 — 즉 "Kakao 때문에 서버가 필요할 것"이라던 2026-07-28 결정 회의록의 우려는 Kakao 자체보다 **Naver**에 해당한다는 게 이번 조사의 핵심 발견.
- 산출물: `docs/spikes/social-login-google-kakao-naver-firebase.md`
- 비고: 실측 불가 항목 3가지를 문서에 명시 — (1) debug keystore SHA-1 지문(이 환경에 keytool이 PATH에 없어 실측 못함), (2) Naver 공식 문서(`developers.naver.com`) 원문 직접 확인(WebFetch 도구가 해당 도메인 페치를 거부), (3) Firebase Identity Platform 업그레이드의 Spark 요금제 무료 한도 정확한 경계(자료마다 표현이 상충하지 않지만 완전히 일치하지도 않음). 커밋은 하지 않음 — 리더 리뷰 후 처리 예정.
