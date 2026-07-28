# 스파이크: 소셜 로그인(Google / Kakao / Naver) × Firebase Authentication 연동 방법

> 상태: v1 (2026-07-28)
> 근거: `docs/decision-log.md` 2026-07-28 "로그인 방식: 간편 로그인(Google + Kakao 등) 채택" + `docs/decisions-needed.md` 항목 1(Google+Kakao+Naver 간편 로그인 채택, 후속 조사 대기)
> **이 문서는 결정하지 않는다.** Google/Kakao/Naver 각각을 이 프로젝트의 기존 Firebase Auth(익명 인증) 위에 붙이는 정확한 기술적 방법과 트레이드오프만 정리한다. 최종 선택(예: 전부 즉시 붙일지, Google만 먼저 붙이고 나머지는 후속 라운드로 미룰지)은 리더가 사용자와 논의해 결정한다.

## 배경

지금까지 이 앱의 유일한 로그인 수단은 Spotify OAuth였는데, Spotify 지원 자체가 삭제되는 중이다(`docs/specs/11-youtube-only-migration-plan.md`). 대체로 Google/Kakao/Naver 등 소셜 로그인을 채택하기로 했다(`docs/decision-log.md` 2026-07-28). 이 프로젝트는 이미 Firebase Authentication을 쓰고 있다 — 단, 현재는 **익명 인증뿐**이다:

- `apps/mobile/src/services/firebase/firebaseAuth.ts` — `ensureAnonymousAuth()`가 앱 시작 시 `signInAnonymously()`를 호출해 `auth.uid`를 발급한다.
- `apps/mobile/src/state/FirebaseAuthContext.tsx` — 이 `uid`를 앱 전역에 노출한다.
- RTDB 보안 규칙(`docs/specs/10-rtdb-schema-and-security-rules.md` 시나리오 A, `docs/decision-log.md` 2026-07-27)은 "이 쓰기가 진짜 본인/방장이 보낸 것인가"를 `auth.uid`로만 검증한다 — Cloud Functions는 아직 도입되지 않았다(`docs/infrastructure-overview.md`).

목표는 Firebase 프로젝트(`feel-music-share`) 자체를 갈아엎지 않고, 이 위에 Google/Kakao/Naver 로그인을 **추가**하는 것이다.

## 조사 방법

실측(코드 작성 후 실행)이 아니라 **문서/사례 조사**다. 이유: Google Cloud Console에서 OAuth 클라이언트를 실제로 등록하거나 Kakao/Naver Developers에 앱을 실제로 등록하는 것은 이 스파이크 범위 밖의 외부 계정 액션(사용자가 해야 함, `docs/decisions-needed.md`)이고, `apps/mobile/` 코드도 건드리지 않기로 범위가 제한됐다. 다만 순수 추측이 아니라 **이 저장소의 실제 현재 상태를 직접 확인**해 조사 결과에 구체적으로 반영했다:

- `apps/mobile/android/app/google-services.json`을 직접 읽어 `oauth_client: []`(Android/Web OAuth 클라이언트가 아직 하나도 등록되지 않음)를 확인했다 — Google 로그인을 붙이려면 이 배열이 채워진 새 `google-services.json`을 다시 받아야 한다는 뜻.
- `apps/mobile/android/build.gradle`에서 `compileSdkVersion 36`, `kotlinVersion "1.9.25"`를 확인했다 — 아래 Google 절의 버전 요구사항과 대조.
- `apps/mobile/package.json`에서 `@react-native-firebase/*` 25.1.0, `react-native` 0.76.9(New Architecture), `react-native-app-auth` 8.0.1이 이미 있음을 확인했다.
- 이 환경(Windows, bash 툴)에서 `keytool`이 PATH에 없어 debug keystore의 실제 SHA-1 지문을 직접 뽑아보는 것은 **실측하지 못했다** — 아래 "실측 불가 항목" 참고.

공식 문서(Firebase, React Native Firebase, Kakao Developers) + 2026년 최신 커뮤니티 자료를 웹 검색/웹 페치로 조사했고, 출처가 불명확하거나 상충하는 부분은 "불확실"로 명시했다.

---

## 1. Google 로그인 — Firebase Auth 표준 제공자 경로

**결론: 표준적이고 단순하다. Cloud Functions 불필요.** Firebase Authentication이 Google을 기본 제공자로 지원하므로, 클라이언트에서 ID 토큰을 받아 `signInWithCredential()`만 호출하면 끝난다.

### 패키지 — `@react-native-google-signin/google-signin`이 현재도 표준

- 공식 문서(react-native-google-signin.github.io) 기준 현재(2026) 요구사항: **React Native 0.76.0 ~ 0.86**, Android `compileSdkVersion >= 35`, `kotlinVersion >= 2.0.21`. 이 프로젝트는 RN **0.76.9**라 범위 안이고, `compileSdkVersion 36`도 충족한다. 다만 **`kotlinVersion`이 현재 `1.9.25`로, 요구사항(`>=2.0.21`)에 못 미친다** — 실제 도입 시 `android/build.gradle`의 `kotlinVersion`을 올려야 할 가능성이 있다(다른 의존성과의 호환성은 이번 조사 범위 밖).
- 공식 문서가 "Both old and new architecture of React Native are supported"라고 명시 — 이 프로젝트가 New Architecture 활성화 상태(`docs/specs/06-mvp-scope-and-tech-stack.md`)와 호환.
- **중요한 최신 뉘앙스**: 이 패키지는 현재 무료(공개) 버전과 별도로 "Universal Sign In"이라는 유료 프리미엄 버전이 함께 홍보되고 있다. 무료 버전은 README가 스스로 명시하듯 **Android에서 "레거시(legacy) Google Sign-In SDK"를 사용한다** — Google이 최근 권장하는 Credential Manager API가 아니다. 기능(Firebase `idToken` 발급)은 무료 버전으로 충분하지만, 장기적으로 레거시 SDK가 완전히 폐지될 경우 마이그레이션이 필요할 수 있다는 리스크는 인지해둘 만하다(정확한 폐지 시점은 확인 못함 — 불확실).

### Android 설정 — "완전 새로 만드는 것"이 아니라 기존 Firebase 프로젝트에 제공자만 추가하는 절차

1. Firebase 콘솔 → `feel-music-share` 프로젝트 → Authentication → Sign-in method → **Google 제공자 활성화**(현재 활성화된 건 "익명"뿐).
2. Google 로그인은 Android에서 **SHA-1(및 SHA-256) 지문 등록**이 필요하다 — Firebase 콘솔의 "프로젝트 설정 → 내 앱 → Android 앱(`com.mobile`)"에서 지문을 추가한다. 이 프로젝트는 현재 `debug.keystore`(및 release도 같은 keystore 재사용 — `android/app/build.gradle` 주석 "프로덕션에서는 별도 keystore 필요") 하나뿐이라, 우선 이 디버그 keystore의 SHA-1만 등록하면 개발/사이드로드 빌드 검증은 가능하다. **실측 불가**: 이 세션 환경에는 `keytool`이 PATH에 없어(`where keytool` 실패) 실제 지문 값을 직접 뽑지 못했다 — `cd android && ./gradlew signingReport` 또는 로컬에 JDK가 설치된 환경에서 `keytool -list -v -keystore debug.keystore -alias androiddebugkey -storepass android -keypass android`로 확인 필요.
3. 지문 등록 후 **`google-services.json`을 Firebase 콘솔에서 다시 다운로드**해 `apps/mobile/android/app/google-services.json`을 교체해야 한다 — 현재 파일을 직접 읽어 확인한 결과 `oauth_client: []`(빈 배열)라 Google 로그인에 필요한 OAuth 클라이언트 정보가 아직 없다. 지문 등록 후 재다운로드하면 이 배열에 `client_type: 3`(웹 클라이언트, `GoogleSignin.configure({webClientId})`에 필요)과 `client_type: 1`(Android 클라이언트) 항목이 채워진다.
4. **이건 "새 Firebase 프로젝트를 만드는 게 아니라 기존 프로젝트에 제공자를 추가하는" 절차임을 확인** — RTDB/익명 인증 등 기존 설정에는 영향이 없다(공식 문서에도 "제공자 활성화"는 독립적인 단계로 안내됨).

### 코드 통합 (개념만 — 실제 작성은 implementer 몫)

```js
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {GoogleAuthProvider, getAuth, signInWithCredential} from '@react-native-firebase/auth';

GoogleSignin.configure({webClientId: '<google-services.json의 client_type:3 client_id>'});

async function signInWithGoogle() {
  await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
  const result = await GoogleSignin.signIn();
  const idToken = result.data?.idToken ?? result.idToken;
  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(getAuth(), credential); // firebaseAuth.ts의 getFirebaseAuth()로 대체 가능
}
```

---

## 2. Kakao 로그인 — Firebase의 범용 OIDC 제공자로 연동 가능 (핵심 조사 대상)

**결론: Kakao는 OIDC(OpenID Connect)를 공식 지원하고, Firebase의 "OpenID Connect" 커스텀 제공자 설정만으로 연동 가능하다 — Cloud Functions/서버 로직이 필요 없다.** 이는 2026-07-28 결정 회의록이 "정확한 현재 방법은 확정되지 않았고 조사가 필요하다"고 남긴 지점에 대한 답이다.

### Kakao의 OIDC 지원 — 공식 문서로 확인

- Kakao Developers 공식 문서(`developers.kakao.com/docs/latest/en/kakaologin/rest-api`, `.../prerequisite`)에 "OpenID Connect Activation" 설정이 명시돼 있다. 앱 관리 페이지 → [카카오 로그인] → [OpenID Connect]에서 상태를 ON으로 바꾸면 활성화된다.
- 활성화하면 로그인 시 access token과 함께 **`id_token`이 함께 발급**된다(문서 문구: "ID token issued through the OpenID Connect extension feature"). 발급 URL은 `https://kauth.kakao.com/oauth/authorize`로, OIDC issuer(`https://kauth.kakao.com/`)와 일치한다.
- `nonce` 파라미터로 재전송 공격(replay attack)을 방지하는 것도 표준 OIDC와 동일하게 지원된다.
- **사업자 등록 여부**: OpenID Connect 활성화 자체는 "Biz App" 전환(사업자 등록) 없이 가능하다 — 단, `account_email` 같은 일부 동의 항목은 Biz App 전환이 필요하다(Kakao 공식 문서, `kakaologin/prerequisite`). 즉 이메일까지는 못 받을 수 있지만, ID 토큰의 `sub`(고유 사용자 ID) 자체는 사업자 등록 없이 받을 수 있는 것으로 보인다 — 다만 닉네임/프로필 사진 등 어떤 동의 항목까지 무료로 받을 수 있는지 세부 사항은 이번 조사에서 완전히 확정하지 못했다(불확실 — 실제 앱 등록 시 Kakao 콘솔에서 직접 확인 필요).
- 이 지원은 2022년 3월 18일부터 시작된 오래된 기능(Kakao 공지, `devtalk.kakao.com`)이라 "최근 실험적 기능"이 아니라 안정적으로 자리잡은 표준 경로로 보인다.

### Firebase 쪽 설정 — OIDC 커스텀 제공자

1. Firebase 콘솔 → Authentication → Sign-in method → "새 제공업체 추가" → **OpenID Connect**(Custom providers 섹션).
2. 값 입력: 이름(예: "Kakao"), **클라이언트 ID**(Kakao 앱 요약 정보의 REST API 키), **발급자(issuer) URL**: `https://kauth.kakao.com/` (또는 `https://kauth.kakao.com` — 정확한 트레일링 슬래시 표기는 자료마다 미묘하게 다름, 콘솔에서 discovery document 자동 조회로 검증됨), **클라이언트 시크릿**(Kakao 콘솔의 Security 절에서 발급).
3. Kakao Developers 콘솔에는 리다이렉트 URI를 `https://<프로젝트ID>.firebaseapp.com/__/auth/handler`로 등록해야 한다(Firebase가 웹 기반 OAuth 콜백을 처리하는 표준 경로).
4. 생성된 제공자 ID는 `oidc.`로 시작하는 접두사가 붙는다(예: `oidc.kakao`) — `OIDCAuthProvider.credential('oidc.kakao', idToken)`에서 이 값을 그대로 쓴다.

### ⚠️ 중요한 조건 — Firebase Authentication with Identity Platform 업그레이드가 필요하다

Firebase 공식 문서(`firebase.google.com/docs/auth/ios/openid-connect` 등)에 명시적으로 나온다: **"OpenID Connect authentication is only available in upgraded projects"** — 즉 일반 Firebase Authentication이 아니라 **"Firebase Authentication with Identity Platform"으로 프로젝트를 업그레이드**해야 OIDC 커스텀 제공자 옵션 자체가 나타난다.

- 업그레이드는 앱 코드를 바꿀 필요가 없다고 공식 문서가 명시한다("You do not need to change your apps when upgrading") — 기존 익명 인증/RTDB 보안 규칙 동작에 영향 없음.
- **비용**: SAML/OIDC 로그인은 **MAU(월간 활성 사용자) 50명까지 무료**, 초과분은 $0.015/MAU(Blaze 요금제 기준)로 과금된다. Spark(무료) 요금제에서도 OIDC 자체는 "최대 50 MAU"까지는 쓸 수 있는 것으로 조사됐다 — 즉 Blaze로 강제 전환하지 않아도 소규모 사용(친구/커플 단위)에는 당장 비용이 발생하지 않을 가능성이 크다. 다만 이 50 MAU 무료 한도가 Spark 요금제에서 그대로 유지되는지, 아니면 어느 시점에 Blaze 결제 수단 등록이 요구되는지는 조사한 자료들 사이에 표현이 완전히 일치하지는 않아 **정확한 경계는 불확실** — 실제 업그레이드 시도 시 Firebase 콘솔이 직접 확인해줄 것이다.
- 기존에 이미 활성화된 익명 인증/향후 Google 로그인은 이 과금 대상이 아니다(SAML/OIDC 로그인에만 적용).

### React Native용 Kakao SDK — 두 가지 선택지가 있음, 하나만 "정답"은 아님

두 개의 서로 다른 접근이 가능하다는 게 이번 조사에서 확인된 흥미로운 지점이다:

**(옵션 1) Kakao 전용 네이티브 SDK**
- `@react-native-seoul/kakao-login`(→ 조직 이전 후 `react-native-kakao-login`, `crossplatformkorea` 소속) — RN 0.61 이상 지원, 활발히 유지보수 중(최근 릴리스, CI 존재)이나 **New Architecture(Fabric/TurboModules) 명시적 지원 여부를 문서에서 확인하지 못했다** — 불확실.
- `react-native-kakao`(mym0404 소속, `@react-native-kakao/user` 등 모노레포) — README가 "Android, iOS, Web, New architecture, Old Architecture, Expo" 지원을 **명시적으로** 표방한다. New Architecture를 확실히 원한다면 이쪽이 현재 더 안전한 선택지로 보인다. 다만 최소 RN 버전 요구사항은 문서에서 명확히 확인하지 못했다.
- 전용 SDK를 쓰면 카카오톡 앱이 설치돼 있을 때 "카카오톡으로 로그인"(앱 전환 방식, 브라우저 리다이렉트 없이 더 매끄러운 UX)을 지원한다는 장점이 있다.

**(옵션 2) 이미 이 프로젝트에 있는 `react-native-app-auth`(범용 OAuth/OIDC 클라이언트)를 재사용**
- Kakao의 OIDC가 표준을 따르므로, 원리적으로는 Kakao 전용 SDK 없이 `react-native-app-auth`(현재 Spotify OAuth PKCE 로그인에 쓰이는 바로 그 패키지, `apps/mobile/src/services/auth/spotifyAuth.ts`)에 Kakao의 `issuer`/`clientId`/`redirectUrl`을 넣어 그대로 동작시킬 수 있다(실제로 rnfirebase.io의 OIDC 가이드 예제 코드가 이 조합을 쓴다).
- 장점: 새 네이티브 의존성을 추가하지 않아도 된다 — `docs/specs/11-youtube-only-migration-plan.md` 4절이 "Spotify 삭제 시 `react-native-app-auth` 제거 여부는 5절(인증) 결정에 달려있다"고 이미 짚어둔 지점과 정확히 맞아떨어진다. 즉 이 패키지를 제거하지 않고 Kakao(및 잠재적으로 다른 OIDC 제공자) 로그인에 재사용하는 경로가 있다.
- 단점: 브라우저/WebView 기반 리다이렉트 흐름만 가능 — 카카오톡 앱이 설치돼 있어도 앱으로 바로 전환되는 네이티브 경험은 제공하지 못한다(옵션 1 대비 UX 열위). 카카오톡 친구 목록 연동 같은 Kakao 전용 부가 기능도 없다(이 프로젝트가 그런 기능을 원하는지는 이번 범위 밖).

이 둘 중 어느 쪽이 나은지는 "새 의존성을 최소화할지" vs "카카오톡 네이티브 로그인 UX를 원하는지"의 트레이드오프이므로 리더/사용자 판단 영역으로 남긴다.

---

## 3. Naver 로그인 — OIDC 미지원, Firebase Custom Token(Cloud Functions) 필요

**결론: Kakao와 근본적으로 다르다. Naver는 OIDC를 지원하지 않아 Firebase의 OIDC 커스텀 제공자 경로를 못 쓴다. Cloud Functions(또는 다른 서버)가 사실상 필수다.**

### 왜 다른가

- Naver 로그인 API는 순수 OAuth 2.0이다 — React Native용 `@react-native-seoul/naver-login`(→ `react-native-naver-login`, 역시 `crossplatformkorea` 소속, 활발히 유지보수 중으로 보임: 최근 릴리스 확인)의 로그인 응답 타입(`NaverLoginResponse`)을 확인한 결과 `accessToken`/`refreshToken`/`expiresAtUnixSecondString`/`tokenType`만 있고 **`id_token` 필드가 없다**.
- Naver 자체의 OIDC 지원 여부를 Naver 공식 문서에서 직접 확인하려 했으나(`developers.naver.com`), 이 환경에서는 해당 도메인 페치가 차단돼 있어(WebFetch 도구가 "unable to fetch" 응답) **공식 문서를 직접 읽지는 못했다** — 다만 (a) 서드파티 React Native SDK의 실제 응답 타입에 `id_token`이 없다는 점, (b) 여러 커뮤니티 자료(예: `firebase-custom-login` 프로젝트, 다수의 한국어 블로그)가 한결같이 "Naver는 Firebase Custom Token 방식으로만 연동한다"고 서술하는 점, (c) OIDC를 지원했다면 Kakao와 마찬가지로 이를 다루는 Firebase 공식/커뮤니티 가이드가 존재했을 텐데 그런 자료를 전혀 찾지 못한 점을 근거로, **Naver가 OIDC를 지원하지 않는다는 결론에 상당히 높은 확신을 갖고 있으나 100% 확정은 아니다** — 정확히 확인하려면 Naver 개발자센터(`developers.naver.com`)를 사용자가 직접 열람하거나, 이 환경에서 그 도메인 접근이 왜 막혀있는지 다른 방법(다른 네트워크 등)으로 우회해야 한다.

### 실제 연동 방법 — Firebase Custom Token 교환

1. 클라이언트: `react-native-naver-login`(또는 대안 패키지)으로 Naver 로그인 → `accessToken` 획득.
2. **서버(Cloud Functions 등)**: 클라이언트가 이 `accessToken`을 서버로 전달 → 서버가 Naver API(`https://openapi.naver.com/v1/nid/me`)로 그 토큰이 유효한지 검증하고 사용자 고유 ID를 얻음 → Firebase Admin SDK의 `admin.auth().createCustomToken(naverUserId)`로 **Firebase Custom Token**을 발급해 클라이언트에 반환.
3. 클라이언트: 받은 Custom Token으로 `signInWithCustomToken(auth, customToken)` 호출 → Firebase Auth `uid`(여기서는 보통 `naver:<네이버유저ID>`처럼 접두사를 붙여 값 충돌을 방지) 발급.
4. 이 패턴을 실제로 구현한 공개 예제(`github.com/zaiyou12/firebase-custom-login` — "Firebase custom login for KakaoTalk/Naver users using firebase function")를 확인했다. 이 예제는 Kakao와 Naver 둘 다 이 방식으로 다루는데, **Kakao도 이 예제처럼 Custom Token 방식으로 할 수는 있다**(OIDC가 유일한 방법은 아님) — 다만 위 2절에서 확인했듯 Kakao는 OIDC라는 서버리스 대안이 있다는 점이 Naver와의 핵심 차이다.
5. 이 예제 저장소 자체가 "Firebase Blaze 요금제가 필요하다"고 명시한다 — Cloud Functions는 Spark(무료) 요금제에서 외부 네트워크 호출(Naver API 검증)이 제한되므로, Naver 로그인을 붙이려면 **이 프로젝트가 지금까지 회피해온 Blaze 요금제 전환도 사실상 함께 딸려온다**는 뜻이다.

### 이것이 이 프로젝트에 의미하는 것

`docs/infrastructure-overview.md`가 명시하듯 이 프로젝트는 **Cloud Functions를 아직 도입하지 않았다**. Naver 로그인을 정말로 지금 붙이려면:
- Cloud Functions 신규 도입(첫 서버 코드 실행 인프라) — 이것 자체가 `docs/decision-log.md`에 새 인프라 결정으로 남을 만한 사안이다.
- Firebase 요금제를 Blaze(종량제)로 전환(Cloud Functions 외부 네트워크 호출 요건).
- Naver API 토큰 검증 로직을 직접 작성(Naver가 Firebase Admin SDK와 통합된 공식 커넥터를 제공하지 않으므로, 검증+커스텀 토큰 발급 로직을 직접 짜야 함).

이는 Google/Kakao 대비 훨씬 큰 인프라 투자다.

---

## 4. 세 방법 비교

| 항목 | Google | Kakao | Naver |
|---|---|---|---|
| Firebase 기본 제공 제공자 | O (표준) | X — OIDC 커스텀 제공자로 우회 가능 | X — 커스텀 제공자 경로 없음(OIDC 미지원) |
| Cloud Functions/서버 필요 여부 | 불필요 | **불필요** (OIDC로 클라이언트-Firebase 직접 연동) | **필요** (Custom Token 교환 서버 로직) |
| Firebase 프로젝트 설정 변경 | Sign-in method에서 Google 활성화만 | **Identity Platform 업그레이드 필요** + OIDC 제공자 추가 | Cloud Functions 신규 배포 + (Identity Platform 업그레이드는 불필요 — Custom Token은 기본 Firebase Auth 기능) |
| 추가 인프라 비용 | 없음(익명 인증과 동일 무료 구조 유지) | OIDC 로그인 MAU 50명까지 무료, 이후 $0.015/MAU(Blaze) — 소규모 사용에는 사실상 무료 | **Cloud Functions 실행 비용 + Blaze 요금제 전환** (Custom Token 예제가 Blaze 필수라고 명시) |
| Android 사전 준비 | SHA-1/SHA-256 지문 등록 + `google-services.json` 재다운로드 | Kakao Developers 앱 등록(REST API 키, Redirect URI), OpenID Connect 활성화 | Naver Developers 앱 등록(Client ID/Secret), Cloud Functions 배포 환경 구축 |
| RN 패키지 | `@react-native-google-signin/google-signin`(New Arch 지원 명시) | `react-native-kakao`(New Arch 명시) 또는 `react-native-kakao-login`(불확실) 또는 기존 `react-native-app-auth` 재사용 | `react-native-naver-login`(New Arch 지원 여부 문서에서 확인 못함, 불확실) |
| 이 프로젝트에 미치는 구조적 영향 | 없음(기존 아키텍처 그대로) | 없음(클라이언트-Firebase 직접, 기존 "Cloud Functions 없음" 아키텍처 유지) | **크다** — Cloud Functions 최초 도입이라는 새 인프라 결정이 함께 필요 |
| 작업량(체감) | 작음 | 중간(Identity Platform 업그레이드 + OIDC 콘솔 설정 학습 곡선) | **큼**(서버 로직 신규 작성 + 배포 파이프라인 + 과금 전환) |

### 참고용 대안 시나리오 (결정 아님)

1. **셋 다 동시에 붙인다**: 사용자 결정("Google+Kakao+Naver 채택")을 문자 그대로 따르는 경로. 다만 Naver 때문에 Cloud Functions 도입이 이번 라운드의 전제조건이 된다 — "로그인 붙이기"가 사실상 "로그인 붙이기 + 첫 서버 인프라 도입" 두 가지 결정을 동시에 포함하게 된다.
2. **Google + Kakao 먼저, Naver는 후속 라운드로 분리**: 인프라 요구사항이 성격이 다른 두 그룹(서버 불필요 vs 서버 필요)이라는 점에 착안한 분할. Google/Kakao는 기존 아키텍처("Firebase만, Cloud Functions 없음")를 그대로 유지한 채 빠르게 붙일 수 있고, Naver는 Cloud Functions 도입이라는 더 큰 결정이 별도로 논의된 뒤(다른 서버 로직 필요성이 쌓여서 어차피 Cloud Functions를 도입하게 되는 시점 등) 함께 처리하는 방법.
3. **Naver도 Cloud Functions 없이 처리하고 싶다면**: Firebase가 아닌 제3의 서버리스 함수(예: 사용자가 이미 쓰는 다른 클라우드가 있다면 그쪽의 서버리스 함수)로 Custom Token 발급 로직만 분리하는 것도 이론적으로는 가능하나, 이 프로젝트가 지금까지 "자체 서버를 두지 않는다"는 원칙(`docs/infrastructure-overview.md` "한눈에 요약")과 어긋나고 오히려 관리 포인트가 늘어나므로 권장하지 않는다(참고 의견).

---

## 5. 기존 코드와의 통합 지점 (개념 — 실제 코드 작성은 범위 밖)

`FirebaseAuthContext.tsx`가 지금 하는 일은 딱 하나 — 앱 시작 시 `ensureAnonymousAuth()`를 호출해 `uid`를 컨텍스트에 노출하는 것이다. RTDB 보안 규칙과 `sessionService.ts`는 이 `uid`를 "위조 불가능한 참여자 식별자"로만 취급하고, 그 `uid`가 익명 인증에서 왔는지 Google/Kakao/Naver 로그인에서 왔는지는 신경 쓰지 않는다 — Firebase Auth의 어떤 제공자든 결과는 항상 같은 형태의 `auth.uid`이기 때문이다. 즉 **RTDB 규칙/`sessionService.ts` 쪽은 로그인 수단이 바뀌어도 수정할 필요가 없다** — 이게 이번 조사에서 확인한 가장 중요한 구조적 사실이다.

바뀌어야 하는 건 `FirebaseAuthContext.tsx`가 "언제, 어떤 방식으로 `uid`를 발급받는가"다. 개념적으로 두 가지 경로가 있다:

- **(A) 완전 대체(fresh sign-in)**: 앱 시작 시 더 이상 `signInAnonymously()`를 자동 호출하지 않고, 사용자가 로그인 화면에서 Google/Kakao/Naver 버튼을 눌러야 `signInWithCredential()`/`signInWithCustomToken()`으로 `uid`가 발급되는 구조. 로그인 전에는 세션 생성/참여 자체가 불가능해진다(현재 `HomeScreen.tsx`가 "로그인 여부"로 분기하는 지점과 자연스럽게 맞물린다).
- **(B) 익명 계정을 승격(link)**: 기존처럼 앱 시작 시 익명 로그인을 유지하되, 사용자가 나중에 소셜 로그인을 하면 `linkWithCredential(auth.currentUser, credential)`로 **같은 `uid`를 유지한 채** 익명 계정을 영구 계정으로 승격한다. 이미 만든 세션/참여 기록이 `uid` 기준이라면 이 경로가 데이터 연속성 측면에서 유리하다.

어느 쪽이든 `ParticipantInfo`(`docs/specs/11-youtube-only-migration-plan.md` 5절이 이미 짚은 지점)에 `displayName`/프로필 사진을 채울 값이 필요한데, 이건 각 제공자 로그인 응답(Google 프로필, Kakao/Naver 사용자 정보 API)에서 가져오면 된다 — Firebase `auth.currentUser.displayName`/`photoURL`이 Google은 자동으로 채워지지만, Kakao(OIDC ID 토큰의 클레임 구성에 따라 다름)와 Naver(Custom Token 방식이라 Firebase가 자동으로 채워주지 않음, 직접 RTDB의 참여자 프로필에 저장해야 함)는 추가로 신경 써야 할 수 있다는 점만 짚어둔다(구체적 처리 방식은 구현 라운드에서 결정).

---

## 실측 불가 항목 정리 (정직하게 표시)

- **Android debug keystore의 SHA-1/SHA-256 지문 실제 값**: 이 환경에 `keytool`이 PATH로 노출돼 있지 않아 뽑지 못했다. `oauth_client: []`(등록된 OAuth 클라이언트 없음)라는 사실 자체는 `google-services.json`을 직접 읽어 확인했지만, 지문 값 자체는 실측하지 못했다. 필요 조건: JDK가 설치된 환경에서 `keytool` 또는 `./gradlew signingReport` 실행 권한.
- **Naver 공식 문서(`developers.naver.com`)의 OIDC 지원 여부 원문 확인**: 이 환경의 WebFetch 도구가 해당 도메인 페치를 거부했다(도구 자체의 제약으로 보임, 이유 불명). 서드파티 SDK 응답 타입과 다수의 커뮤니티 자료로 상당히 확신 있게(그러나 100%는 아니게) "미지원"으로 결론 내렸다. 필요 조건: 사용자가 직접 `developers.naver.com` 문서를 열람해 대조하거나, 이 환경 밖에서 재확인.
- **Firebase Identity Platform 업그레이드가 Spark(무료) 요금제에서 정확히 어떤 조건까지 무비용으로 허용되는지**: 자료마다 "50 MAU까지 무료"와 "결제 수단 없이 일일 한도까지 무료"라는 서로 다른(그러나 상충하지는 않는, 관점이 다른) 설명이 혼재했다 — 실제 콘솔에서 업그레이드를 시도해봐야 정확한 경계를 알 수 있다.
- **Kakao OIDC ID 토큰에 닉네임/프로필 사진 등 어떤 클레임까지 사업자 등록 없이 포함되는지**: 이메일은 Biz App 전환이 필요하다는 것까지는 확인했지만, 그 외 항목의 정확한 경계는 Kakao 콘솔에서 실제 앱을 등록해봐야 확정할 수 있다.

## (참고용) 리더 관점 권고 — 결정 아님

- Google과 Kakao는 **둘 다 Cloud Functions 없이** 기존 "Firebase만 쓰는" 아키텍처를 유지한 채 붙일 수 있다는 게 이번 조사의 핵심 발견이다 — 2026-07-28 결정 회의록이 우려했던 "Kakao 때문에 Cloud Functions를 도입해야 할 수도 있다"는 걱정은 **Kakao 자체에는 해당하지 않는다**(OIDC로 해결됨). 다만 Naver가 그 자리를 대신 차지한다 — Naver를 포함하는 순간 Cloud Functions 도입은 사실상 불가피해 보인다.
- 따라서 리더가 사용자에게 확인이 필요한 지점은 "Kakao 때문에 서버가 필요한가"가 아니라 **"Naver 때문에 지금 Cloud Functions를 도입할 것인가, Naver는 후속 라운드로 미룰 것인가"**로 재구성하는 게 더 정확한 질문이라고 판단한다.
- Google 로그인은 인프라 결정과 무관하게 언제든 착수 가능한 상태다(SHA-1 등록 + `google-services.json` 재발급이라는 사용자 액션만 선행되면 됨).

## 관련 문서

- `docs/decision-log.md` (2026-07-28, "로그인 방식: 간편 로그인" 항목)
- `docs/decisions-needed.md` (항목 1 — Kakao·Naver 개발자 계정 등록, 이 문서로 구체화됨)
- `docs/specs/11-youtube-only-migration-plan.md` 5절 (인증 흐름 선택지, `react-native-app-auth` 존치 여부 판단 지점)
- `docs/infrastructure-overview.md` ("Firebase가 아직 안 하는 일 — Cloud Functions 미도입")
- `apps/mobile/src/services/firebase/firebaseAuth.ts`, `apps/mobile/src/state/FirebaseAuthContext.tsx`
