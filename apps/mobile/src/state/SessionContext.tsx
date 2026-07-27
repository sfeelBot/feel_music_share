import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import * as sessionService from '../services/session/sessionService';
import type {JoinSessionResult} from '../services/session/sessionService';
import {activePlaylistEntries, withActivePlaylistEntries} from './activeServicePlaylist';
import {resolveParticipantMatch} from './mixedMatching';
import {advanceToNext, advanceToPrev, nextAfterRemoval, reorderWithinQueue} from './playlistSequencing';
import {canResignAdmin, canSwitchService} from './sessionPermissions';
import {generateId} from '../utils/id';
import type {
  MatchedTrackCandidate,
  MixedParticipantPlatform,
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
 * ## RTDB 1라운드(2026-07-27) 반영 사항
 *
 * `createSession`/`joinSession`은 이제 `sessionService`의 async 함수(RTDB 다중 경로 update()/set())를
 * 호출하므로 이 컨텍스트의 두 액션도 Promise를 반환하도록 바꿨다(호출부 CreateSessionScreen.tsx/
 * HomeScreen.tsx도 함께 `await`하도록 수정됨). 세션 생성/참여 이후에는 아래 useEffect가
 * `sessionService.subscribeToSession`(RTDB `onValue`)을 구독해 **참여자 목록만** 실시간으로
 * 반영한다 — 다른 기기가 같은 초대 코드로 참여하면 이 구독을 통해 참여자 목록이 갱신된다(10번
 * 문서 1라운드 "독립 검증 가능 근거" 시나리오). `participants` 필드만 병합하고 sessionName/
 * service/capacity/hostParticipantId는 건드리지 않는다 — `service`는 아직 로컬 전용인
 * `requestServiceSwitch`(3라운드 전까지 RTDB에 쓰이지 않음)가 낙관적으로 바꾸는 필드라, 구독이
 * 이 필드까지 덮어쓰면 "다른 참여자가 들어왔다"는 무관한 이벤트가 서비스 전환 상태를 되돌려버리는
 * 충돌이 생길 수 있어 의도적으로 범위를 좁혔다.
 *
 * TODO(Firebase 연동 — 다음 라운드, 정확한 교체 지점):
 * 1. `addTrack/removeTrack/reorderPlaylist` → 2-A라운드에서 RTDB `sessions/{id}/playlists/*`로 교체.
 * 2. `addMixedTrack`/매칭 함수들 → 2-B라운드에서 RTDB `mixedPlaylist`로 교체.
 * 3. `requestPlay/Pause/Seek/NextTrack` → 3라운드에서 Cloud Function 없이 RTDB `playback` 직접
 *    쓰기로 교체하고, 그 응답이 아니라 구독 채널로 돌아오는 새 playback 값을 반영하는 구조로
 *    바꿔야 한다(현재는 낙관적으로 로컬에서 바로 상태를 바꾸고 있음 — 서버 기준 시계 모델,
 *    05-sync-architecture.md 모델 A).
 * 4. `utils/clock.ts`의 클록 오프셋 계산(ping-pong)은 아직 어디에도 연결돼 있지 않다 — 3라운드가
 *    발급하는 서버 타임스탬프와 연결해야 실제로 의미가 생긴다.
 * 5. 참여자 목록의 실시간 연결 상태(connectionStatus)도 Firebase Presence 패턴(RTDB `onDisconnect`
 *    등)으로 교체 필요(4라운드) — 지금은 항상 'connected'로 고정된 목업.
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
    /** 혼합 세션(service==='mixed')일 때만 의미 있음 — 호스트가 2.6c에서 선택한 참여 플랫폼. */
    hostPlatform?: MixedParticipantPlatform;
    host: {participantId: string; displayName: string; accountTier: 'premium' | 'free'};
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
    joiningUser: {participantId: string; displayName: string; accountTier: 'premium' | 'free'};
    /** 혼합 세션일 때만 필요. 아직 선택 전이면 생략 — 결과가 reason:'platform_required'로 온다. */
    platform?: MixedParticipantPlatform;
  }) => Promise<JoinSessionResult>;
  leaveSession: () => void;
  requestPlay: () => void;
  requestPause: () => void;
  requestNextTrack: () => void;
  requestPrevTrack: () => void;
  /** Spotify/YouTube 전용 세션 전용. 혼합 세션에서는 addMixedTrack을 대신 쓴다. */
  addTrack: (track: Track) => void;
  /** Spotify/YouTube 전용, 혼합 세션 모두에서 동작한다(내부적으로 session.service로 분기). */
  removeTrack: (entryId: string) => void;
  /**
   * 대기열("다음 곡들") 안에서 곡을 한 칸 위/아래로 옮긴다 (US-303, 00-ux-flow.md 2.10b).
   * 이미 재생 완료된 곡·현재 재생 중인 곡은 이동 대상이 될 수 없다(정책 유지) — 아래 구현 참고.
   * Spotify/YouTube 전용, 혼합 세션 모두에서 동작한다.
   */
  requestMoveTrack: (entryId: string, direction: 'up' | 'down') => void;
  appointAdmin: (participantId: string) => void;
  revokeAdmin: (participantId: string) => void;
  /**
   * 세션 설정(00-ux-flow.md 2.13/2.13a/2.13b)의 "전환하기" 확정 시 호출 — 활성 서비스를
   * Spotify↔YouTube로 바꾼다. 방장/관리자만 허용(클라이언트 측 가드, `sessionPermissions.canSwitchService`
   * 재사용). 혼합 세션(session.service==='mixed')이나 대상 서비스가 이미 활성 서비스와 같으면
   * 아무 일도 하지 않는다 — 혼합 세션에는 이 개념 자체가 없다(09문서 "결정 3").
   *
   * TODO(Firebase 연동): 실제 권한 검증은 Cloud Functions가 서버 측에서 강제해야 한다
   * (04-playlist.md "디자인 에이전트 전달 사항" 6번 — appointAdmin/revokeAdmin과 동일 원칙).
   */
  requestServiceSwitch: (newService: 'spotify' | 'youtube') => void;
  /**
   * 관리자 본인이 스스로 일반사용자로 권한을 반납한다 (02-key-ui-patterns.md 6.4a절, 세션 설정
   * "내 역할" 영역의 "관리자 사임하기"). 호출자가 관리자가 아니면 아무 일도 하지 않는다.
   */
  resignAdmin: () => void;

  // ---- 혼합(Mixed) 세션 전용 (04-playlist.md "혼합 모드 플레이리스트 구조", 2026-07-26 신규) ----
  /** 지금 로그인한 참여자("나")가 이 혼합 세션에서 선택한 플랫폼. 혼합 세션이 아니면 null. */
  myPlatform: MixedParticipantPlatform | null;
  /**
   * 내가 내 플랫폼에서 검색해 고른 트랙을 플랫폼 중립 곡 항목으로 추가한다(00-ux-flow.md 2.11
   * "혼합 모드에서의 확장"). 내 매칭은 그 자리에서 곧바로 채워지고, 다른 참여자들의 매칭은
   * 비동기로 개별 진행된다.
   */
  addMixedTrack: (selected: {
    serviceTrackId: string;
    title: string;
    artist: string;
    albumArtUrl?: string;
    durationMs: number;
  }) => void;
  /** 매칭 확인 카드의 "확정하기" — 지금 표시 중인 매칭 결과를 그대로 채택 (2.11b). */
  confirmMyMatch: (entryId: string) => void;
  /** "다른 결과 보기"에서 대체 후보를 골랐을 때 — 즉시 확정하지 않고 다시 확인시킨다 (2.11c). */
  selectMyMatchCandidate: (entryId: string, candidate: MatchedTrackCandidate) => void;
  /** "직접 검색하기"로 내가 원하는 트랙을 스스로 지정 — 이 선택은 바로 최종 확정된다 (2.11/2.11d). */
  manualMatchTrack: (entryId: string, selected: {
    serviceTrackId: string;
    title: string;
    artist: string;
    albumArtUrl?: string;
    durationMs: number;
  }) => void;
  /** 매칭 실패 안내의 "이 곡 없이 넘어가기" — 이 곡 재생 구간 동안 나만 대기 상태로 넘어간다 (2.11d). */
  skipMyMatch: (entryId: string) => void;
  /** 내가 아직 확인/처리하지 않은 매칭 항목의 entryId 목록(2.11a "확인할 매칭 N개" 배지, 큐 순서). */
  myPendingMatchEntryIds: string[];
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
    const result = await sessionService.joinSessionByCode(params.inviteCode, params.joiningUser, params.platform);
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
  // participants 필드만 병합한다(service 등 아직 로컬 전용인 필드와의 충돌 방지).
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
      if (prev.service === 'mixed') {
        const {list, nextEntryId} = advanceToNext(prev.mixedPlaylist, prev.playback.currentEntryId);
        if (!nextEntryId) {return prev;}
        return {
          ...prev,
          mixedPlaylist: list,
          playback: {
            currentEntryId: nextEntryId,
            positionMs: 0,
            isPlaying: true,
            serverTimestamp: Date.now(),
            updatedByParticipantId: currentParticipantId ?? prev.hostParticipantId,
          },
        };
      }
      const {list, nextEntryId} = advanceToNext(activePlaylistEntries(prev), prev.playback.currentEntryId);
      if (!nextEntryId) {return prev;}
      return {
        ...prev,
        playlists: withActivePlaylistEntries(prev, list),
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
      if (prev.service === 'mixed') {
        const {list, prevEntryId} = advanceToPrev(prev.mixedPlaylist, prev.playback.currentEntryId);
        if (!prevEntryId) {return prev;}
        return {
          ...prev,
          mixedPlaylist: list,
          playback: {
            currentEntryId: prevEntryId,
            positionMs: 0,
            isPlaying: true,
            serverTimestamp: Date.now(),
            updatedByParticipantId: currentParticipantId ?? prev.hostParticipantId,
          },
        };
      }
      const {list, prevEntryId} = advanceToPrev(activePlaylistEntries(prev), prev.playback.currentEntryId);
      if (!prevEntryId) {return prev;}
      return {
        ...prev,
        playlists: withActivePlaylistEntries(prev, list),
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
        return {...prev, playlists: withActivePlaylistEntries(prev, entries)};
      });
    },
    [currentParticipantId],
  );

  const removeTrack = useCallback(
    (entryId: string) => {
      setSession(prev => {
        if (!prev) {return prev;}

        if (prev.service === 'mixed') {
          const wasCurrent = prev.playback.currentEntryId === entryId;
          const removedIndex = prev.mixedPlaylist.findIndex(e => e.entryId === entryId);
          const mixedPlaylistAfterRemoval = sessionService.removeMixedTrack(prev.sessionId, entryId);
          if (!wasCurrent) {
            return {...prev, mixedPlaylist: mixedPlaylistAfterRemoval};
          }
          const next = nextAfterRemoval(prev.mixedPlaylist, removedIndex);
          if (!next) {
            return {
              ...prev,
              mixedPlaylist: mixedPlaylistAfterRemoval,
              playback: {...prev.playback, currentEntryId: null, isPlaying: false, positionMs: 0},
            };
          }
          triggerTuning();
          const mixedPlaylist = mixedPlaylistAfterRemoval.map(entry =>
            entry.entryId === next.entryId ? {...entry, playedStatus: 'playing' as const} : entry,
          );
          return {
            ...prev,
            mixedPlaylist,
            playback: {
              currentEntryId: next.entryId,
              positionMs: 0,
              isPlaying: true,
              serverTimestamp: Date.now(),
              updatedByParticipantId: currentParticipantId ?? prev.hostParticipantId,
            },
          };
        }

        const wasCurrent = prev.playback.currentEntryId === entryId;
        const removedIndex = activePlaylistEntries(prev).findIndex(e => e.entryId === entryId);
        const playlistAfterRemoval = sessionService.removeTrack(prev.sessionId, entryId);

        if (!wasCurrent) {
          return {...prev, playlists: withActivePlaylistEntries(prev, playlistAfterRemoval)};
        }

        // 04-playlist.md 기능 목록 2번: 현재 재생 중인 곡이 삭제되면 남은 큐의 다음 곡으로 자동 전환한다.
        const next = nextAfterRemoval(activePlaylistEntries(prev), removedIndex);
        if (!next) {
          // 다음 곡이 없으면 "재생할 곡 없음" 상태를 유지한다(정상 동작).
          return {
            ...prev,
            playlists: withActivePlaylistEntries(prev, playlistAfterRemoval),
            playback: {...prev.playback, currentEntryId: null, isPlaying: false, positionMs: 0},
          };
        }

        triggerTuning();
        const playlist = playlistAfterRemoval.map(entry =>
          entry.entryId === next.entryId ? {...entry, playedStatus: 'playing' as const} : entry,
        );
        return {
          ...prev,
          playlists: withActivePlaylistEntries(prev, playlist),
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
   * US-303 실제 구현. `session.playlists[activeService].entries` 배열의 순서 자체가 재생 순서(커서 = playback.currentEntryId의
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
      if (prev.service === 'mixed') {
        const reordered = reorderWithinQueue(prev.mixedPlaylist, prev.playback.currentEntryId, entryId, direction);
        if (reordered === prev.mixedPlaylist) {return prev;}
        const mixedPlaylist = sessionService.reorderMixedPlaylist(prev.sessionId, reordered.map(e => e.entryId));
        return {...prev, mixedPlaylist};
      }
      const currentEntries = activePlaylistEntries(prev);
      const reordered = reorderWithinQueue(currentEntries, prev.playback.currentEntryId, entryId, direction);
      if (reordered === currentEntries) {return prev;}
      const playlist = sessionService.reorderPlaylist(prev.sessionId, reordered.map(e => e.entryId));
      return {...prev, playlists: withActivePlaylistEntries(prev, playlist)};
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

  /**
   * 서비스 전환 실행 (00-ux-flow.md 2.13a 확정 → 2.13b 오버레이 이후 호출). 낙관적 로컬 갱신 +
   * late join과 동일한 "맞추는 중" 표시(triggerTuning)를 함께 트리거해 09문서 개념 순서
   * (재생 중단 → 서비스 플래그 전환 → 새 플레이리스트 로드 → 재동기화)의 마지막 단계를 흉내낸다.
   *
   * (2026-07-26 데이터 수준 구현) `sessionService.switchService`가 이제 "이전 서비스의 재생 위치
   * 스냅샷 저장 + 새 서비스의 보존된 스냅샷 복원"까지 전부 계산해서 돌려주므로, 여기서는 그 결과
   * (`service`/`playlists`/`playback`)를 그대로 `prev` 위에 병합하기만 한다 — positionMs를 0으로
   * 강제 리셋하던 이전 로직은 제거했다(서비스별로 재생 위치를 독립적으로 기억·복원하는 것 자체가
   * 이번 작업의 핵심 요구사항이라 여기서 다시 0으로 덮어쓰면 안 된다).
   */
  const requestServiceSwitch = useCallback<SessionContextValue['requestServiceSwitch']>(
    newService => {
      if (!currentParticipantId) {return;}
      setSession(prev => {
        if (!prev || prev.service === 'mixed' || prev.service === newService) {return prev;}
        const me = prev.participants.find(p => p.participantId === currentParticipantId);
        // TODO(Firebase 연동): 서버(Cloud Functions) 측 권한 재검증 필요 — 이 가드는 클라이언트
        // 표시/오작동 방지용일 뿐이다(04-playlist.md "디자인 에이전트 전달 사항" 6번).
        if (!me || !canSwitchService(me.role)) {return prev;}
        const switched = sessionService.switchService(prev.sessionId, newService, currentParticipantId);
        if (!switched) {return prev;}
        return {
          ...prev,
          service: switched.service,
          playlists: switched.playlists,
          playback: switched.playback,
        };
      });
      triggerTuning();
    },
    [currentParticipantId, triggerTuning],
  );

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

  // ---- 혼합(Mixed) 세션 전용 (04-playlist.md, 09-cross-platform-mixed-mode.md "결정 2") ----

  const myPlatform = useMemo<MixedParticipantPlatform | null>(() => {
    if (!session || session.service !== 'mixed' || !currentParticipantId) {
      return null;
    }
    const me = session.participants.find(p => p.participantId === currentParticipantId);
    return me?.platform ?? null;
  }, [session, currentParticipantId]);

  const addMixedTrack = useCallback<SessionContextValue['addMixedTrack']>(
    selected => {
      if (!session || !currentParticipantId) {return;}
      const me = session.participants.find(p => p.participantId === currentParticipantId);
      if (!me || !me.platform) {return;}

      const common = {
        title: selected.title,
        artist: selected.artist,
        durationMs: selected.durationMs,
        thumbnailUrl: selected.albumArtUrl,
      };
      const adderMatch: MatchedTrackCandidate = {
        service: me.platform,
        serviceTrackId: selected.serviceTrackId,
        title: selected.title,
        artist: selected.artist,
        albumArtUrl: selected.albumArtUrl,
        durationMs: selected.durationMs,
        matchScore: 100,
        confidenceLevel: 'high',
      };
      const entryId = generateId('mixed_entry');

      setSession(prev => {
        if (!prev) {return prev;}
        const mixedPlaylist = sessionService.addMixedTrack(prev.sessionId, entryId, common, me, adderMatch);
        const playback =
          prev.playback.currentEntryId === null
            ? {
                currentEntryId: entryId,
                positionMs: 0,
                isPlaying: true,
                serverTimestamp: Date.now(),
                updatedByParticipantId: currentParticipantId,
              }
            : prev.playback;
        return {...prev, mixedPlaylist, playback};
      });

      // 04-playlist.md "혼합 모드 플레이리스트 구조": 곡을 추가한 사람뿐 아니라 세션에 참여 중인
      // 모든 참여자의 클라이언트가 각자 자신의 플랫폼에서 매칭을 시도한다. 각 참여자의 검색은
      // 서로 독립적으로 진행되고(09문서 결정 2-3), 끝나는 대로 하나씩 반영한다.
      session.participants
        .filter(p => p.participantId !== me.participantId)
        .forEach(participant => {
          resolveParticipantMatch(common, participant)
            .then(match => {
              setSession(prev => {
                if (!prev) {return prev;}
                const mixedPlaylist = sessionService.setParticipantMatch(
                  prev.sessionId,
                  entryId,
                  participant.participantId,
                  match,
                );
                return {...prev, mixedPlaylist};
              });
            })
            .catch(() => {
              setSession(prev => {
                if (!prev) {return prev;}
                const mixedPlaylist = sessionService.setParticipantMatch(prev.sessionId, entryId, participant.participantId, {
                  status: 'failed',
                  confirmState: 'pending',
                  candidates: [],
                  skipped: false,
                });
                return {...prev, mixedPlaylist};
              });
            });
        });
    },
    [session, currentParticipantId],
  );

  const confirmMyMatch = useCallback(
    (entryId: string) => {
      if (!currentParticipantId) {return;}
      setSession(prev => {
        if (!prev) {return prev;}
        const entry = prev.mixedPlaylist.find(e => e.entryId === entryId);
        const current = entry?.matches[currentParticipantId];
        if (!current || current.status !== 'matched') {return prev;}
        const mixedPlaylist = sessionService.setParticipantMatch(prev.sessionId, entryId, currentParticipantId, {
          ...current,
          confirmState: 'confirmed',
        });
        return {...prev, mixedPlaylist};
      });
    },
    [currentParticipantId],
  );

  const selectMyMatchCandidate = useCallback(
    (entryId: string, candidate: MatchedTrackCandidate) => {
      if (!currentParticipantId) {return;}
      setSession(prev => {
        if (!prev) {return prev;}
        const entry = prev.mixedPlaylist.find(e => e.entryId === entryId);
        const current = entry?.matches[currentParticipantId];
        if (!current) {return prev;}
        // 후보를 고르면 "선택 즉시 확정"하지 않고 다시 확인시킨다(00-ux-flow.md 2.11c) — 이전 track과
        // 남은 후보들을 다시 후보 목록으로 합쳐 넣어 되돌아갈 수 있게 한다.
        const remainingCandidates = [...current.candidates.filter(c => c.serviceTrackId !== candidate.serviceTrackId)];
        if (current.track && current.track.serviceTrackId !== candidate.serviceTrackId) {
          remainingCandidates.push(current.track);
        }
        remainingCandidates.sort((a, b) => b.matchScore - a.matchScore);
        const mixedPlaylist = sessionService.setParticipantMatch(prev.sessionId, entryId, currentParticipantId, {
          status: 'matched',
          track: candidate,
          confirmState: 'pending',
          candidates: remainingCandidates,
          skipped: false,
        });
        return {...prev, mixedPlaylist};
      });
    },
    [currentParticipantId],
  );

  const manualMatchTrack = useCallback<SessionContextValue['manualMatchTrack']>(
    (entryId, selected) => {
      if (!session || !currentParticipantId) {return;}
      const me = session.participants.find(p => p.participantId === currentParticipantId);
      if (!me || !me.platform) {return;}
      setSession(prev => {
        if (!prev) {return prev;}
        const track: MatchedTrackCandidate = {
          service: me.platform as MixedParticipantPlatform,
          serviceTrackId: selected.serviceTrackId,
          title: selected.title,
          artist: selected.artist,
          albumArtUrl: selected.albumArtUrl,
          durationMs: selected.durationMs,
          matchScore: 100,
          confidenceLevel: 'high',
        };
        const mixedPlaylist = sessionService.setParticipantMatch(prev.sessionId, entryId, currentParticipantId, {
          status: 'matched',
          track,
          confirmState: 'manual',
          candidates: [],
          skipped: false,
        });
        return {...prev, mixedPlaylist};
      });
    },
    [session, currentParticipantId],
  );

  const skipMyMatch = useCallback(
    (entryId: string) => {
      if (!currentParticipantId) {return;}
      setSession(prev => {
        if (!prev) {return prev;}
        const entry = prev.mixedPlaylist.find(e => e.entryId === entryId);
        const current = entry?.matches[currentParticipantId];
        if (!current) {return prev;}
        const mixedPlaylist = sessionService.setParticipantMatch(prev.sessionId, entryId, currentParticipantId, {
          ...current,
          skipped: true,
        });
        return {...prev, mixedPlaylist};
      });
    },
    [currentParticipantId],
  );

  const myPendingMatchEntryIds = useMemo(() => {
    if (!session || session.service !== 'mixed' || !currentParticipantId) {
      return [];
    }
    return session.mixedPlaylist
      .filter(entry => {
        const match = entry.matches[currentParticipantId];
        if (!match) {return false;}
        if (match.status === 'matched' && match.confirmState === 'pending') {return true;}
        if (match.status === 'failed' && !match.skipped) {return true;}
        return false;
      })
      .map(entry => entry.entryId);
  }, [session, currentParticipantId]);

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
      requestServiceSwitch,
      resignAdmin,
      myPlatform,
      addMixedTrack,
      confirmMyMatch,
      selectMyMatchCandidate,
      manualMatchTrack,
      skipMyMatch,
      myPendingMatchEntryIds,
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
      requestServiceSwitch,
      resignAdmin,
      myPlatform,
      addMixedTrack,
      confirmMyMatch,
      selectMyMatchCandidate,
      manualMatchTrack,
      skipMyMatch,
      myPendingMatchEntryIds,
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
