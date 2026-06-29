import { apiRequest } from '@/lib/apiClient';
import type { VoteCategory, VoteSummary } from '@/types';

export interface SubmitVotePayload {
  meeting_id: string;
  category: VoteCategory;
  nominee_id: string;
}

export function submitVote(payload: SubmitVotePayload, token: string): Promise<void> {
  return apiRequest<void>('/votes', { method: 'POST', body: payload, token });
}

export interface SubmitRatingPayload {
  meeting_id: string;
  rating: 1 | 2 | 3 | 4 | 5;
}

export function submitRating(payload: SubmitRatingPayload, token: string): Promise<void> {
  return apiRequest<void>('/votes/rating', { method: 'POST', body: payload, token });
}

export function getVoteSummary(
  meetingId: string,
  token: string
): Promise<VoteSummary[]> {
  return apiRequest<VoteSummary[]>(`/votes/summary/${meetingId}`, { token });
}
