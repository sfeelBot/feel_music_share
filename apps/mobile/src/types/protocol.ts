/**
 * 실시간 WebSocket 프로토콜 메시지 타입 (MVP 스코프)
 *
 * 근거 문서: docs/specs/05-sync-architecture.md (서버 기준 시계 모델),
 *           docs/specs/04-playlist.md (플레이리스트 실시간 이벤트)
 *
 * NOTE: backend(apps/backend/src/types/protocol.ts)와 중복 정의됨 — domain.ts와 동일한 이유로
 * MVP 단계에서는 의도적으로 중복 허용. 두 파일을 항상 함께 수정할 것.
 */
import type {PlaybackState, PlaylistEntry, ParticipantInfo} from './domain';

export type ClientMessage =
  | {type: 'join'; sessionId: string; participantId: string; displayName: string}
  | {type: 'play'}
  | {type: 'pause'}
  | {type: 'seek'; positionMs: number}
  | {type: 'next_track'}
  | {type: 'ping'; clientSentAt: number};

export type ServerMessage =
  | {type: 'session_state'; sessionId: string; playback: PlaybackState; playlist: PlaylistEntry[]; participants: ParticipantInfo[]}
  | {type: 'playback_update'; playback: PlaybackState}
  | {type: 'playlist_update'; playlist: PlaylistEntry[]}
  | {type: 'participants_update'; participants: ParticipantInfo[]}
  | {type: 'pong'; clientSentAt: number; serverReceivedAt: number; serverRespondAt: number}
  | {type: 'error'; message: string};
