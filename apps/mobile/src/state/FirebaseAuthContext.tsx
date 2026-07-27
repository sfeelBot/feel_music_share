import React, {createContext, useContext, useEffect, useState} from 'react';
import {ensureAnonymousAuth} from '../services/firebase/firebaseAuth';

/**
 * Firebase Auth 익명 인증(uid) 전역 컨텍스트.
 *
 * **`services/auth/AuthContext.tsx`(Spotify OAuth)와는 완전히 별개의 신원 시스템이다** —
 * services/firebase/firebaseAuth.ts 상단 주석 참고. 이 컨텍스트는 RTDB 보안 규칙이 요구하는
 * `auth.uid`(위조 불가능한 세션 내 고유 ID)만 제공한다. 화면은 세션 생성/참여 시
 * `participantId`로 Spotify 프로필의 `profile.id` 대신 이 `uid`를 써야 한다
 * (docs/specs/10-rtdb-schema-and-security-rules.md "설계 변경 요구사항").
 *
 * App.tsx 최상단(다른 Provider보다 먼저, 또는 나란히)에서 마운트되어 앱 시작 시 1회
 * `ensureAnonymousAuth()`를 호출한다 — 이미 로그인된 익명 세션이 있으면 재사용하고(SDK가
 * 세션을 로컬에 유지), 없으면 새로 발급받는다(중복 로그인 방지는 firebaseAuth.ts 참고).
 */

interface FirebaseAuthContextValue {
  /** 발급 완료 전에는 null. RTDB 관련 화면/액션(세션 생성·참여)은 이 값이 준비될 때까지 기다려야 한다. */
  uid: string | null;
  /** signInAnonymously()가 실패한 경우(예: 콘솔에서 익명 로그인 제공업체가 꺼져 있음) 메시지를 담는다. */
  error: string | null;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextValue | undefined>(undefined);

export function FirebaseAuthProvider({children}: {children: React.ReactNode}) {
  const [uid, setUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    ensureAnonymousAuth()
      .then(resolvedUid => {
        if (!cancelled) {
          setUid(resolvedUid);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Firebase 익명 인증에 실패했습니다.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <FirebaseAuthContext.Provider value={{uid, error}}>{children}</FirebaseAuthContext.Provider>;
}

export function useFirebaseAuth(): FirebaseAuthContextValue {
  const ctx = useContext(FirebaseAuthContext);
  if (!ctx) {
    throw new Error('useFirebaseAuth must be used within FirebaseAuthProvider');
  }
  return ctx;
}
