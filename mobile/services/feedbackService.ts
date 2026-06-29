import { apiRequest } from '@/lib/apiClient';
import type { Feedback } from '@/types';

export interface SubmitFeedbackPayload {
  meeting_id: string;
  speaker_id: string;
  comment: string;
}

export function submitFeedback(
  payload: SubmitFeedbackPayload,
  token: string
): Promise<Feedback> {
  return apiRequest<Feedback>('/feedbacks', { method: 'POST', body: payload, token });
}

export function updateFeedback(
  feedbackId: string,
  comment: string,
  token: string
): Promise<Feedback> {
  return apiRequest<Feedback>(`/feedbacks/${feedbackId}`, {
    method: 'PUT',
    body: { comment },
    token,
  });
}

export function getFeedbackForMeeting(
  meetingId: string,
  token: string
): Promise<Feedback[]> {
  return apiRequest<Feedback[]>(`/feedbacks/${meetingId}`, { token });
}
