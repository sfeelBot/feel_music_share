import {searchSpotifyTracks, type SpotifySearchTrack} from '../spotify/spotifyWebApi';
import {searchYoutubeTracks} from '../youtube/youtubeSearch';
import type {MatchConfidenceLevel, MatchedTrackCandidate, MixedParticipantPlatform} from '../../types/domain';

/**
 * 혼합(Mixed) 세션 곡 매칭 휴리스틱 (09-cross-platform-mixed-mode.md 1·2절, 04-playlist.md
 * "혼합 모드 플레이리스트 구조" 절, 02-key-ui-patterns.md 5.3절).
 *
 * 중요(스코프 판단, CLAUDE.md/작업 지시 근거): YouTube는 ISRC 등 표준 식별자를 노출하지 않아
 * "제목 유사도 + 아티스트 일치 + 길이 오차" 조합의 휴리스틱에 의존할 수밖에 없다는 것이 09문서의
 * 확정 결론이다. 정확한 가중치/임계값은 "실측 스파이크 이후 확정"이 09문서 "결정 4"의 명시적 권고라,
 * 이 파일의 상수(WEIGHTS, 등급 임계값)는 합리적으로 보이는 기본값일 뿐 실측 근거가 없다 — 아래
 * TODO 주석에 조정 지점을 명확히 남긴다. 임의로 "정밀한" 값을 확정하지 않았다.
 */

// TODO(실측 필요, 09-cross-platform-mixed-mode.md "결정 4"): 아래 가중치는 스펙 문서의 정성적 제안
// ("아티스트 일치에 가장 높은 가중치") 하나만 반영한 합리적 기본값이다. 다양한 곡 표본으로 매칭
// 성공률/오매칭률을 실측한 뒤 조정해야 한다.
export const MATCH_WEIGHTS = {
  artist: 0.45,
  title: 0.35,
  duration: 0.2,
} as const;

// TODO(실측 필요): 등급 경계값도 마찬가지로 임시 기본값이다. 02-key-ui-patterns.md 5.2절 목업 예시
// (92%=높음, 74%=중간, 48%=낮음)와 모순되지 않는 범위로 잡았다.
export const MATCH_CONFIDENCE_THRESHOLDS = {
  high: 85,
  medium: 60,
} as const;

// TODO(실측 필요, 09문서 2절 "길이 임계값"): 길이 오차 허용치. 예: ±2~3초는 "거의 같은 편집",
// 그 이상은 다른 에디션(라이브/리믹스)일 가능성이 커진다고 간주하는 완만한 단계 함수로 근사했다.
const DURATION_SCORE_STEPS_SEC = [
  {maxDiffSec: 2, score: 1},
  {maxDiffSec: 5, score: 0.75},
  {maxDiffSec: 10, score: 0.45},
  {maxDiffSec: 20, score: 0.15},
] as const;

/** 길이 오차가 이 이상이면 매칭 확인 카드에 "라이브/리믹스일 수 있어요" 안내를 덧붙인다 (00-ux-flow.md 2.11b). */
export const DURATION_MISMATCH_NOTICE_THRESHOLD_SEC = 5;

export interface CommonTrackIdentity {
  title: string;
  artist: string;
  durationMs: number;
}

interface RawCandidate {
  serviceTrackId: string;
  title: string;
  artist: string;
  albumArtUrl?: string;
  durationMs: number;
}

/** 제목 정규화 — 괄호/특수문자/공백을 제거해 "(Live)", "(Official Video)" 같은 표기 차이를 완화한다. */
function normalizeTitle(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[[({][^\])}]*[\])}]/g, ' ') // 괄호류 안 내용 제거 (Live), [MV], {Remastered} 등
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // 특수문자 제거(유니코드 문자/숫자만 남김)
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeArtist(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s*-\s*topic$/i, '') // YouTube 자동 생성 채널 접미사 "- Topic" 제거
    .replace(/official$/i, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Levenshtein 편집 거리 기반 유사도(0~1). 순수 JS 구현 — 새 의존성 추가하지 않기 위함. */
function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) {
    return 1;
  }
  if (!a.length || !b.length) {
    return 0;
  }
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dist = Array.from({length: rows}, (_, i) => {
    const row = new Array<number>(cols).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j < cols; j += 1) {
    dist[0][j] = j;
  }
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dist[i][j] = Math.min(dist[i - 1][j] + 1, dist[i][j - 1] + 1, dist[i - 1][j - 1] + cost);
    }
  }
  const maxLen = Math.max(a.length, b.length);
  return 1 - dist[rows - 1][cols - 1] / maxLen;
}

function titleSimilarity(a: string, b: string): number {
  return levenshteinSimilarity(normalizeTitle(a), normalizeTitle(b));
}

/** 아티스트 일치도(0/0.6/1) — 완전 일치, 부분 포함(한쪽이 다른 쪽을 포함), 불일치 세 단계. */
function artistMatchScore(a: string, b: string): number {
  const na = normalizeArtist(a);
  const nb = normalizeArtist(b);
  if (!na || !nb) {
    return 0;
  }
  if (na === nb) {
    return 1;
  }
  if (na.includes(nb) || nb.includes(na)) {
    return 0.6;
  }
  return 0;
}

function durationScore(msA: number, msB: number): number {
  const diffSec = Math.abs(msA - msB) / 1000;
  for (const step of DURATION_SCORE_STEPS_SEC) {
    if (diffSec <= step.maxDiffSec) {
      return step.score;
    }
  }
  return 0;
}

export function confidenceLevelForScore(score: number): MatchConfidenceLevel {
  if (score >= MATCH_CONFIDENCE_THRESHOLDS.high) {
    return 'high';
  }
  if (score >= MATCH_CONFIDENCE_THRESHOLDS.medium) {
    return 'medium';
  }
  return 'low';
}

/** 공통 식별자 대비 후보 하나의 일치율(0~100)을 계산한다. */
export function scoreCandidate(common: CommonTrackIdentity, candidate: RawCandidate): number {
  const tScore = titleSimilarity(common.title, candidate.title);
  const aScore = artistMatchScore(common.artist, candidate.artist);
  const dScore = durationScore(common.durationMs, candidate.durationMs);
  const weighted =
    tScore * MATCH_WEIGHTS.title + aScore * MATCH_WEIGHTS.artist + dScore * MATCH_WEIGHTS.duration;
  return Math.round(weighted * 100);
}

/** 원시 검색 결과 목록을 일치율 내림차순으로 랭킹한 매칭 후보 목록으로 변환한다. */
export function rankCandidates(
  common: CommonTrackIdentity,
  platform: MixedParticipantPlatform,
  rawCandidates: RawCandidate[],
): MatchedTrackCandidate[] {
  return rawCandidates
    .map(candidate => {
      const matchScore = scoreCandidate(common, candidate);
      return {
        service: platform,
        serviceTrackId: candidate.serviceTrackId,
        title: candidate.title,
        artist: candidate.artist,
        albumArtUrl: candidate.albumArtUrl,
        durationMs: candidate.durationMs,
        matchScore,
        confidenceLevel: confidenceLevelForScore(matchScore),
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

/** 길이 오차가 안내 문구를 띄울 만큼 큰지 (00-ux-flow.md 2.11b "ⓘ 원곡과 길이가 조금 달라요"). */
export function shouldShowDurationMismatchNotice(common: CommonTrackIdentity, track: MatchedTrackCandidate): boolean {
  return Math.abs(common.durationMs - track.durationMs) / 1000 >= DURATION_MISMATCH_NOTICE_THRESHOLD_SEC;
}

/**
 * 특정 플랫폼에서 공통 식별자(제목/아티스트)로 검색해 랭킹된 후보 목록을 얻는다.
 * Spotify는 accessToken이 필요하다(없으면 빈 배열 — "이 참여자는 검색을 수행할 수 없음"으로 취급,
 * 아래 sessionService.ts의 스코프 판단 주석 참고). YouTube는 API 키 기반 검색이라 토큰이 필요 없다.
 */
export async function findMatchesOnPlatform(
  common: CommonTrackIdentity,
  platform: MixedParticipantPlatform,
  accessToken: string | null,
): Promise<MatchedTrackCandidate[]> {
  const query = `${common.title} ${common.artist}`.trim();
  if (!query) {
    return [];
  }
  let raw: SpotifySearchTrack[] = [];
  if (platform === 'youtube') {
    raw = await searchYoutubeTracks(query);
  } else if (accessToken) {
    raw = await searchSpotifyTracks(query, accessToken);
  }
  return rankCandidates(common, platform, raw);
}
