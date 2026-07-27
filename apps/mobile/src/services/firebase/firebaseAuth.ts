/**
 * Firebase Auth 익명 인증(Anonymous Auth) — RTDB 보안 규칙이 "이 클라이언트가 누구인지"를
 * 구분하기 위한 세션 내 고유 신원(uid) 발급 전용 모듈.
 *
 * 근거: docs/specs/10-rtdb-schema-and-security-rules.md "시나리오 A"(2026-07-27 확정,
 * docs/decision-log.md 같은 날짜 항목). Cloud Functions가 없는 이 아키텍처에서는 RTDB 보안 규칙이
 * 사실상 유일한 서버측 검증 계층이고, 규칙이 "본인 여부"(auth.uid === $participantId)를
 * 검사하려면 클라이언트가 위조 불가능한 auth.uid를 갖고 있어야 한다.
 *
 * **중요 — 이 모듈은 `services/auth/AuthContext.tsx`(Spotify OAuth 로그인)와 완전히 별개의
 * 신원 시스템이다.** Spotify 로그인은 "이 사람이 Spotify 계정을 가졌다는 증명"이고, 여기서
 * 다루는 Firebase Auth 익명 인증은 "RTDB 규칙이 이 클라이언트를 구분하기 위한 세션 내 고유 ID"다.
 * 두 시스템을 혼동해 AuthContext.tsx/loginAsDemo()를 이 모듈이 건드리는 일은 없다 — 참여자
 * 프로필 정보(displayName/accountTier 등)는 여전히 Spotify 프로필에서 오고, participantId(=Key)
 * 만 이 모듈이 발급하는 auth.uid를 쓴다 (services/session/sessionService.ts 참고).
 *
 * 콘솔 사전 준비(코드 밖 액션, 필수): Firebase 콘솔 → Authentication → Sign-in method에서
 * "익명(Anonymous)" 제공업체를 켜야 `signInAnonymously()`가 실제로 성공한다 — 아직 켜지 않았다면
 * 이 모듈이 호출하는 signInAnonymously()는 `auth/operation-not-allowed` 에러로 실패한다(RTDB
 * 규칙이 아직 배포되지 않아 read/write가 막혀 있는 것과 같은 종류의, 코드 밖에서 해결해야 하는
 * 사전 조건 — docs/firebase-integration-guide.md "사용자가 마저 해줘야 하는 것" 절 참고).
 */

import {getApp} from '@react-native-firebase/app';
import {getAuth, onAuthStateChanged, signInAnonymously, type Auth} from '@react-native-firebase/auth';

/**
 * `Auth`(모듈러 API 타입)를 쓴다 — 레거시 네임스페이스드 타입(`FirebaseAuthTypes.Module`)은
 * 공식적으로 deprecated이고, firebaseClient.ts가 이미 모듈러 API로 통일하기로 한 방침과도 맞춘다.
 */
export function getFirebaseAuth(): Auth {
  return getAuth(getApp());
}

/**
 * 익명 인증을 보장한다 — 이미 로그인된 익명 세션이 있으면(Firebase Auth SDK가 기기에 세션을
 * 유지) 그 uid를 그대로 재사용하고, 없으면 새로 `signInAnonymously()`를 호출해 발급받는다.
 *
 * 중복 로그인 방지: `auth.currentUser`가 이미 있으면 그 uid를 즉시 반환하고 네트워크 호출을
 * 생략한다 — 앱을 재시작해도(SDK가 세션을 로컬에 유지하는 한) 매번 새 uid가 발급되지 않는다.
 *
 * @returns 발급/재사용된 auth.uid
 */
export async function ensureAnonymousAuth(): Promise<string> {
  const auth = getFirebaseAuth();
  if (auth.currentUser) {
    return auth.currentUser.uid;
  }
  const credential = await signInAnonymously(auth);
  return credential.user.uid;
}

/**
 * 현재 uid를 구독한다(로그인 완료 시점을 기다려야 하는 화면/컨텍스트용). 언마운트 시 반환된
 * 함수를 호출해 구독을 해제해야 한다.
 */
export function subscribeToAuthUid(callback: (uid: string | null) => void): () => void {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, user => callback(user ? user.uid : null));
}
