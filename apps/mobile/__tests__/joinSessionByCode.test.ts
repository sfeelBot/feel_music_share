import {describe, expect, it} from '@jest/globals';
import {createSession, joinSessionByCode} from '../src/services/session/sessionService';

/**
 * "코드로 참여하기" 순수 로직 검증 — 같은 프로세스 안에서 세션 생성 → 참여 흐름을 시뮬레이션한다.
 * sessionService의 in-memory Map은 모듈 스코프라 테스트 간에도 유지되지만, createSession이 매번
 * generateId 기반 고유 sessionId/inviteCode를 발급하므로 테스트끼리 서로 간섭하지 않는다.
 */
describe('joinSessionByCode', () => {
  function host() {
    return {participantId: 'host_1', displayName: '지은', accountTier: 'premium' as const};
  }

  it('참여자를 정상적으로 추가하고 정원/역할/링컬러를 채운다', () => {
    // mockSessionSeed.buildDemoParticipants가 capacity-1까지 데모 참여자를 미리 채워 넣으므로
    // (capacity 4 → 호스트 1 + 데모 2 = 3명, 정원 안에 정확히 1자리가 남는다), 기존 인원수를
    // 하드코딩하지 않고 세션이 실제로 반환한 값을 기준으로 검증한다.
    const session = createSession({sessionName: '테스트 방', service: 'spotify', capacity: 4, host: host()});
    const before = session.participants.length;

    const result = joinSessionByCode(session.inviteCode, {
      participantId: 'guest_1',
      displayName: '민준',
      accountTier: 'free',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {return;}
    expect(result.participant.role).toBe('regular');
    expect(result.participant.platform).toBeUndefined();
    expect(result.session.participants).toHaveLength(before + 1);
    expect(result.session.participants.map(p => p.participantId)).toContain('guest_1');
  });

  it('초대 코드는 대소문자를 구분하지 않고, 앞뒤 공백도 허용한다', () => {
    const session = createSession({sessionName: '테스트 방', service: 'spotify', capacity: 4, host: host()});

    const result = joinSessionByCode(`  ${session.inviteCode.toLowerCase()}  `, {
      participantId: 'guest_2',
      displayName: '수아',
      accountTier: 'free',
    });

    expect(result.ok).toBe(true);
  });

  it('존재하지 않는 초대 코드는 not_found를 반환한다', () => {
    const result = joinSessionByCode('ZZZZZZ', {
      participantId: 'guest_3',
      displayName: '준호',
      accountTier: 'free',
    });

    expect(result).toEqual({ok: false, reason: 'not_found'});
  });

  it('정원이 가득 찬 세션은 capacity_full을 반환하고 참여자를 추가하지 않는다', () => {
    // capacity 4 → 데모 시드로 이미 3명(호스트+데모 2명)이 채워져 정확히 1자리만 남는다
    // (mockSessionSeed.buildDemoParticipants — otherSlots = min(2, capacity-1)).
    const session = createSession({sessionName: '둘만의 방', service: 'spotify', capacity: 4, host: host()});
    expect(session.participants.length).toBe(session.capacity - 1);

    const first = joinSessionByCode(session.inviteCode, {
      participantId: 'guest_4',
      displayName: '민준',
      accountTier: 'free',
    });
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.session.participants).toHaveLength(session.capacity);
    }

    const second = joinSessionByCode(session.inviteCode, {
      participantId: 'guest_5',
      displayName: '수아',
      accountTier: 'free',
    });
    expect(second).toEqual({ok: false, reason: 'capacity_full'});
  });

  it('혼합 세션은 platform 없이 호출하면 platform_required를 반환하고 참여자를 추가하지 않는다', () => {
    const session = createSession({
      sessionName: '혼합 방',
      service: 'mixed',
      capacity: 4,
      hostPlatform: 'spotify',
      host: host(),
    });
    const before = session.participants.length;

    const result = joinSessionByCode(session.inviteCode, {
      participantId: 'guest_6',
      displayName: '민준',
      accountTier: 'free',
    });

    expect(result).toEqual({ok: false, reason: 'platform_required'});
    expect(session.participants).toHaveLength(before);
  });

  it('혼합 세션은 platform과 함께 호출하면 그 플랫폼으로 참여자를 추가한다', () => {
    const session = createSession({
      sessionName: '혼합 방',
      service: 'mixed',
      capacity: 4,
      hostPlatform: 'spotify',
      host: host(),
    });

    const result = joinSessionByCode(
      session.inviteCode,
      {participantId: 'guest_7', displayName: '수아', accountTier: 'free'},
      'youtube',
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {return;}
    expect(result.participant.platform).toBe('youtube');
  });

  it('이미 참여 중인 참여자가 같은 코드로 다시 참여를 시도하면 정원 검사 없이 그대로 합류시킨다', () => {
    // capacity 4 → 데모 시드로 3명이 이미 채워져 있어, guest_8이 참여하면 정원이 꽉 찬다(4/4).
    const session = createSession({sessionName: '테스트 방', service: 'spotify', capacity: 4, host: host()});
    const joined = joinSessionByCode(session.inviteCode, {
      participantId: 'guest_8',
      displayName: '민준',
      accountTier: 'free',
    });
    expect(joined.ok).toBe(true);
    if (!joined.ok) {return;}
    const fullCount = joined.session.participants.length;
    expect(fullCount).toBe(session.capacity);

    // 정원이 이미 가득 찬 상태지만, 같은 participantId로 재입장하면 실패하지 않는다(인원이 늘지도 않는다).
    const rejoin = joinSessionByCode(session.inviteCode, {
      participantId: 'guest_8',
      displayName: '민준',
      accountTier: 'free',
    });
    expect(rejoin.ok).toBe(true);
    if (!rejoin.ok) {return;}
    expect(rejoin.session.participants).toHaveLength(fullCount);
  });
});
