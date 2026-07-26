import {findMatchesOnPlatform, type CommonTrackIdentity} from '../services/matching/trackMatcher';
import type {ParticipantInfo, ParticipantMatch} from '../types/domain';

/**
 * "곡을 추가한 사람이 아닌" 다른 참여자 한 명의 매칭을 비동기로 계산한다
 * (04-playlist.md "참여자별 매칭 트랙 계층", 09-cross-platform-mixed-mode.md "결정 2").
 *
 * 스코프 판단(중요, implementation-log.md에도 동일하게 남김): 이 앱은 아직 "코드로 세션 참여"가
 * 동작하지 않아(HomeScreen.tsx, TODO) 실제로는 이 기기에 로그인된 사람(currentParticipantId)이
 * 항상 세션의 유일한 실사용자이고, 나머지 참여자는 UI 검증용 데모 인물이다. 데모 참여자는 실제
 * Spotify 계정(accessToken)이 없으므로, 이 함수는 platform === 'spotify'인 비-본인 참여자에 대해
 * 실제 Spotify Web API를 호출하지 않고 곧바로 매칭 실패로 처리한다(가짜 매칭 결과를 지어내지
 * 않는다는 원칙 — 09문서가 요구하는 "불완전함을 감추지 않는다"는 태도와도 일치). platform ===
 * 'youtube'인 참여자는 목업 검색(services/youtube/youtubeMockSearch.ts)에 토큰이 필요 없으므로
 * 실제로 검색·랭킹까지 수행한다.
 */
export async function resolveParticipantMatch(
  common: CommonTrackIdentity,
  participant: ParticipantInfo,
): Promise<ParticipantMatch> {
  const platform = participant.platform ?? 'spotify';

  if (platform === 'spotify') {
    return {status: 'failed', confirmState: 'pending', candidates: [], skipped: false};
  }

  const ranked = await findMatchesOnPlatform(common, 'youtube', null);
  const [top, ...rest] = ranked;
  if (!top) {
    return {status: 'failed', confirmState: 'pending', candidates: [], skipped: false};
  }
  return {status: 'matched', track: top, confirmState: 'pending', candidates: rest, skipped: false};
}
