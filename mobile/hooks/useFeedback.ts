import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  submitFeedback,
  updateFeedback,
  getFeedbackForMeeting,
} from '@/services/feedbackService';
import { useAuthStore } from '@/store';
import type { SubmitFeedbackPayload } from '@/services/feedbackService';

function useToken() {
  return useAuthStore((s) => s.session?.access_token ?? '');
}

export function useFeedbackForMeeting(meetingId: string) {
  const token = useToken();
  return useQuery({
    queryKey: ['feedbacks', meetingId],
    queryFn: () => getFeedbackForMeeting(meetingId, token),
    enabled: !!token && !!meetingId,
  });
}

export function useSubmitFeedback(meetingId: string) {
  const token = useToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SubmitFeedbackPayload) => submitFeedback(payload, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks', meetingId] });
    },
  });
}

export function useUpdateFeedback(meetingId: string) {
  const token = useToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) =>
      updateFeedback(id, comment, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks', meetingId] });
    },
  });
}
