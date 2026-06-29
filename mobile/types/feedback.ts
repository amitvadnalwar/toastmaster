export interface Feedback {
  id: string;
  meeting_id: string;
  speaker_id: string;
  evaluator_id: string;
  comment: string;
  created_at: string;
  updated_at: string;
}

export type EmailStatus = 'pending' | 'sent' | 'failed';

export interface EmailLog {
  id: string;
  meeting_id: string;
  speaker_id: string;
  sent_at: string | null;
  status: EmailStatus;
  error_message: string | null;
}

export interface EmailDispatchResult {
  sent: number;
  failed: number;
  skipped: number;
}
