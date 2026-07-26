/**
 * `session.playlist`(Spotify/YouTube 전용)와 `session.mixedPlaylist`(혼합) 둘 다 "배열 순서 =
 * 재생 순서(커서 = playback.currentEntryId의 인덱스)"라는 동일한 불변식을 쓴다(SessionContext.tsx
 * 기존 주석 참고). 혼합 세션 추가로 이 로직이 두 번째로 필요해져서(Spotify/YouTube 전용 1번 +
 * 혼합 1번) 여기로 추출했다 — 순수 함수라 단위 테스트도 쉽다.
 */
export interface SequencedEntry {
  entryId: string;
  playedStatus: 'pending' | 'playing' | 'played';
}

export function findCurrentIndex<T extends SequencedEntry>(list: T[], currentEntryId: string | null): number {
  return list.findIndex(e => e.entryId === currentEntryId);
}

export function advanceToNext<T extends SequencedEntry>(
  list: T[],
  currentEntryId: string | null,
): {list: T[]; nextEntryId: string | null} {
  const idx = findCurrentIndex(list, currentEntryId);
  const next = list[idx + 1];
  if (!next) {
    return {list, nextEntryId: null};
  }
  const updated = list.map(entry => {
    if (entry.entryId === currentEntryId) {
      return {...entry, playedStatus: 'played' as const};
    }
    if (entry.entryId === next.entryId) {
      return {...entry, playedStatus: 'playing' as const};
    }
    return entry;
  });
  return {list: updated, nextEntryId: next.entryId};
}

export function advanceToPrev<T extends SequencedEntry>(
  list: T[],
  currentEntryId: string | null,
): {list: T[]; prevEntryId: string | null} {
  const idx = findCurrentIndex(list, currentEntryId);
  const previous = idx > 0 ? list[idx - 1] : undefined;
  if (!previous) {
    return {list, prevEntryId: null};
  }
  const updated = list.map(entry => {
    if (entry.entryId === currentEntryId) {
      return {...entry, playedStatus: 'pending' as const};
    }
    if (entry.entryId === previous.entryId) {
      return {...entry, playedStatus: 'playing' as const};
    }
    return entry;
  });
  return {list: updated, prevEntryId: previous.entryId};
}

/** 현재 재생 중인 곡이 삭제됐을 때 자동 전환할 다음 곡(원래 배열 기준) — removedIndex는 삭제 "전" 배열의 인덱스여야 한다. */
export function nextAfterRemoval<T extends SequencedEntry>(originalList: T[], removedIndex: number): T | undefined {
  return removedIndex >= 0 ? originalList[removedIndex + 1] : undefined;
}

/**
 * "다음 곡들" 큐 안에서만 순서 변경을 허용한다(재생 완료 + 현재 재생 중인 곡은 이동 대상 아님) —
 * requestMoveTrack의 swap 로직. 이동이 허용되지 않으면 원본 배열을 그대로 반환한다.
 */
export function reorderWithinQueue<T extends SequencedEntry>(
  list: T[],
  currentEntryId: string | null,
  entryId: string,
  direction: 'up' | 'down',
): T[] {
  const currentIndex = findCurrentIndex(list, currentEntryId);
  const idx = list.findIndex(e => e.entryId === entryId);
  if (idx < 0 || idx <= currentIndex) {
    return list;
  }
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx <= currentIndex || targetIdx >= list.length) {
    return list;
  }
  const reordered = [...list];
  [reordered[idx], reordered[targetIdx]] = [reordered[targetIdx], reordered[idx]];
  return reordered;
}
