import { apiRequest } from '@/lib/apiClient';
import type { MyVotingState, RatingPayload, VotePayload } from '@/types';

export function submitVote(payload: VotePayload, token: string): Promise<void> {
  return apiRequest<void>('/votes/', { method: 'POST', body: payload, token });
}

export function submitRating(payload: RatingPayload, token: string): Promise<void> {
  return apiRequest<void>('/votes/rating', { method: 'POST', body: payload, token });
}

export function getMyVotingState(meetingId: string, token: string): Promise<MyVotingState> {
  return apiRequest<MyVotingState>(`/votes/me/${meetingId}`, { token });
}
