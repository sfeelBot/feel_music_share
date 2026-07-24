import React, {createContext, useCallback, useContext, useMemo, useState} from 'react';
import {loginWithSpotify, type SpotifyAuthTokens} from './spotifyAuth';
import {fetchSpotifyProfile, type SpotifyProfile} from '../spotify/spotifyWebApi';

/**
 * 인증 상태 전역 컨텍스트 (US-101/102/104).
 *
 * NOTE(Firebase 확정에 따른 변경): 이전 라운드 스캐폴딩은 백엔드(/auth/session)에 Spotify
 * accessToken을 넘겨 앱 자체 사용자 정보를 받아오는 구조였으나, 커스텀 백엔드 대신 Firebase로
 * 스택이 확정되면서(CLAUDE.md) 그 백엔드 자체가 존재하지 않는다. 이번 라운드는 Spotify Web API
 * (`/v1/me`)를 클라이언트에서 직접 호출해 프로필/Premium 여부를 확인하는 것으로 대체했다 —
 * Authorization Code + PKCE 플로우라 client secret 없이도 안전하게 직접 호출 가능하다
 * (docs/specs/02-spotify-integration.md 1절).
 *
 * TODO(Firebase 연동): 세션 생성/참여 시 이 프로필 정보를 Firebase Auth와 연결하거나(예: Custom
 * Token 발급을 Cloud Function이 담당) 최소한 Firestore의 참여자 레코드에 매핑해야 한다. 지금은
 * 이 컨텍스트가 들고 있는 값만으로 세션 서비스(services/session/sessionService.ts)를 로컬에서
 * 굴리고 있다.
 *
 * MVP 스캐폴딩이므로 토큰 영속화(secure storage)는 하지 않는다 — 앱 재시작 시 재로그인 필요.
 * TODO(다음 단계): react-native-keychain 등으로 refreshToken을 안전하게 저장하고 자동 재로그인 지원.
 */

interface AuthState {
  status: 'signed_out' | 'signing_in' | 'signed_in' | 'error';
  tokens: SpotifyAuthTokens | null;
  profile: SpotifyProfile | null;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [state, setState] = useState<AuthState>({
    status: 'signed_out',
    tokens: null,
    profile: null,
    error: null,
  });

  const login = useCallback(async () => {
    setState(prev => ({...prev, status: 'signing_in', error: null}));
    try {
      const tokens = await loginWithSpotify();
      const profile = await fetchSpotifyProfile(tokens.accessToken);
      setState({status: 'signed_in', tokens, profile, error: null});
    } catch (err) {
      setState({
        status: 'error',
        tokens: null,
        profile: null,
        error: err instanceof Error ? err.message : 'Spotify 로그인에 실패했습니다.',
      });
    }
  }, []);

  const logout = useCallback(() => {
    setState({status: 'signed_out', tokens: null, profile: null, error: null});
  }, []);

  const value = useMemo(() => ({...state, login, logout}), [state, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
