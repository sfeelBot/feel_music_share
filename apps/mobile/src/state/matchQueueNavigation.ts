/**
 * 매칭 확인 큐(00-ux-flow.md 2.11a, `MatchingQueueSheet.tsx`)에서 "지금 보여줄 entryId"를
 * 계산하는 순수 로직.
 *
 * ## R7.13 버그와 이 파일이 존재하는 이유
 * 기존 구현은 숫자 `cursor` state를 두고 처리(확정/스킵/수동교체) 직후 `goToNextInQueue`가
 * `myPendingMatchEntryIds.length`를 기준으로 `cursor + 1`을 계산했다. 그런데 "①처리 함수 호출
 * (confirmMyMatch/skipMyMatch/manualMatchTrack) → ②커서 갱신"이 같은 이벤트 핸들러 안에서
 * 동기적으로 실행되고, React가 이 두 `setState` 호출을 한 번에 배칭하기 때문에 ②가 참조하는
 * `myPendingMatchEntryIds.length`는 아직 "①로 처리될 항목이 빠지지 않은" 이전 렌더의 값이었다.
 * 다음 렌더에서 실제로 재계산되는 `myPendingMatchEntryIds`(`SessionContext.tsx`의
 * `useMemo`)는 처리된 항목이 실제로 제거된 더 짧은 배열인데, 커서는 이미 "처리 전 길이" 기준으로
 * +1 된 상태라 한 칸 더 앞서가 버렸다 — 대기 항목이 정확히 2건이면 시트가 조기 종료되고, 3건
 * 이상이면 항목이 통째로 건너뛰어졌다(`docs/qa/spotify-mvp-round1-checklist.md` Round 7 R7.13).
 *
 * ## 왜 인덱스(cursor) 대신 entryId 기준인가
 * 이 큐의 "다음으로 이동"에는 근본적으로 서로 다른 두 의미가 섞여 있다:
 * 1. **처리돼서 실제로 빠짐** — 확정/스킵/수동교체된 항목은 `myPendingMatchEntryIds`에서
 *    다음 렌더에 자연히 제거된다. 이 경우 "다음 항목"은 그냥 새로 계산된 배열의 첫 항목이다.
 * 2. **아직 처리하지 않았지만 일단 넘겨서 봄** — (현재 UI에는 이 액션을 트리거하는 버튼이
 *    없지만, 이전 라운드 구현 로그가 "다음 버튼으로 미처리 항목을 건너뛰는 것도 가능"이라고
 *    언급한 것처럼 향후 추가될 수 있는 동작이다.) 이 경우 항목은 `myPendingMatchEntryIds`에
 *    여전히 남아 있으므로, 배열 자체가 아니라 "이번 시트가 열려 있는 동안 넘겨본 entryId
 *    집합"을 별도로 추적해야 한다.
 *
 * 이 둘을 "숫자 인덱스 +1"이라는 단일 연산으로 뭉뚱그리면, 처리로 인한 배열 길이 변화와 단순
 * 열람으로 인한 위치 이동이 서로 다른 시점에 반영되면서 R7.13류의 stale-length 경합이 다시
 * 발생하기 쉽다. entryId를 직접 추적하면 "배열에서 실제로 빠짐"과 "그냥 넘겨봄"이 서로 다른
 * 데이터(배열 자체 vs 넘겨본 id 집합)로 구조적으로 분리되어, 배열 길이가 언제 바뀌는지와
 * 무관하게 항상 올바른 다음 항목을 가리킨다 — React state batching 여부에 의존하지 않는다.
 */
export function resolveQueueEntryId(
  pendingIds: readonly string[],
  skippedIds: ReadonlySet<string> = new Set(),
): string | undefined {
  if (pendingIds.length === 0) {
    return undefined;
  }
  // 아직 넘겨보지 않은 첫 항목을 보여준다(= 처리된 항목은 pendingIds 자체에서 이미 빠져 있으므로
  // 별도 계산 없이 자연스럽게 다음 항목이 앞으로 온다).
  const firstUnseen = pendingIds.find(id => !skippedIds.has(id));
  // 대기 중인 항목 전부를 이미 넘겨봤다면(아직 아무것도 처리하지 않은 채) — "이전" 버튼이 없어도
  // 넘겨본 항목을 완전히 잃어버리지 않도록 목록의 첫 항목으로 되돌아간다.
  return firstUnseen ?? pendingIds[0];
}
