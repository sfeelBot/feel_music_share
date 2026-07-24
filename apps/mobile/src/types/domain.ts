/**
 * 도메인 타입 정의 (MVP 스코프)
 *
 * 근거 문서: docs/specs/04-playlist.md, docs/specs/05-sync-architecture.md
 *
 * NOTE: 현재는 backend(apps/backend/src/types/domain.ts)와 이 파일이 내용상 중복된다.
 * 모노레포 워크스페이스에 shared 패키지를 만들어 단일 소스로 관리하는 것이 이상적이지만,
 * MVP 스캐폴딩 단계에서는 과도한 추상화를 피하기 위해 의도적으로 중복을 허용했다.
 * 두 파일의 필드가 어긋나지 않도록 항상 함께 수정할 것.
 */

/** MVP는 Spotify만 지원한다 (docs/specs/06 참고). 필드는 향후 YouTube 추가를 대비해 문자열 리터럴 유니온으로 둔다. */
export type MusicService = 'spotify';

export interface Track {
  /** Spotify track URI (예: spotify:track:xxxx) */
  serviceTrackId: string;
  title: string;
  artist: string;
  albumArtUrl?: string;
  durationMs: number;
}

export interface ParticipantInfo {
  participantId: string;
  displayName: string;
  avatarUrl?: string;
  isHost: boolean;
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected';
}

export interface PlaylistEntry {
  entryId: string;
  track: Track;
  addedByParticipantId: string;
  addedByDisplayName: string;
  addedAt: number; // epoch ms
  playedStatus: 'pending' | 'playing' | 'played';
}

/**
 * 서버가 관리하는 단일 진실 공급원(source of truth) 재생 상태.
 * 05-sync-architecture.md의 "모델 A: 서버 기준 시계"를 따른다.
 */
export interface PlaybackState {
  currentEntryId: string | null;
  /** 마지막으로 상태가 갱신된 시점의 재생 위치(ms) */
  positionMs: number;
  isPlaying: boolean;
  /** 이 상태가 서버에 기록된 시각(epoch ms). 클라이언트는 클록 오프셋을 적용해 현재 예상 위치를 계산한다. */
  serverTimestamp: number;
  updatedByParticipantId: string;
}

export interface SessionState {
  sessionId: string;
  inviteCode: string;
  service: MusicService;
  hostParticipantId: string;
  participants: ParticipantInfo[];
  playlist: PlaylistEntry[];
  playback: PlaybackState;
}
