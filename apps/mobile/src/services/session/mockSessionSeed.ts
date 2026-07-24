import {pickerColors} from '../../theme/tokens';
import type {ParticipantInfo, PlaylistEntry, Track} from '../../types/domain';
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

export function buildDemoParticipants(host: {
  participantId: string;
  displayName: string;
  accountTier: 'premium' | 'free';
}): ParticipantInfo[] {
  return [
    {
      participantId: host.participantId,
      displayName: host.displayName,
      ringColor: ringColorForIndex(0),
      role: 'host',
      accountTier: host.accountTier,
      connectionStatus: 'connected',
      delaySeconds: 0,
    },
    {
      participantId: generateId('demo_participant'),
      displayName: '민준',
      ringColor: ringColorForIndex(1),
      role: 'regular',
      accountTier: 'premium',
      connectionStatus: 'connected',
      delaySeconds: 1.2,
    },
    {
      participantId: generateId('demo_participant'),
      displayName: '준호',
      ringColor: ringColorForIndex(1),
      role: 'regular',
      accountTier: 'free',
      connectionStatus: 'connected',
      delaySeconds: 0,
    },
  ];
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
