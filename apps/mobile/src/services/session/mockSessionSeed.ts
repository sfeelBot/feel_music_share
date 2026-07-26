import {pickerColors} from '../../theme/tokens';
import type {
  MixedParticipantPlatform,
  MixedPlaylistEntry,
  MusicService,
  ParticipantInfo,
  ParticipantMatch,
  PlaylistEntry,
  Track,
} from '../../types/domain';
import {generateId} from '../../utils/id';

/**
 * 데모/개발용 목업 데이터.
 *
 * TODO(Firebase 연동): 실제로는 세션 생성 시 호스트(로그인한 사용자) 한 명만 참여자로 시작하고,
 * 다른 참여자는 초대 코드로 실제 입장할 때 Firestore/RTDB에 추가되어야 한다. 지금은 백엔드가 없어
 * Now Playing / 플레이리스트 / 참여자 바텀시트 화면을 목업 데이터 없이 검증할 방법이 없으므로,
 * docs/design/03-screen-mockups.html 갤러리와 동일한 예시 인물·곡 이름을 그대로 시드 데이터로 썼다
 * (지은/민준/수아/준호, "우리가 걷던 밤" 등) — 디자인 목업과 나란히 비교 검증하기 쉽도록 하기 위함.
 */

export const RING_COLORS = [pickerColors.coral, pickerColors.amber, pickerColors.teal];

export function ringColorForIndex(index: number): string {
  return RING_COLORS[index % RING_COLORS.length];
}

const DEMO_OTHERS: Array<{displayName: string; accountTier: 'premium' | 'free'; delaySeconds: number}> = [
  {displayName: '민준', accountTier: 'premium', delaySeconds: 1.2},
  {displayName: '준호', accountTier: 'free', delaySeconds: 0},
];

/** 반대 플랫폼(혼합 세션의 다른 데모 참여자에게 배정 — 실제 크로스플랫폼 매칭 경로를 항상 하나는 보장). */
function opposite(platform: MixedParticipantPlatform): MixedParticipantPlatform {
  return platform === 'spotify' ? 'youtube' : 'spotify';
}

/**
 * 데모 참여자를 시드한다. `capacity`를 절대 초과하지 않는다(정원보다 시드 인원이 많아지는
 * 모순 방지 — 검증 라운드 1, 4.16). 기본 정원 2명이면 호스트 1명만 남고, 정원이 늘어날수록
 * DEMO_OTHERS를 순서대로 추가한다.
 *
 * (2026-07-26 확장, 혼합 세션) `service === 'mixed'`일 때만 각 참여자에게 `platform`을 배정한다.
 * 구현 판단: 데모 참여자 1명은 호스트와 "반대" 플랫폼, 나머지 1명은 호스트와 "같은" 플랫폼으로
 * 고정 배정한다 — 이렇게 하면 시드 상태만으로도 (a) 진짜 크로스플랫폼 매칭 경로(호스트 vs 반대
 * 플랫폼 참여자)와 (b) 동일 플랫폼이지만 독립적으로 재검색하는 경로를 둘 다 항상 확인할 수 있다.
 */
export function buildDemoParticipants(
  host: {participantId: string; displayName: string; accountTier: 'premium' | 'free'},
  capacity: number,
  service: MusicService = 'spotify',
  hostPlatform: MixedParticipantPlatform = 'spotify',
): ParticipantInfo[] {
  const isMixed = service === 'mixed';
  const hostEntry: ParticipantInfo = {
    participantId: host.participantId,
    displayName: host.displayName,
    ringColor: ringColorForIndex(0),
    role: 'host',
    accountTier: host.accountTier,
    connectionStatus: 'connected',
    delaySeconds: 0,
    platform: isMixed ? hostPlatform : undefined,
  };

  const otherSlots = Math.max(0, Math.min(DEMO_OTHERS.length, capacity - 1));
  const others: ParticipantInfo[] = DEMO_OTHERS.slice(0, otherSlots).map((demo, index) => ({
    participantId: generateId('demo_participant'),
    displayName: demo.displayName,
    ringColor: ringColorForIndex(index + 1),
    role: 'regular',
    accountTier: demo.accountTier,
    connectionStatus: 'connected',
    delaySeconds: demo.delaySeconds,
    platform: isMixed ? (index === 0 ? opposite(hostPlatform) : hostPlatform) : undefined,
  }));

  return [hostEntry, ...others];
}

const demoTracks: Track[] = [
  {
    serviceTrackId: 'spotify:track:demo1',
    title: '우리가 걷던 밤',
    artist: '코스모스',
    durationMs: 225000,
  },
  {
    serviceTrackId: 'spotify:track:demo2',
    title: '새벽의 파도',
    artist: '하늘소리',
    durationMs: 198000,
  },
  {
    serviceTrackId: 'spotify:track:demo3',
    title: '여름, 그날',
    artist: '잔잔한 파도',
    durationMs: 210000,
  },
];

export function buildDemoPlaylist(participants: ParticipantInfo[]): PlaylistEntry[] {
  const [host, second, third] = participants;
  const pickers = [second ?? host, host, third ?? host];
  return demoTracks.map((track, index) => ({
    entryId: generateId('entry'),
    track,
    addedByParticipantId: pickers[index].participantId,
    addedByDisplayName: pickers[index].displayName,
    addedAt: Date.now() - (demoTracks.length - index) * 60000,
    playedStatus: index === 0 ? 'playing' : 'pending',
  }));
}

/**
 * `demoTracks`와 같은 곡을 YouTube에서 찾았다고 가정한 플레이스홀더 매칭 결과(제목에 편집 표기가
 * 붙은 형태 — `services/youtube/youtubeMockSearch.ts`의 목업 카탈로그와 같은 톤으로 맞춤,
 * 다만 결합도를 낮추기 위해 그 파일을 직접 import하지는 않았다).
 */
const demoYoutubeVariants: Array<{titleSuffix: string; durationMs: number}> = [
  {titleSuffix: ' (Official Video)', durationMs: 231000},
  {titleSuffix: ' - Live Session', durationMs: 204000},
  {titleSuffix: ' (Lyric Video)', durationMs: 213000},
];

/**
 * 혼합 세션 전용 데모 플레이리스트 시드 (04-playlist.md "혼합 모드 플레이리스트 구조").
 *
 * 구현 판단(로그에도 남김): 시드 데이터는 순수 목업 표시 목적이라, 실제 네트워크 검색
 * (services/matching/trackMatcher.ts의 findMatchesOnPlatform)을 호출하지 않고 결정론적인 합성
 * 매칭 결과를 만든다 — 기존 buildDemoPlaylist/buildDemoParticipants도 항상 정적 데이터였던 것과
 * 같은 패턴(실제 서비스 응답을 흉내낼 뿐 검증하지 않음). 실제 API/매칭 파이프라인은 "새 곡 추가"
 * 시점(sessionService.addMixedTrack)에만 실행된다 — 거기가 이번 라운드의 핵심 검증 대상.
 * 시드 항목은 참여자 전원이 이미 confirmState='confirmed' 상태로 시작한다(첫 진입 시 매칭 확인
 * 큐가 곧바로 3건씩 쌓여 있으면 데모/QA 흐름이 번거로워지므로) — "새로 추가한 곡"만 pending 큐를
 * 거치도록 의도한 판단이다.
 */
export function buildDemoMixedPlaylist(participants: ParticipantInfo[]): MixedPlaylistEntry[] {
  const [host, second, third] = participants;
  const pickers = [second ?? host, host, third ?? host];

  return demoTracks.map((track, index) => {
    const variant = demoYoutubeVariants[index % demoYoutubeVariants.length];
    const matches: Record<string, ParticipantMatch> = {};

    participants.forEach(participant => {
      const platform = participant.platform ?? 'spotify';
      const isYoutube = platform === 'youtube';
      const matchedTrack = isYoutube
        ? {
            service: 'youtube' as const,
            serviceTrackId: `youtube:video:demo${index + 1}`,
            title: `${track.title}${variant.titleSuffix}`,
            artist: track.artist,
            durationMs: variant.durationMs,
            matchScore: 90,
            confidenceLevel: 'high' as const,
          }
        : {
            service: 'spotify' as const,
            serviceTrackId: track.serviceTrackId,
            title: track.title,
            artist: track.artist,
            durationMs: track.durationMs,
            matchScore: 100,
            confidenceLevel: 'high' as const,
          };
      matches[participant.participantId] = {
        status: 'matched',
        track: matchedTrack,
        confirmState: 'confirmed',
        candidates: [],
        skipped: false,
      };
    });

    return {
      entryId: generateId('mixed_entry'),
      title: track.title,
      artist: track.artist,
      representativeThumbnailUrl: undefined,
      representativeDurationMs: track.durationMs,
      addedByParticipantId: pickers[index].participantId,
      addedByDisplayName: pickers[index].displayName,
      addedAt: Date.now() - (demoTracks.length - index) * 60000,
      playedStatus: index === 0 ? 'playing' : 'pending',
      matches,
    };
  });
}
