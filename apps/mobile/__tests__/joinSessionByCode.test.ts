import {afterEach, describe, expect, it} from '@jest/globals';
import {createSession, joinSessionByCode} from '../src/services/session/sessionService';

const {__resetMockDatabase} = require('@react-native-firebase/database');

/**
 * "코드로 참여하기" — RTDB 1라운드(2026-07-27) 이후의 실제 흐름을 시뮬레이션한다.
 * createSession/joinSessionByCode는 이제 RTDB 다중 경로 update()/set()을 거치는 async 함수라
 * 매 호출을 await한다(__mocks__/@react-native-firebase/database.js가 in-memory 페이크로 대신함).
 *
 * (2026-07-27 변경) createSession은 더 이상 데모 참여자 2명을 자동으로 채우지 않는다 — 실제
 * RTDB 참여자 레코드는 호스트 1명만으로 시작하고, 다른 참여자는 이 테스트처럼 joinSessionByCode로
 * 실제 추가되어야 한다(sessionService.ts 상단 "데모 참여자/데모 플레이리스트 시드를 이 라운드에서
 * 제거했다" 주석 참고). 그래서 기존 "capacity-1까지 데모로 이미 채워져 있다"는 전제로 짜여있던
 * 정원 테스트도 이번에 다시 작성했다 — 정원까지 직접 join을 반복해 채운다.
 *
 * (2026-07-28 YouTube 단일화) createSession/joinSessionByCode 시그니처에서 service/hostPlatform/
 * platform/accountTier 인자가 사라졌다 — 혼합(mixed) 세션 참여 관련 두 케이스(platform_required 반환,
 * platform과 함께 참여)는 대상 개념 자체가 없어져 삭제했다(docs/specs/11-youtube-only-migration-plan.md
 * 1-D "테스트 재작성 대상" 참고).
 */
describe('joinSessionByCode', () => {
  afterEach(() => {
    __resetMockDatabase();
  });

  function host() {
    return {participantId: 'host_1', displayName: '지은'};
  }

  it('참여자를 정상적으로 추가하고 정원/역할/링컬러를 채운다', async () => {
    const session = await createSession({sessionName: '테스트 방', capacity: 4, host: host()});
    expect(session.participants).toHaveLength(1);

    const result = await joinSessionByCode(session.inviteCode, {
      participantId: 'guest_1',
      displayName: '민준',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {return;}
    expect(result.participant.role).toBe('regular');
    expect(result.session.participants).toHaveLength(2);
    expect(result.session.participants.map(p => p.participantId)).toContain('guest_1');
  });

  it('초대 코드는 대소문자를 구분하지 않고, 앞뒤 공백도 허용한다', async () => {
    const session = await createSession({sessionName: '테스트 방', capacity: 4, host: host()});

    const result = await joinSessionByCode(`  ${session.inviteCode.toLowerCase()}  `, {
      participantId: 'guest_2',
      displayName: '수아',
    });

    expect(result.ok).toBe(true);
  });

  it('존재하지 않는 초대 코드는 not_found를 반환한다', async () => {
    const result = await joinSessionByCode('ZZZZZZ', {
      participantId: 'guest_3',
      displayName: '준호',
    });

    expect(result).toEqual({ok: false, reason: 'not_found'});
  });

  it('정원이 가득 찬 세션은 capacity_full을 반환하고 참여자를 추가하지 않는다', async () => {
    const session = await createSession({sessionName: '둘만의 방', capacity: 2, host: host()});
    expect(session.participants).toHaveLength(1);

    const first = await joinSessionByCode(session.inviteCode, {
      participantId: 'guest_4',
      displayName: '민준',
    });
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.session.participants).toHaveLength(2);
    }

    const second = await joinSessionByCode(session.inviteCode, {
      participantId: 'guest_5',
      displayName: '수아',
    });
    expect(second).toEqual({ok: false, reason: 'capacity_full'});
  });

  it('이미 참여 중인 참여자가 같은 코드로 다시 참여를 시도하면 정원 검사 없이 그대로 합류시킨다', async () => {
    const session = await createSession({sessionName: '테스트 방', capacity: 2, host: host()});
    const joined = await joinSessionByCode(session.inviteCode, {
      participantId: 'guest_8',
      displayName: '민준',
    });
    expect(joined.ok).toBe(true);
    if (!joined.ok) {return;}
    const fullCount = joined.session.participants.length;
    expect(fullCount).toBe(session.capacity);

    // 정원이 이미 가득 찬 상태지만, 같은 participantId로 재입장하면 실패하지 않는다(인원이 늘지도 않는다).
    const rejoin = await joinSessionByCode(session.inviteCode, {
      participantId: 'guest_8',
      displayName: '민준',
    });
    expect(rejoin.ok).toBe(true);
    if (!rejoin.ok) {return;}
    expect(rejoin.session.participants).toHaveLength(fullCount);
  });
});
