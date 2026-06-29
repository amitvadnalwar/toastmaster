export type MeetingStatus = 'draft' | 'published' | 'completed';
export type VotingStatus = 'not_started' | 'open' | 'closed';
export type MeetingRole =
  | 'tmod'
  | 'general_evaluator'
  | 'ah_counter'
  | 'timer'
  | 'grammarian'
  | 'table_topics_master'
  | 'table_topics_speaker'
  | 'speaker'
  | 'evaluator'
  | 'supporting_role';

export const SINGLETON_ROLES: MeetingRole[] = [
  'tmod',
  'general_evaluator',
  'ah_counter',
  'timer',
  'grammarian',
  'table_topics_master',
];

export const SPEECH_DURATIONS = ['5-7 mins', '7-9 mins', '10-12 mins'] as const;
export type SpeechDuration = typeof SPEECH_DURATIONS[number];

export const ROLE_LABELS: Record<MeetingRole, string> = {
  tmod: 'TMOD',
  general_evaluator: 'General Evaluator',
  ah_counter: 'Ah Counter',
  timer: 'Timer',
  grammarian: 'Grammarian',
  table_topics_master: 'Table Topics Master',
  table_topics_speaker: 'Table Topics Speaker',
  speaker: 'Speaker',
  evaluator: 'Evaluator',
  supporting_role: 'Supporting Role',
};

export interface Meeting {
  id: string;
  club_id: string;
  title: string;
  scheduled_at: string;
  venue?: string | null;
  theme?: string | null;
  president_id?: string | null;
  saa_id?: string | null;
  max_speakers: number;
  voting_status: VotingStatus;
  status: MeetingStatus;
  created_by: string;
  created_at: string;
  qr_token?: string | null;
}

export interface CheckinResult {
  meeting: Meeting;
  already_checked_in: boolean;
}

export interface SpeakerFeedback {
  id: string;
  meeting_id: string;
  from_member_id: string;
  speaker_member_id: string;
  speaker_name?: string | null;
  rating: number;
  comment?: string | null;
  created_at: string;
}

export interface SpeakerFeedbackPayload {
  speaker_member_id: string;
  rating: number;
  comment?: string | null;
}

export interface MeetingRoleAssignment {
  id: string;
  meeting_id: string;
  member_id: string;
  role: MeetingRole;
  evaluates_member_id: string | null;
  speech_duration?: string | null;
  member_name?: string | null;
  member_email?: string | null;
}

export interface MeetingWithRoster {
  meeting: Meeting;
  roster: MeetingRoleAssignment[];
}
