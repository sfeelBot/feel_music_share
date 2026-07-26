import {describe, expect, it} from '@jest/globals';
import {
  advanceToNext,
  advanceToPrev,
  nextAfterRemoval,
  reorderWithinQueue,
} from '../src/state/playlistSequencing';

type Entry = {entryId: string; playedStatus: 'pending' | 'playing' | 'played'};

function seed(): Entry[] {
  return [
    {entryId: 'a', playedStatus: 'playing'},
    {entryId: 'b', playedStatus: 'pending'},
    {entryId: 'c', playedStatus: 'pending'},
  ];
}

describe('playlistSequencing', () => {
  it('advanceToNext marks previous as played and next as playing', () => {
    const {list, nextEntryId} = advanceToNext(seed(), 'a');
    expect(nextEntryId).toBe('b');
    expect(list.find(e => e.entryId === 'a')?.playedStatus).toBe('played');
    expect(list.find(e => e.entryId === 'b')?.playedStatus).toBe('playing');
  });

  it('advanceToNext returns null nextEntryId at the end of the list', () => {
    const {nextEntryId} = advanceToNext(seed(), 'c');
    expect(nextEntryId).toBeNull();
  });

  it('advanceToPrev is the mirror of advanceToNext', () => {
    const list = seed();
    list[0].playedStatus = 'played';
    list[1].playedStatus = 'playing';
    const {prevEntryId, list: updated} = advanceToPrev(list, 'b');
    expect(prevEntryId).toBe('a');
    expect(updated.find(e => e.entryId === 'a')?.playedStatus).toBe('playing');
    expect(updated.find(e => e.entryId === 'b')?.playedStatus).toBe('pending');
  });

  it('nextAfterRemoval returns the entry right after the removed index', () => {
    const original = seed();
    expect(nextAfterRemoval(original, 0)?.entryId).toBe('b');
    expect(nextAfterRemoval(original, 2)).toBeUndefined();
  });

  it('reorderWithinQueue only swaps entries after the currently playing one', () => {
    const list = seed();
    const moved = reorderWithinQueue(list, 'a', 'c', 'up');
    expect(moved.map(e => e.entryId)).toEqual(['a', 'c', 'b']);
    // 현재 재생 중인 곡 쪽으로는 못 넘어간다.
    const blocked = reorderWithinQueue(list, 'a', 'b', 'up');
    expect(blocked).toBe(list);
  });
});
