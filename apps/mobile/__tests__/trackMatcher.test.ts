import {describe, expect, it} from '@jest/globals';
import {confidenceLevelForScore, rankCandidates, scoreCandidate} from '../src/services/matching/trackMatcher';

describe('trackMatcher', () => {
  const common = {title: '우리가 걷던 밤', artist: '코스모스', durationMs: 225000};

  it('scores an exact title/artist/duration match near 100', () => {
    const score = scoreCandidate(common, {
      serviceTrackId: 'x',
      title: '우리가 걷던 밤',
      artist: '코스모스',
      durationMs: 225000,
    });
    expect(score).toBeGreaterThanOrEqual(95);
    expect(confidenceLevelForScore(score)).toBe('high');
  });

  it('tolerates edition suffixes like (Live) / - Topic in title/artist', () => {
    const score = scoreCandidate(common, {
      serviceTrackId: 'x',
      title: '우리가 걷던 밤 (Live)',
      artist: '코스모스 - Topic',
      durationMs: 232000, // 7초 차이
    });
    expect(score).toBeGreaterThanOrEqual(70);
  });

  it('scores unrelated title/artist low', () => {
    const score = scoreCandidate(common, {
      serviceTrackId: 'x',
      title: '완전히 다른 곡',
      artist: '다른 아티스트',
      durationMs: 100000,
    });
    expect(score).toBeLessThan(40);
    expect(confidenceLevelForScore(score)).toBe('low');
  });

  it('penalizes same title but different artist (동명이곡 오매칭 방지)', () => {
    const sameArtist = scoreCandidate(common, {
      serviceTrackId: 'a',
      title: '우리가 걷던 밤',
      artist: '코스모스',
      durationMs: 225000,
    });
    const differentArtist = scoreCandidate(common, {
      serviceTrackId: 'b',
      title: '우리가 걷던 밤',
      artist: '전혀다른아티스트',
      durationMs: 225000,
    });
    expect(differentArtist).toBeLessThan(sameArtist);
  });

  it('rankCandidates sorts by score descending and attaches platform/confidence', () => {
    const ranked = rankCandidates(common, 'youtube', [
      {serviceTrackId: 'low', title: '다른 곡', artist: '다른 아티스트', durationMs: 90000},
      {serviceTrackId: 'high', title: '우리가 걷던 밤', artist: '코스모스', durationMs: 225000},
    ]);
    expect(ranked[0].serviceTrackId).toBe('high');
    expect(ranked[0].service).toBe('youtube');
    expect(ranked[0].matchScore).toBeGreaterThan(ranked[1].matchScore);
  });
});
