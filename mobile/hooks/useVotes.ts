import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { submitVote, submitRating, getVoteSummary } from '@/services/voteService';
import { useAuthStore } from '@/store';
import { useVoteStore } from '@/store';
import type { SubmitVotePayload, SubmitRatingPayload } from '@/services/voteService';

function useToken() {
  return useAuthStore((s) => s.session?.access_token ?? s.guestToken ?? '');
}

export function useVoteSummary(meetingId: string) {
  const token = useToken();
  return useQuery({
    queryKey: ['votes', 'summary', meetingId],
    queryFn: () => getVoteSummary(meetingId, token),
    enabled: !!token && !!meetingId,
  });
}

export function useSubmitVote() {
  const token = useToken();
  const markCategorySubmitted = useVoteStore((s) => s.markCategorySubmitted);

  return useMutation({
    mutationFn: (payload: SubmitVotePayload) => submitVote(payload, token),
    onSuccess: (_, variables) => {
      markCategorySubmitted(variables.category);
    },
  });
}

export function useSubmitRating() {
  const token = useToken();
  const markRatingSubmitted = useVoteStore((s) => s.markRatingSubmitted);

  return useMutation({
    mutationFn: (payload: SubmitRatingPayload) => submitRating(payload, token),
    onSuccess: () => {
      markRatingSubmitted();
    },
  });
}
