import {describe, expect, it} from '@jest/globals';
import {resolveQueueEntryId} from '../src/state/matchQueueNavigation';

describe('matchQueueNavigation.resolveQueueEntryId', () => {
  it('returns undefined when the queue is empty', () => {
    expect(resolveQueueEntryId([])).toBeUndefined();
  });

  it('shows the first pending entry when nothing has been skipped', () => {
    expect(resolveQueueEntryId(['a', 'b'])).toBe('a');
  });

  // R7.13 최소 재현 시나리오: 대기 항목이 정확히 2건일 때 첫 항목을 처리(확정 등)하면
  // 두 번째 항목이 실제로 보여야 한다(기존 버그는 이 경우 시트가 조기 종료됐다).
  it('shows the second entry after the first is processed and removed from the pending list (N=2)', () => {
    const beforeProcessing = ['a', 'b'];
    expect(resolveQueueEntryId(beforeProcessing)).toBe('a');
    // 'a'를 확정/스킵/수동교체로 처리하면 SessionContext의 myPendingMatchEntryIds가 재계산되며
    // 'a'가 실제로 빠진다 — 여기서는 그 재계산 결과를 직접 시뮬레이션한다.
    const afterProcessingA = ['b'];
    expect(resolveQueueEntryId(afterProcessingA)).toBe('b');
  });

  // 3건 이상일 때 항목이 통째로 건너뛰어지지 않아야 한다 — 순서대로 a → b → c 전부 표시.
  it('walks through all entries in order without skipping any when N=3', () => {
    let pending = ['a', 'b', 'c'];
    expect(resolveQueueEntryId(pending)).toBe('a');
    pending = pending.filter(id => id !== 'a'); // 'a' 처리 완료
    expect(resolveQueueEntryId(pending)).toBe('b');
    pending = pending.filter(id => id !== 'b'); // 'b' 처리 완료
    expect(resolveQueueEntryId(pending)).toBe('c');
    pending = pending.filter(id => id !== 'c'); // 'c' 처리 완료
    expect(resolveQueueEntryId(pending)).toBeUndefined();
  });

  // "다음" 버튼으로 아직 처리하지 않은 항목을 넘겨보는 경우(현재 UI에는 트리거하는 버튼이
  // 없지만, 향후 추가될 수 있는 동작) — 처리와 무관하게 skippedIds로 별도 추적된다.
  it('skips over entries the user has only viewed-past (not yet processed) via skippedIds', () => {
    const pending = ['a', 'b', 'c'];
    const skipped = new Set(['a']);
    expect(resolveQueueEntryId(pending, skipped)).toBe('b');
  });

  // 대기 중인 항목을 전부 넘겨봤지만 아무것도 처리하지 않았다면("이전" 버튼이 없으므로) 목록의
  // 첫 항목으로 되돌아가 사용자가 건너뛴 항목을 다시 볼 수 있어야 한다.
  it('wraps back to the first pending entry once every pending entry has been skipped-past', () => {
    const pending = ['a', 'b', 'c'];
    const skippedAll = new Set(['a', 'b', 'c']);
    expect(resolveQueueEntryId(pending, skippedAll)).toBe('a');
  });

  // "넘겨봄"과 "처리돼서 빠짐"이 동시에 섞여도 정확해야 한다 — a는 넘겨봤을 뿐 여전히
  // pendingIds에 남아있고, b는 실제로 처리돼 빠졌다.
  it('correctly distinguishes a skipped-but-still-pending entry from a processed-and-removed one', () => {
    const pendingAfterProcessingB = ['a', 'c']; // b는 처리되어 이미 배열에서 빠짐
    const skipped = new Set(['a']); // a는 그냥 넘겨봤을 뿐 아직 처리 안 함
    expect(resolveQueueEntryId(pendingAfterProcessingB, skipped)).toBe('c');
  });
});
