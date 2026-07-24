import {apiRequest} from './client';
import type {SessionState} from '../../types/domain';

/** US-201/202: 세션 생성/참여 (docs/specs/01-user-stories.md 에픽 2) */

export interface CreateSessionResponse {
  session: SessionState;
  participantId: string;
}

export function createSession(params: {
  hostDisplayName: string;
  accessToken: string;
}): Promise<CreateSessionResponse> {
  return apiRequest<CreateSessionResponse>('/sessions', {
    method: 'POST',
    body: {hostDisplayName: params.hostDisplayName},
    accessToken: params.accessToken,
  });
}

export interface JoinSessionResponse {
  session: SessionState;
  participantId: string;
}

export function joinSession(params: {
  inviteCode: string;
  displayName: string;
  accessToken: string;
}): Promise<JoinSessionResponse> {
  return apiRequest<JoinSessionResponse>(`/sessions/${params.inviteCode}/join`, {
    method: 'POST',
    body: {displayName: params.displayName},
    accessToken: params.accessToken,
  });
}

export function getSession(sessionId: string, accessToken: string): Promise<SessionState> {
  return apiRequest<SessionState>(`/sessions/${sessionId}`, {accessToken});
}
