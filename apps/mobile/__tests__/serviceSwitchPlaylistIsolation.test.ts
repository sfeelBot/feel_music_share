import {afterEach, describe, expect, it} from '@jest/globals';
import {addTrack, createSession, getSession, switchService} from '../src/services/session/sessionService';
import type {Track} from '../src/types/domain';

const {__resetMockDatabase} = require('@react-native-firebase/database');

/**
 * 04-playlist.md "플레이리스트 구조" 절(서비스별 독립 보존, US-105b/US-105c/US-308) 검증 —
 * Spotify 전용/YouTube 전용 세션 전환 시 (1) 비활성 서비스의 곡 목록이 삭제되지 않고 그대로
 * 보존되는지, (2) 재생 위치(currentEntryId/positionMs)가 서비스별로 독립적으로 기억·복원되는지를
 * 데이터 계층(sessionService) 수준에서 직접 검증한다.
 *
 * 작업 지시 "검증 시나리오"를 그대로 코드화했다: Spotify 세션에서 A/B/C 추가 → YouTube로 전환
 * → YouTube는 비어있음 → YouTube에서 D 추가 → 다시 Spotify로 전환 → A/B/C 보존, D는 안 보임.
 *
 * (2026-07-27 RTDB 1라운드) `createSession`은 이제 RTDB 다중 경로 update()를 거치는 async
 * 함수라 await한다 — `addTrack`/`getSession`/`switchService`는 이번 라운드 범위 밖이라 여전히
 * 동기 함수 그대로다(sessionService.ts 상단 "부분 마이그레이션 상태" 주석 참고). `getSession`은
 * RTDB가 아니라 로컬 캐시를 읽으므로 이 테스트가 그대로 동기 호출을 유지할 수 있다.
 */

function track(id: string, title: string): Track {
  return {serviceTrackId: id, title, artist: '테스트 아티스트', durationMs: 200000};
}

function host() {
  return {participantId: 'host_switch', displayName: '지은', accountTier: 'premium' as const};
}

describe('서비스 전환 시 플레이리스트/재생 위치 독립 보존', () => {
  afterEach(() => {
    __resetMockDatabase();
  });

  it('비활성 서비스의 곡 목록은 전환 후에도 그대로 보존되고, 다른 서비스에 추가한 곡은 섞이지 않는다', async () => {
    const created = await createSession({sessionName: '전환 테스트', service: 'spotify', capacity: 2, host: host()});
    const me = created.participants[0];

    // (2026-07-27부터 createSession은 더 이상 데모 곡을 시드하지 않지만, 절대 개수에 의존하지
    // 않고 "추가로 넣은 A/B/C"의 존재 여부만으로 검증하는 기존 스타일을 그대로 유지한다.
    addTrack(created.sessionId, track('spotify:a', 'A'), me);
    addTrack(created.sessionId, track('spotify:b', 'B'), me);
    addTrack(created.sessionId, track('spotify:c', 'C'), me);

    const afterAdding = getSession(created.sessionId)!;
    const spotifyCountBeforeSwitch = afterAdding.playlists.spotify.entries.length;
    expect(afterAdding.playlists.youtube.entries).toHaveLength(0);
    expect(afterAdding.playlists.spotify.entries.map(e => e.track.title)).toEqual(
      expect.arrayContaining(['A', 'B', 'C']),
    );

    // Spotify → YouTube 전환: YouTube 쪽은 비어있어야 한다(검증 시나리오 1번째 조건).
    const switchedToYoutube = switchService(created.sessionId, 'youtube', me.participantId);
    expect(switchedToYoutube?.service).toBe('youtube');
    expect(switchedToYoutube?.playlists.youtube.entries).toHaveLength(0);
    // 전환 직후에도 Spotify 쪽 데이터는 살아있어야 한다(같은 시점에 함께 확인).
    expect(switchedToYoutube?.playlists.spotify.entries).toHaveLength(spotifyCountBeforeSwitch);

    // YouTube에서 D 추가 — 이제 활성 서비스가 youtube이므로 addTrack은 youtube 쪽에 쌓인다.
    addTrack(created.sessionId, track('youtube:d', 'D'), me);
    const afterAddingD = getSession(created.sessionId)!;
    expect(afterAddingD.playlists.youtube.entries.map(e => e.track.title)).toEqual(['D']);
    // D를 추가해도 Spotify 쪽은 전혀 건드리지 않는다.
    expect(afterAddingD.playlists.spotify.entries).toHaveLength(spotifyCountBeforeSwitch);

    // 다시 Spotify로 전환: A/B/C는 그대로, D는 보이지 않아야 한다(검증 시나리오 2번째 조건).
    const switchedBackToSpotify = switchService(created.sessionId, 'spotify', me.participantId);
    expect(switchedBackToSpotify?.service).toBe('spotify');
    const spotifyTitles = switchedBackToSpotify?.playlists.spotify.entries.map(e => e.track.title) ?? [];
    expect(spotifyTitles).toEqual(expect.arrayContaining(['A', 'B', 'C']));
    expect(spotifyTitles).not.toContain('D');
    // D는 삭제된 게 아니라 여전히 (비활성화된) YouTube 쪽에 보존돼 있어야 한다.
    expect(switchedBackToSpotify?.playlists.youtube.entries.map(e => e.track.title)).toEqual(['D']);
  });

  it('재생 위치(currentEntryId/positionMs)가 서비스별로 독립적으로 기억되고 복원된다', async () => {
    const created = await createSession({sessionName: '재생위치 테스트', service: 'spotify', capacity: 2, host: host()});
    const me = created.participants[0];

    addTrack(created.sessionId, track('spotify:a', 'A'), me);
    addTrack(created.sessionId, track('spotify:b', 'B'), me);
    const spotifyEntryA = getSession(created.sessionId)!.playlists.spotify.entries.find(e => e.track.title === 'A')!;

    // "지금 A를 50초 지점까지 들었다"는 상황을 시뮬레이션한다(실제로는 requestPlay 등을 거치지만,
    // 이 테스트는 sessionService 계층만 검증 대상이므로 playback을 직접 갱신한다).
    const live = getSession(created.sessionId)!;
    live.playback = {...live.playback, currentEntryId: spotifyEntryA.entryId, positionMs: 50000};

    // Spotify → YouTube: 아직 YouTube는 한 번도 활성화된 적 없으니 currentEntryId는 null이어야 한다.
    const toYoutube = switchService(created.sessionId, 'youtube', me.participantId);
    expect(toYoutube?.playback.currentEntryId).toBeNull();
    expect(toYoutube?.playback.positionMs).toBe(0);
    // 이탈 시점의 Spotify 재생 위치는 스냅샷으로 남아있어야 한다.
    expect(toYoutube?.playlists.spotify.lastPlayback).toEqual({currentEntryId: spotifyEntryA.entryId, positionMs: 50000});

    addTrack(created.sessionId, track('youtube:d', 'D'), me);
    const youtubeEntryD = getSession(created.sessionId)!.playlists.youtube.entries[0];
    const liveYoutube = getSession(created.sessionId)!;
    liveYoutube.playback = {...liveYoutube.playback, currentEntryId: youtubeEntryD.entryId, positionMs: 15000};

    // YouTube → Spotify: 이전에 A를 50초까지 들었던 위치 그대로 복원돼야 한다("이어서 쓸 수 있다").
    const backToSpotify = switchService(created.sessionId, 'spotify', me.participantId);
    expect(backToSpotify?.playback.currentEntryId).toBe(spotifyEntryA.entryId);
    expect(backToSpotify?.playback.positionMs).toBe(50000);
    // 떠나기 직전 YouTube 재생 위치도 마찬가지로 스냅샷에 남는다.
    expect(backToSpotify?.playlists.youtube.lastPlayback).toEqual({currentEntryId: youtubeEntryD.entryId, positionMs: 15000});

    // 다시 Spotify → YouTube: D를 15초까지 들었던 위치가 그대로 복원돼야 한다(서비스별 독립).
    const toYoutubeAgain = switchService(created.sessionId, 'youtube', me.participantId);
    expect(toYoutubeAgain?.playback.currentEntryId).toBe(youtubeEntryD.entryId);
    expect(toYoutubeAgain?.playback.positionMs).toBe(15000);
  });

  it('같은 서비스로 "전환"을 시도하면 아무것도 바뀌지 않는다', async () => {
    const created = await createSession({sessionName: '동일 서비스', service: 'spotify', capacity: 2, host: host()});
    const me = created.participants[0];
    const before = getSession(created.sessionId)!;
    const result = switchService(created.sessionId, 'spotify', me.participantId);
    expect(result?.service).toBe('spotify');
    expect(result?.playlists).toBe(before.playlists);
  });

  it('혼합 세션에서는 switchService가 아무 것도 하지 않는다(09문서 "결정 3")', async () => {
    const created = await createSession({
      sessionName: '혼합',
      service: 'mixed',
      capacity: 2,
      hostPlatform: 'spotify',
      host: host(),
    });
    const me = created.participants[0];
    const result = switchService(created.sessionId, 'youtube', me.participantId);
    expect(result).toBeUndefined();
  });
});
