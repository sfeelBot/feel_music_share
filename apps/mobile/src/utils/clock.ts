/**
 * 서버-클라이언트 클록 오프셋 계산 (NTP 유사 간이 알고리즘).
 * 근거: docs/specs/05-sync-architecture.md "2. 실시간 전송 계층" / "3. 드리프트 보정".
 *
 * 목표 오차 수치(예: ±200ms)는 기획 문서에서 실측 전까지 확정하지 않기로 했으므로,
 * 아래 임계값은 잠정치이며 프로토타입 실측 후 조정해야 한다.
 */

export const DRIFT_CORRECTION_THRESHOLD_MS = 300;
export const CLOCK_SYNC_INTERVAL_MS = 5000;

export interface ClockSample {
  clientSentAt: number;
  serverReceivedAt: number;
  serverRespondAt: number;
  clientReceivedAt: number;
}

/**
 * 왕복 시간(RTT)의 절반만큼 서버 처리 시간을 보정한 clock offset을 계산한다.
 * offset > 0 이면 서버 시계가 클라이언트보다 앞서 있다는 뜻.
 */
export function computeClockOffsetMs(sample: ClockSample): number {
  const roundTrip = sample.clientReceivedAt - sample.clientSentAt;
  const serverProcessing = sample.serverRespondAt - sample.serverReceivedAt;
  const estimatedOneWay = (roundTrip - serverProcessing) / 2;
  const serverTimeAtReceive = sample.serverReceivedAt + estimatedOneWay;
  return serverTimeAtReceive - sample.clientSentAt;
}

/** 서버 기준 재생 상태로부터, 지금 이 순간 로컬 플레이어가 있어야 할 위치(ms)를 계산한다. */
export function computeExpectedPositionMs(params: {
  serverTimestamp: number;
  positionMsAtServerTimestamp: number;
  isPlaying: boolean;
  clockOffsetMs: number;
  nowMs: number;
}): number {
  if (!params.isPlaying) {
    return params.positionMsAtServerTimestamp;
  }
  const localNowInServerTime = params.nowMs + params.clockOffsetMs;
  const elapsedSinceServerTimestamp = localNowInServerTime - params.serverTimestamp;
  return params.positionMsAtServerTimestamp + Math.max(0, elapsedSinceServerTimestamp);
}
