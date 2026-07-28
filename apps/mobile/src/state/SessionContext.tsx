import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import * as sessionService from '../services/session/sessionService';
import type {JoinSessionResult} from '../services/session/sessionService';
import {advanceToNext, advanceToPrev, nextAfterRemoval, reorderWithinQueue} from './playlistSequencing';
import {canResignAdmin} from './sessionPermissions';
import type {ParticipantInfo, PlaylistEntry, SessionState, SyncStatusValue, Track} from '../types/domain';

/**
 * 세션(방)의 상태를 앱 전역에 제공하는 컨텍스트.
 *
 * NOTE(Firebase 확정에 따른 변경, 중요): 이전 라운드 스캐폴딩은 자체 WebSocket 서버(services/realtime/socket.ts,
 * 이번 라운드에서 제거)에 연결해 실시간 이벤트를 주고받는 구조였다. CLAUDE.md/06번 문서가 백엔드를
 * Firebase로 확정하면서 그 커스텀 서버 자체가 존재하지 않게 됐고, services/session/sessionService.ts의
 * 인메모리 목업/RTDB 혼합 구조로 대체했다.
 *
 * ## RTDB 1라운드(2026-07-27) 반영 사항
 *
 * `createSession`/`joinSession`은 이제 `sessionService`의 async 함수(RTDB 다중 경로 update()/set())를
 * 호출하므로 이 컨텍스트의 두 액션도 Promise를 반환하도록 바꿨다(호출부 CreateSessionScreen.tsx/
 * HomeScreen.tsx도 함께 `await`하도록 수정됨). 세션 생성/참여 이후에는 아래 useEffect가
 * `sessionService.subscribeToSession`(RTDB `onValue`)을 구독해 **참여자 목록만** 실시간으로
 * 반영한다 — 다른 기기가 같은 초대 코드로 참여하면 이 구독을 통해 참여자 목록이 갱신된다(10번
 * 문서 1라운드 "독립 검증 가능 근거" 시나리오). `participants` 필드만 병합하고 sessionName/
 * capacity/hostParticipantId는 건드리지 않는다.
 *
 * ## 2라운드(2026-07-28) — YouTube 단일 플랫폼 전환(데이터 모델 단순화)
 *
 * 근거: docs/decision-log.md 2026-07-28 "Spotify 지원 완전 제거 + 혼합(Mixed) 세션 모드 제거",
 * docs/specs/11-youtube-only-migration-plan.md(라운드 1). 서비스 전환(`requestServiceSwitch`)과
 * 혼합(Mixed) 세션 전용 액션(`myPlatform`/`addMixedTrack`/`confirmMyMatch`/`selectMyMatchCandidate`/
 * `manualMatchTrack`/`skipMyMatch`/`myPendingMatchEntryIds`) 전부를 제거했다 — 세션이 항상
 * YouTube 하나뿐이라 대상 개념 자체가 없어졌다. `requestNextTrack`/`requestPrevTrack`/`removeTrack`/
 * `requestMoveTrack`의 `prev.service === 'mixed'` 분기도 함께 제거하고, `state/activeServicePlaylist.ts`
 * (서비스별 활성 플레이리스트 간접 계층, 이번 라운드에서 파일째 삭제)를 거치지 않고 `session.entries`를
 * 직접 다룬다.
 *
 * TODO(Firebase 연동 — 다음 라운드, 정확한 교체 지점):
 * 1. `addTrack/removeTrack/reorderPlaylist` → RTDB `sessions/{id}/playlists/*`로 교체.
 * 2. `requestPlay/Pause/Seek/NextTrack` → Cloud Function 없이 RTDB `playback` 직접 쓰기로 교체하고,
 *    그 응답이 아니라 구독 채널로 돌아오는 새 playback 값을 반영하는 구조로 바꿔야 한다(현재는
 *    낙관적으로 로컬에서 바로 상태를 바꾸고 있음 — 서버 기준 시계 모델, 05-sync-architecture.md
 *    모델 A).
 * 3. `utils/clock.ts`의 클록 오프셋 계산(ping-pong)은 아직 어디에도 연결돼 있지 않다 — 서버
 *    타임스탬프와 연결해야 실제로 의미가 생긴다.
 * 4. 참여자 목록의 실시간 연결 상태(connectionStatus)도 Firebase Presence 패턴(RTDB `onDisconnect`
 *    등)으로 교체 필요 — 지금은 항상 'connected'로 고정된 목업.
 */

interface SessionContextValue {
  session: SessionState | null;
  currentParticipantId: string | null;
  isHost: boolean;
  syncStatus: SyncStatusValue;
  createSession: (params: {
    sessionName: string;
    capacity: number;
    host: {participantId: string; displayName: string};
  }) => Promise<SessionState>;
  /**
   * "코드로 참여하기"(HomeScreen.tsx) — 초대 코드로 기존 세션에 참여자로 합류한다. createSession과
   * 대칭적으로, 성공/실패를 화면이 분기할 수 있도록 결과를 그대로 반환한다(성공 시에만 session/
   * currentParticipantId를 갱신하고, 실패 시에는 로컬 상태를 건드리지 않는다).
   * RTDB 1라운드부터 실제 원격(다른 기기가 만든) 세션도 초대 코드로 조회/참여할 수 있다 —
   * sessionService.joinSessionByCode 주석 참고.
   */
  joinSession: (params: {
    inviteCode: string;
    joiningUser: {participantId: string; displayName: string};
  }) => Promise<JoinSessionResult>;
  leaveSession: () => void;
  requestPlay: () => void;
  requestPause: () => void;
  requestNextTrack: () => void;
  requestPrevTrack: () => void;
  addTrack: (track: Track) => void;
  removeTrack: (entryId: string) => void;
  /**
   * 대기열("다음 곡들") 안에서 곡을 한 칸 위/아래로 옮긴다 (US-303, 00-ux-flow.md 2.10b).
   * 이미 재생 완료된 곡·현재 재생 중인 곡은 이동 대상이 될 수 없다(정책 유지) — 아래 구현 참고.
   */
  requestMoveTrack: (entryId: string, direction: 'up' | 'down') => void;
  appointAdmin: (participantId: string) => void;
  revokeAdmin: (participantId: string) => void;
  /**
   * 관리자 본인이 스스로 일반사용자로 권한을 반납한다 (02-key-ui-patterns.md 6.4a절, 세션 설정
   * "내 역할" 영역의 "관리자 사임하기"). 호출자가 관리자가 아니면 아무 일도 하지 않는다.
   */
  resignAdmin: () => void;
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

  const createSession = useCallback<SessionContextValue['createSession']>(async params => {
    const created = await sessionService.createSession(params);
    setSession(created);
    setCurrentParticipantId(params.host.participantId);
    return created;
  }, []);

  const joinSession = useCallback<SessionContextValue['joinSession']>(async params => {
    const result = await sessionService.joinSessionByCode(params.inviteCode, params.joiningUser);
    if (result.ok) {
      setSession(result.session);
      setCurrentParticipantId(result.participant.participantId);
    }
    return result;
  }, []);

  const leaveSession = useCallback(() => {
    setSession(null);
    setCurrentParticipantId(null);
  }, []);

  // RTDB 1라운드: 다른 기기가 같은 초대 코드로 참여하면 이 세션의 참여자 목록이 실시간으로
  // 갱신되어야 한다(10번 문서 "독립 검증 가능 근거"). 파일 상단 주석 참고 — 의도적으로
  // participants 필드만 병합한다.
  useEffect(() => {
    const sessionId = session?.sessionId;
    if (!sessionId) {
      return undefined;
    }
    const unsubscribe = sessionService.subscribeToSession(sessionId, snapshot => {
      if (!snapshot) {
        return;
      }
      setSession(prev => {
        if (!prev || prev.sessionId !== sessionId) {
          return prev;
        }
        return {...prev, participants: snapshot.participants};
      });
    });
    return unsubscribe;
  }, [session?.sessionId]);

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
      const {list, nextEntryId} = advanceToNext(prev.entries, prev.playback.currentEntryId);
      if (!nextEntryId) {return prev;}
      return {
        ...prev,
        entries: list,
        playback: {
          currentEntryId: nextEntryId,
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
      const {list, prevEntryId} = advanceToPrev(prev.entries, prev.playback.currentEntryId);
      if (!prevEntryId) {return prev;}
      return {
        ...prev,
        entries: list,
        playback: {
          currentEntryId: prevEntryId,
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
        const entries = sessionService.addTrack(prev.sessionId, track, me);
        return {...prev, entries};
      });
    },
    [currentParticipantId],
  );

  const removeTrack = useCallback(
    (entryId: string) => {
      setSession(prev => {
        if (!prev) {return prev;}

        const wasCurrent = prev.playback.currentEntryId === entryId;
        const removedIndex = prev.entries.findIndex(e => e.entryId === entryId);
        const entriesAfterRemoval = sessionService.removeTrack(prev.sessionId, entryId);

        if (!wasCurrent) {
          return {...prev, entries: entriesAfterRemoval};
        }

        // 04-playlist.md 기능 목록 2번: 현재 재생 중인 곡이 삭제되면 남은 큐의 다음 곡으로 자동 전환한다.
        const next = nextAfterRemoval(prev.entries, removedIndex);
        if (!next) {
          // 다음 곡이 없으면 "재생할 곡 없음" 상태를 유지한다(정상 동작).
          return {
            ...prev,
            entries: entriesAfterRemoval,
            playback: {...prev.playback, currentEntryId: null, isPlaying: false, positionMs: 0},
          };
        }

        triggerTuning();
        const entries = entriesAfterRemoval.map(entry =>
          entry.entryId === next.entryId ? {...entry, playedStatus: 'playing' as const} : entry,
        );
        return {
          ...prev,
          entries,
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

  /**
   * US-303 실제 구현. `session.entries` 배열의 순서 자체가 재생 순서(커서 = playback.currentEntryId의
   * 인덱스)를 뜻하므로 — requestNextTrack/requestPrevTrack/removeTrack이 모두 이 불변식에 의존한다 —
   * 재정렬 가능 범위를 "현재 재생 중인 곡의 인덱스보다 뒤(= 아직 재생되지 않은 다음 곡들)"로만 제한한다.
   * 그 앞(재생 완료 + 현재 재생 중)은 절대 이동하지 않는다(00-ux-flow.md 2.10b "재생 완료 섹션은
   * 읽기 전용" 정책과 "현재 재생 중인 곡은 드래그 핸들 없음" 정책 둘 다 여기서 함께 보장된다).
   *
   * TODO(Firebase 연동): sessionService.reorderPlaylist가 Cloud Function 호출로 교체되면, 낙관적
   * 로컬 갱신 대신 서버가 확정한 순서를 구독(onSnapshot/onValue)해서 반영해야 한다(04-playlist.md
   * "동시 편집 처리" 절 — 마지막 조작 우선 적용).
   */
  const requestMoveTrack = useCallback((entryId: string, direction: 'up' | 'down') => {
    setSession(prev => {
      if (!prev) {return prev;}
      const reordered = reorderWithinQueue(prev.entries, prev.playback.currentEntryId, entryId, direction);
      if (reordered === prev.entries) {return prev;}
      const entries = sessionService.reorderPlaylist(prev.sessionId, reordered.map(e => e.entryId));
      return {...prev, entries};
    });
  }, []);

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

  const resignAdmin = useCallback(() => {
    if (!currentParticipantId) {return;}
    setSession(prev => {
      if (!prev) {return prev;}
      const me = prev.participants.find(p => p.participantId === currentParticipantId);
      if (!me || !canResignAdmin(me.role)) {return prev;}
      const participants = sessionService.revokeAdmin(prev.sessionId, currentParticipantId);
      return {...prev, participants};
    });
  }, [currentParticipantId]);

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
      joinSession,
      leaveSession,
      requestPlay,
      requestPause,
      requestNextTrack,
      requestPrevTrack,
      addTrack,
      removeTrack,
      requestMoveTrack,
      appointAdmin,
      revokeAdmin,
      resignAdmin,
    }),
    [
      session,
      currentParticipantId,
      isHost,
      syncStatus,
      createSession,
      joinSession,
      leaveSession,
      requestPlay,
      requestPause,
      requestNextTrack,
      requestPrevTrack,
      addTrack,
      removeTrack,
      requestMoveTrack,
      appointAdmin,
      revokeAdmin,
      resignAdmin,
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
