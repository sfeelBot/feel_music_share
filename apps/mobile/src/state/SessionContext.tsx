import React, {createContext, useCallback, useContext, useMemo, useRef, useState} from 'react';
import * as sessionService from '../services/session/sessionService';
import type {
  MusicService,
  ParticipantInfo,
  PlaylistEntry,
  SessionState,
  SyncStatusValue,
  Track,
} from '../types/domain';

/**
 * 세션(방)의 상태를 앱 전역에 제공하는 컨텍스트.
 *
 * NOTE(Firebase 확정에 따른 변경, 중요): 이전 라운드 스캐폴딩은 자체 WebSocket 서버(services/realtime/socket.ts,
 * 이번 라운드에서 제거)에 연결해 실시간 이벤트를 주고받는 구조였다. CLAUDE.md/06번 문서가 백엔드를
 * Firebase로 확정하면서 그 커스텀 서버 자체가 존재하지 않게 됐고, 이번 라운드는 "Spotify 전용 세션
 * MVP 핵심 화면" UI 완성이 목표이므로 services/session/sessionService.ts의 인메모리 목업으로 대체했다.
 *
 * TODO(Firebase 연동 — 다음 라운드, 정확한 교체 지점):
 * 1. `createSession` → Firestore `sessions/{id}` 문서 생성(Cloud Function 경유 권장)으로 교체.
 * 2. 아래 useEffect 자리에 Firestore `onSnapshot`/RTDB `onValue` 구독을 추가해 session 상태를
 *    실시간으로 반영해야 한다(지금은 로컬 상태 변경만 있고 "구독"이 없다 — 참여자가 1명뿐인 로컬
 *    데모라 아직 필요 없었음).
 * 3. `requestPlay/Pause/Seek/NextTrack` → Cloud Function 호출로 교체하고, 그 응답이 아니라
 *    구독 채널로 돌아오는 새 playback 문서를 반영하는 구조로 바꿔야 한다(현재는 낙관적으로 로컬에서
 *    바로 상태를 바꾸고 있음 — 서버 기준 시계 모델, 05-sync-architecture.md 모델 A).
 * 4. `utils/clock.ts`의 클록 오프셋 계산(ping-pong)은 아직 어디에도 연결돼 있지 않다 — Cloud
 *    Functions가 발급하는 서버 타임스탬프와 연결해야 실제로 의미가 생긴다.
 * 5. 참여자 목록의 실시간 연결 상태(connectionStatus)도 Firebase Presence 패턴(RTDB `onDisconnect`
 *    등)으로 교체 필요 — 지금은 항상 'connected'로 고정된 목업.
 */

interface SessionContextValue {
  session: SessionState | null;
  currentParticipantId: string | null;
  isHost: boolean;
  syncStatus: SyncStatusValue;
  createSession: (params: {
    sessionName: string;
    service: MusicService;
    capacity: number;
    host: {participantId: string; displayName: string; accountTier: 'premium' | 'free'};
  }) => SessionState;
  leaveSession: () => void;
  requestPlay: () => void;
  requestPause: () => void;
  requestNextTrack: () => void;
  requestPrevTrack: () => void;
  addTrack: (track: Track) => void;
  removeTrack: (entryId: string) => void;
  appointAdmin: (participantId: string) => void;
  revokeAdmin: (participantId: string) => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

const TUNING_DISPLAY_MS = 1500;

export function SessionProvider({children}: {children: React.ReactNode}) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [currentParticipantId, setCurrentParticipantId] = useState<string | null>(null);
  const [isTuning, setIsTuning] = useState(false);
  const tuningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerTuning = useCallback(() => {
    setIsTuning(true);
    if (tuningTimer.current) {
      clearTimeout(tuningTimer.current);
    }
    tuningTimer.current = setTimeout(() => setIsTuning(false), TUNING_DISPLAY_MS);
  }, []);

  const createSession = useCallback<SessionContextValue['createSession']>(params => {
    const created = sessionService.createSession(params);
    setSession(created);
    setCurrentParticipantId(params.host.participantId);
    return created;
  }, []);

  const leaveSession = useCallback(() => {
    setSession(null);
    setCurrentParticipantId(null);
  }, []);

  const requestPlay = useCallback(() => {
    setSession(prev => {
      if (!prev) {return prev;}
      // TODO(Firebase): Cloud Function 호출로 교체. 지금은 낙관적 로컬 갱신만 수행.
      return {...prev, playback: {...prev.playback, isPlaying: true, serverTimestamp: Date.now()}};
    });
  }, []);

  const requestPause = useCallback(() => {
    setSession(prev => {
      if (!prev) {return prev;}
      return {...prev, playback: {...prev.playback, isPlaying: false, serverTimestamp: Date.now()}};
    });
  }, []);

  const requestNextTrack = useCallback(() => {
    triggerTuning();
    setSession(prev => {
      if (!prev) {return prev;}
      const currentIndex = prev.playlist.findIndex(e => e.entryId === prev.playback.currentEntryId);
      const next = prev.playlist[currentIndex + 1];
      if (!next) {
        return prev;
      }
      const playlist = prev.playlist.map(entry => {
        if (entry.entryId === prev.playback.currentEntryId) {
          return {...entry, playedStatus: 'played' as const};
        }
        if (entry.entryId === next.entryId) {
          return {...entry, playedStatus: 'playing' as const};
        }
        return entry;
      });
      return {
        ...prev,
        playlist,
        playback: {
          currentEntryId: next.entryId,
          positionMs: 0,
          isPlaying: true,
          serverTimestamp: Date.now(),
          updatedByParticipantId: currentParticipantId ?? prev.hostParticipantId,
        },
      };
    });
  }, [currentParticipantId, triggerTuning]);

  const requestPrevTrack = useCallback(() => {
    triggerTuning();
    setSession(prev => {
      if (!prev) {return prev;}
      const currentIndex = prev.playlist.findIndex(e => e.entryId === prev.playback.currentEntryId);
      const previous = currentIndex > 0 ? prev.playlist[currentIndex - 1] : undefined;
      if (!previous) {
        return prev;
      }
      const playlist = prev.playlist.map(entry => {
        if (entry.entryId === prev.playback.currentEntryId) {
          return {...entry, playedStatus: 'pending' as const};
        }
        if (entry.entryId === previous.entryId) {
          return {...entry, playedStatus: 'playing' as const};
        }
        return entry;
      });
      return {
        ...prev,
        playlist,
        playback: {
          currentEntryId: previous.entryId,
          positionMs: 0,
          isPlaying: true,
          serverTimestamp: Date.now(),
          updatedByParticipantId: currentParticipantId ?? prev.hostParticipantId,
        },
      };
    });
  }, [currentParticipantId, triggerTuning]);

  const addTrack = useCallback(
    (track: Track) => {
      setSession(prev => {
        if (!prev || !currentParticipantId) {return prev;}
        const me = prev.participants.find(p => p.participantId === currentParticipantId);
        if (!me) {return prev;}
        const playlist = sessionService.addTrack(prev.sessionId, track, me);
        return {...prev, playlist};
      });
    },
    [currentParticipantId],
  );

  const removeTrack = useCallback(
    (entryId: string) => {
      setSession(prev => {
        if (!prev) {return prev;}
        const wasCurrent = prev.playback.currentEntryId === entryId;
        const removedIndex = prev.playlist.findIndex(e => e.entryId === entryId);
        const playlistAfterRemoval = sessionService.removeTrack(prev.sessionId, entryId);

        if (!wasCurrent) {
          return {...prev, playlist: playlistAfterRemoval};
        }

        // 04-playlist.md 기능 목록 2번: 현재 재생 중인 곡이 삭제되면 남은 큐의 다음 곡으로 자동 전환한다.
        const next = removedIndex >= 0 ? prev.playlist[removedIndex + 1] : undefined;
        if (!next) {
          // 다음 곡이 없으면 "재생할 곡 없음" 상태를 유지한다(정상 동작).
          return {
            ...prev,
            playlist: playlistAfterRemoval,
            playback: {...prev.playback, currentEntryId: null, isPlaying: false, positionMs: 0},
          };
        }

        triggerTuning();
        const playlist = playlistAfterRemoval.map(entry =>
          entry.entryId === next.entryId ? {...entry, playedStatus: 'playing' as const} : entry,
        );
        return {
          ...prev,
          playlist,
          playback: {
            currentEntryId: next.entryId,
            positionMs: 0,
            isPlaying: true,
            serverTimestamp: Date.now(),
            updatedByParticipantId: currentParticipantId ?? prev.hostParticipantId,
          },
        };
      });
    },
    [currentParticipantId, triggerTuning],
  );

  const appointAdmin = useCallback((participantId: string) => {
    setSession(prev => {
      if (!prev) {return prev;}
      const participants = sessionService.appointAdmin(prev.sessionId, participantId);
      return {...prev, participants};
    });
  }, []);

  const revokeAdmin = useCallback((participantId: string) => {
    setSession(prev => {
      if (!prev) {return prev;}
      const participants = sessionService.revokeAdmin(prev.sessionId, participantId);
      return {...prev, participants};
    });
  }, []);

  // 02-key-ui-patterns.md 2.3절: "세션 전체 중 가장 안 좋은 상태를 대표로 보여준다".
  // TODO(Firebase): 실제 드리프트 측정치로 교체 — 지금은 참여자별 목업 delaySeconds 기반.
  const syncStatus = useMemo<SyncStatusValue>(() => {
    if (isTuning) {
      return {state: 'tuning'};
    }
    if (!session) {
      return {state: 'synced'};
    }
    const worst = session.participants.reduce((max, p) => Math.max(max, p.delaySeconds), 0);
    if (worst >= 1) {
      return {state: 'delayed', delaySeconds: worst};
    }
    return {state: 'synced'};
  }, [isTuning, session]);

  const isHost = !!session && session.hostParticipantId === currentParticipantId;

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      currentParticipantId,
      isHost,
      syncStatus,
      createSession,
      leaveSession,
      requestPlay,
      requestPause,
      requestNextTrack,
      requestPrevTrack,
      addTrack,
      removeTrack,
      appointAdmin,
      revokeAdmin,
    }),
    [
      session,
      currentParticipantId,
      isHost,
      syncStatus,
      createSession,
      leaveSession,
      requestPlay,
      requestPause,
      requestNextTrack,
      requestPrevTrack,
      addTrack,
      removeTrack,
      appointAdmin,
      revokeAdmin,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return ctx;
}

export type {ParticipantInfo, PlaylistEntry};
