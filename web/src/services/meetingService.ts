import { apiRequest } from '@/lib/apiClient';
import type {
  CheckinResult,
  Meeting,
  MeetingRole,
  MeetingRoleAssignment,
  MeetingStatus,
  MeetingWithRoster,
  SpeakerFeedback,
  SpeakerFeedbackPayload,
  SpeechDuration,
  VotingStatus,
} from '@/types';

export interface CreateMeetingPayload {
  title: string;
  scheduled_at: string;
  venue?: string | null;
  president_id?: string | null;
  saa_id?: string | null;
  max_speakers?: number;
}

export function getAllMeetings(token: string): Promise<Meeting[]> {
  return apiRequest<Meeting[]>('/meetings/', { token });
}

export function getMeetingById(meetingId: string, token: string): Promise<Meeting> {
  return apiRequest<Meeting>(`/meetings/${meetingId}`, { token });
}

export function getMeetingRoster(meetingId: string, token: string): Promise<MeetingWithRoster> {
  return apiRequest<MeetingWithRoster>(`/meetings/${meetingId}/roster`, { token });
}

export function createMeeting(payload: CreateMeetingPayload, token: string): Promise<Meeting> {
  return apiRequest<Meeting>('/meetings/', { method: 'POST', body: payload, token });
}

export function updateMeeting(
  meetingId: string,
  payload: CreateMeetingPayload,
  token: string,
): Promise<Meeting> {
  return apiRequest<Meeting>(`/meetings/${meetingId}`, { method: 'PUT', body: payload, token });
}

export function deleteMeeting(meetingId: string, token: string): Promise<void> {
  return apiRequest<void>(`/meetings/${meetingId}`, { method: 'DELETE', token });
}

export function updateMeetingStatus(
  meetingId: string,
  status: MeetingStatus,
  token: string,
): Promise<Meeting> {
  return apiRequest<Meeting>(`/meetings/${meetingId}/status`, {
    method: 'PUT',
    body: { status },
    token,
  });
}

export function updateVotingStatus(
  meetingId: string,
  votingStatus: VotingStatus,
  token: string,
): Promise<Meeting> {
  return apiRequest<Meeting>(`/meetings/${meetingId}/voting`, {
    method: 'PUT',
    body: { voting_status: votingStatus },
    token,
  });
}

// ── Admin role assignment ─────────────────────────────────────────────────

export interface AdminAssignRolePayload {
  member_id: string;
  role: MeetingRole;
  speech_duration?: string | null;
  evaluates_member_id?: string | null;
  theme?: string | null;
}

export function adminAssignRole(
  meetingId: string,
  payload: AdminAssignRolePayload,
  token: string,
): Promise<MeetingRoleAssignment> {
  return apiRequest<MeetingRoleAssignment>(`/meetings/${meetingId}/roles/assign`, {
    method: 'POST',
    body: payload,
    token,
  });
}

export function withdrawFromRole(
  meetingId: string,
  roleId: string,
  token: string,
): Promise<void> {
  return apiRequest<void>(`/meetings/${meetingId}/roles/${roleId}`, {
    method: 'DELETE',
    token,
  });
}

// ── Member self-enrollment ────────────────────────────────────────────────

export function enrollInRole(
  meetingId: string,
  role: MeetingRole,
  token: string,
  theme?: string,
): Promise<MeetingRoleAssignment> {
  return apiRequest<MeetingRoleAssignment>(`/meetings/${meetingId}/enroll/role`, {
    method: 'POST',
    body: { role, theme: theme ?? null },
    token,
  });
}

export function enrollAsSpeaker(
  meetingId: string,
  speechDuration: SpeechDuration,
  token: string,
): Promise<MeetingRoleAssignment> {
  return apiRequest<MeetingRoleAssignment>(`/meetings/${meetingId}/enroll/speaker`, {
    method: 'POST',
    body: { speech_duration: speechDuration },
    token,
  });
}

export function enrollAsEvaluator(
  meetingId: string,
  evaluatesMemberId: string,
  token: string,
): Promise<MeetingRoleAssignment> {
  return apiRequest<MeetingRoleAssignment>(`/meetings/${meetingId}/enroll/evaluator`, {
    method: 'POST',
    body: { evaluates_member_id: evaluatesMemberId },
    token,
  });
}

// ── QR check-in ───────────────────────────────────────────────────────────

export function checkinMeeting(qrToken: string, token: string): Promise<CheckinResult> {
  return apiRequest<CheckinResult>('/meetings/checkin', {
    method: 'POST',
    body: { qr_token: qrToken },
    token,
  });
}

// ── Speaker feedback ──────────────────────────────────────────────────────

export function getMyFeedback(meetingId: string, token: string): Promise<SpeakerFeedback[]> {
  return apiRequest<SpeakerFeedback[]>(`/meetings/${meetingId}/feedback/me`, { token });
}

export function submitFeedback(
  meetingId: string,
  feedbacks: SpeakerFeedbackPayload[],
  token: string,
): Promise<SpeakerFeedback[]> {
  return apiRequest<SpeakerFeedback[]>(`/meetings/${meetingId}/feedback`, {
    method: 'POST',
    body: { feedbacks },
    token,
  });
}
