import { apiRequest } from '@/lib/apiClient';
import type {
  GuestMeetingFeedbackPayload,
  GuestNomineeCategory,
  GuestProgress,
  GuestRegisterPayload,
  GuestRegisterResult,
  GuestSpeaker,
  GuestSpeakerFeedbackItem,
  GuestVoteItem,
} from '@/types/guest';

export function registerGuest(payload: GuestRegisterPayload): Promise<GuestRegisterResult> {
  return apiRequest<GuestRegisterResult>('/guests/register', { method: 'POST', body: payload });
}

export function getMeetingCheckinStatus(meetingId: string): Promise<{ open: boolean }> {
  return apiRequest<{ open: boolean }>(`/guests/meetings/${meetingId}/checkin-status`);
}

export function getGuestProgress(guestId: string, meetingId: string): Promise<GuestProgress> {
  return apiRequest<GuestProgress>(`/guests/${guestId}/progress?meeting_id=${meetingId}`);
}

export function getMeetingSpeakers(meetingId: string): Promise<GuestSpeaker[]> {
  return apiRequest<GuestSpeaker[]>(`/guests/meetings/${meetingId}/speakers`);
}

export function getMeetingNominees(meetingId: string): Promise<GuestNomineeCategory[]> {
  return apiRequest<GuestNomineeCategory[]>(`/guests/meetings/${meetingId}/nominees`);
}

export function submitSpeakerFeedback(
  guestId: string,
  meetingId: string,
  feedbacks: GuestSpeakerFeedbackItem[],
): Promise<void> {
  return apiRequest<void>(`/guests/${guestId}/speaker-feedback`, {
    method: 'POST',
    body: { meeting_id: meetingId, feedbacks },
  });
}

export function submitMeetingFeedback(
  guestId: string,
  payload: GuestMeetingFeedbackPayload,
): Promise<void> {
  return apiRequest<void>(`/guests/${guestId}/meeting-feedback`, { method: 'POST', body: payload });
}

export function submitVotes(guestId: string, meetingId: string, votes: GuestVoteItem[]): Promise<void> {
  return apiRequest<void>(`/guests/${guestId}/votes`, {
    method: 'POST',
    body: { meeting_id: meetingId, votes },
  });
}
