import {ENV} from '../../config/env';
import type {ClientMessage, ServerMessage} from '../../types/protocol';

/**
 * 재생 동기화/플레이리스트 이벤트를 위한 WebSocket 클라이언트.
 * 근거: docs/specs/05-sync-architecture.md "2. 실시간 전송 계층".
 *
 * MVP 스캐폴딩 범위: 연결/재연결(단순 지수 백오프)/타입 안전 송수신까지만 다룬다.
 * US-206(불안정 네트워크에서도 자동 재접속)의 최소 골격.
 */

type Listener = (message: ServerMessage) => void;

export class SyncSocket {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private reconnectAttempt = 0;
  private manuallyClosed = false;

  connect(): void {
    this.manuallyClosed = false;
    this.ws = new WebSocket(ENV.WS_BASE_URL);

    this.ws.onopen = () => {
      this.reconnectAttempt = 0;
    };

    this.ws.onmessage = event => {
      try {
        const message = JSON.parse(event.data) as ServerMessage;
        this.listeners.forEach(listener => listener(message));
      } catch (err) {
        // 파싱 실패는 조용히 무시하지 않고 로그만 남긴다 (MVP 단계 최소 대응).
        console.warn('[SyncSocket] failed to parse message', err);
      }
    };

    this.ws.onclose = () => {
      if (!this.manuallyClosed) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect(): void {
    this.manuallyClosed = true;
    this.ws?.close();
    this.ws = null;
  }

  send(message: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private scheduleReconnect(): void {
    const delayMs = Math.min(1000 * 2 ** this.reconnectAttempt, 15000);
    this.reconnectAttempt += 1;
    setTimeout(() => {
      if (!this.manuallyClosed) {
        this.connect();
      }
    }, delayMs);
  }
}
