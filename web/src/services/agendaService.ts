import { apiRequest } from '@/lib/apiClient';
import type { Agenda, AgendaSavePayload } from '@/types/agenda';

export function getAgenda(meetingId: string, token: string): Promise<Agenda> {
  return apiRequest<Agenda>(`/meetings/${meetingId}/agenda`, { token });
}

export function saveAgenda(meetingId: string, payload: AgendaSavePayload, token: string): Promise<Agenda> {
  return apiRequest<Agenda>(`/meetings/${meetingId}/agenda`, { method: 'PUT', body: payload, token });
}

export function clonePreviousAgenda(meetingId: string, token: string): Promise<Agenda> {
  return apiRequest<Agenda>(`/meetings/${meetingId}/agenda/clone-previous`, { method: 'POST', token });
}
