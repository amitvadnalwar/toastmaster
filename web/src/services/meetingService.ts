import { apiRequest } from '@/lib/apiClient';
import type { Meeting, MeetingWithRoster } from '@/types';

export function getUpcomingMeetings(token: string): Promise<Meeting[]> {
  return apiRequest('/meetings/upcoming', { token });
}

export function getAllMeetings(token: string): Promise<Meeting[]> {
  return apiRequest('/meetings', { token });
}

export function getMeetingRoster(id: string, token: string): Promise<MeetingWithRoster> {
  return apiRequest(`/meetings/${id}/roster`, { token });
}

export function createMeeting(
  data: {
    title: string;
    scheduled_at: string;
    venue?: string;
    theme?: string;
    max_speakers: number;
  },
  token: string,
): Promise<Meeting> {
  return apiRequest('/meetings', {
    method: 'POST',
    body: JSON.stringify(data),
    token,
  });
}

export function updateMeeting(
  id: string,
  data: Partial<{
    title: string;
    scheduled_at: string;
    venue: string;
    theme: string;
    status: string;
    max_speakers: number;
    voting_open: boolean;
  }>,
  token: string,
): Promise<Meeting> {
  return apiRequest(`/meetings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
    token,
  });
}

export function assignRole(
  meetingId: string,
  data: {
    member_id: string;
    role: string;
    evaluates_member_id?: string;
    speech_title?: string;
    speech_duration?: string;
  },
  token: string,
): Promise<unknown> {
  return apiRequest(`/meetings/${meetingId}/roles`, {
    method: 'POST',
    body: JSON.stringify(data),
    token,
  });
}

export function removeRole(
  meetingId: string,
  roleId: string,
  token: string,
): Promise<unknown> {
  return apiRequest(`/meetings/${meetingId}/roles/${roleId}`, {
    method: 'DELETE',
    token,
  });
}

export function applyForRole(
  meetingId: string,
  data: { role: string; speech_title?: string; speech_duration?: string },
  token: string,
): Promise<unknown> {
  return apiRequest(`/meetings/${meetingId}/apply`, {
    method: 'POST',
    body: JSON.stringify(data),
    token,
  });
}

export function checkInToMeeting(meetingId: string, token: string): Promise<unknown> {
  return apiRequest(`/meetings/${meetingId}/checkin`, {
    method: 'POST',
    token,
  });
}
