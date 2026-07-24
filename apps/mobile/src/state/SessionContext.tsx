import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {SyncSocket} from '../services/realtime/socket';
import {spotifyRemotePlayer} from '../services/spotify/spotifyRemote';
import {
  CLOCK_SYNC_INTERVAL_MS,
  DRIFT_CORRECTION_THRESHOLD_MS,
  computeClockOffsetMs,
  computeExpectedPositionMs,
} from '../utils/clock';
import type {ParticipantInfo, PlaybackState, PlaylistEntry} from '../types/domain';
import type {ServerMessage} from '../types/protocol';

/**
 * 세션(방)의 실시간 상태를 앱 전역에 제공하는 컨텍스트.
 *
 * 담당 범위 (MVP):
 * - WebSocket으로 수신한 session_state / playback_update / playlist_update / participants_update 반영
 * - 클록 오프셋 추정 (ping-pong) 및 주기적 드리프트 보정 (US-403, US-404)
 * - 재생 조작(재생/일시정지/탐색/다음곡)을 서버로 전송 (US-401)
 *
 * 실제 오디오 제어는 services/spotify/spotifyRemote.ts (현재 STUB)를 통해 이뤄진다.
 */

interface SessionContextValue {
  sessionId: string | null;
  participantId: string | null;
  playback: PlaybackState | null;
  playlist: PlaylistEntry[];
  participants: ParticipantInfo[];
  /** 정상 / 지연 n초 / 재동기화 중 — US-404 */
  syncStatus: {state: 'synced' | 'drifted' | 'resyncing'; driftMs: number};
  joinSession: (sessionId: string, participantId: string, displayName: string) => void;
  leaveSession: () => void;
  requestPlay: () => void;
  requestPause: () => void;
  requestSeek: (positionMs: number) => void;
  requestNextTrack: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({children}: {children: React.ReactNode}) {
  const socketRef = useRef<SyncSocket | null>(null);
  const clockOffsetRef = useRef(0);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [playback, setPlayback] = useState<PlaybackState | null>(null);
  const [playlist, setPlaylist] = useState<PlaylistEntry[]>([]);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [syncStatus, setSyncStatus] = useState<SessionContextValue['syncStatus']>({
    state: 'synced',
    driftMs: 0,
  });

  const handleServerMessage = useCallback((message: ServerMessage) => {
    switch (message.type) {
      case 'session_state':
        setPlayback(message.playback);
        setPlaylist(message.playlist);
        setParticipants(message.participants);
        break;
      case 'playback_update':
        setPlayback(message.playback);
        break;
      case 'playlist_update':
        setPlaylist(message.playlist);
        break;
      case 'participants_update':
        setParticipants(message.participants);
        break;
      case 'pong': {
        const now = Date.now();
        clockOffsetRef.current = computeClockOffsetMs({
          clientSentAt: message.clientSentAt,
          serverReceivedAt: message.serverReceivedAt,
          serverRespondAt: message.serverRespondAt,
          clientReceivedAt: now,
        });
        break;
      }
      case 'error':
        console.warn('[SessionContext] server error:', message.message);
        break;
      default:
        break;
    }
  }, []);

  const joinSession = useCallback(
    (newSessionId: string, newParticipantId: string, displayName: string) => {
      setSessionId(newSessionId);
      setParticipantId(newParticipantId);

      const socket = new SyncSocket();
      socketRef.current = socket;
      socket.subscribe(handleServerMessage);
      socket.connect();
      socket.send({type: 'join', sessionId: newSessionId, participantId: newParticipantId, displayName});

      spotifyRemotePlayer.connect().catch(err => {
        console.warn('[SessionContext] spotify remote connect failed (stub 단계에서는 발생하지 않음)', err);
      });
    },
    [handleServerMessage],
  );

  const leaveSession = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    spotifyRemotePlayer.disconnect();
    setSessionId(null);
    setParticipantId(null);
    setPlayback(null);
    setPlaylist([]);
    setParticipants([]);
  }, []);

  const requestPlay = useCallback(() => socketRef.current?.send({type: 'play'}), []);
  const requestPause = useCallback(() => socketRef.current?.send({type: 'pause'}), []);
  const requestSeek = useCallback(
    (positionMs: number) => socketRef.current?.send({type: 'seek', positionMs}),
    [],
  );
  const requestNextTrack = useCallback(() => socketRef.current?.send({type: 'next_track'}), []);

  // 클록 동기화 ping — US-403/404
  useEffect(() => {
    if (!sessionId) {
      return;
    }
    const interval = setInterval(() => {
      socketRef.current?.send({type: 'ping', clientSentAt: Date.now()});
    }, CLOCK_SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [sessionId]);

  // 드리프트 보정 루프 — 서버 기준 위치와 로컬 플레이어 실제 위치를 비교해 필요 시 seek.
  useEffect(() => {
    if (!playback) {
      return;
    }
    const interval = setInterval(async () => {
      const localState = await spotifyRemotePlayer.getCurrentState();
      if (!localState) {
        return;
      }
      const expectedPositionMs = computeExpectedPositionMs({
        serverTimestamp: playback.serverTimestamp,
        positionMsAtServerTimestamp: playback.positionMs,
        isPlaying: playback.isPlaying,
        clockOffsetMs: clockOffsetRef.current,
        nowMs: Date.now(),
      });
      const driftMs = Math.abs(localState.positionMs - expectedPositionMs);

      if (driftMs > DRIFT_CORRECTION_THRESHOLD_MS) {
        setSyncStatus({state: 'resyncing', driftMs});
        await spotifyRemotePlayer.seek(expectedPositionMs);
        setSyncStatus({state: 'synced', driftMs: 0});
      } else {
        setSyncStatus({state: driftMs > 0 ? 'drifted' : 'synced', driftMs});
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [playback]);

  const value = useMemo<SessionContextValue>(
    () => ({
      sessionId,
      participantId,
      playback,
      playlist,
      participants,
      syncStatus,
      joinSession,
      leaveSession,
      requestPlay,
      requestPause,
      requestSeek,
      requestNextTrack,
    }),
    [
      sessionId,
      participantId,
      playback,
      playlist,
      participants,
      syncStatus,
      joinSession,
      leaveSession,
      requestPlay,
      requestPause,
      requestSeek,
      requestNextTrack,
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
