import React, {createContext, useCallback, useContext, useMemo, useState} from 'react';
import {loginWithSpotify, type SpotifyAuthTokens} from './spotifyAuth';
import {fetchAppUser, type AppUser} from '../api/authApi';

/**
 * 인증 상태 전역 컨텍스트 (US-101/102/104).
 * MVP 스캐폴딩이므로 토큰 영속화(secure storage)는 하지 않는다 — 앱 재시작 시 재로그인 필요.
 * TODO(다음 단계): react-native-keychain 등으로 refreshToken을 안전하게 저장하고 자동 재로그인 지원.
 */

interface AuthState {
  status: 'signed_out' | 'signing_in' | 'signed_in' | 'error';
  tokens: SpotifyAuthTokens | null;
  user: AppUser | null;
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
    user: null,
    error: null,
  });

  const login = useCallback(async () => {
    setState(prev => ({...prev, status: 'signing_in', error: null}));
    try {
      const tokens = await loginWithSpotify();
      const user = await fetchAppUser(tokens.accessToken);
      setState({status: 'signed_in', tokens, user, error: null});
    } catch (err) {
      setState({
        status: 'error',
        tokens: null,
        user: null,
        error: err instanceof Error ? err.message : 'Spotify 로그인에 실패했습니다.',
      });
    }
  }, []);

  const logout = useCallback(() => {
    setState({status: 'signed_out', tokens: null, user: null, error: null});
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
