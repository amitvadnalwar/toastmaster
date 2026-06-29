import { apiRequest } from '@/lib/apiClient';
import type { EmailDispatchResult } from '@/types';

export function dispatchFeedbackEmails(
  meetingId: string,
  token: string
): Promise<EmailDispatchResult> {
  return apiRequest<EmailDispatchResult>(`/email/dispatch/${meetingId}`, {
    method: 'POST',
    token,
  });
}
