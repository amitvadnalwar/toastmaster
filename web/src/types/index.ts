// ── Roles & app roles ─────────────────────────────────────────────────────

export type AppRole = 'member' | 'admin' | 'super_admin';

export type ClubRole =
  | 'member'
  | 'guest'
  | 'president'
  | 'vp_education'
  | 'vp_membership'
  | 'vp_pr'
  | 'secretary'
  | 'treasurer'
  | 'saa';

export const CLUB_ROLE_LABELS: Record<ClubRole, string> = {
  member: 'Member',
  guest: 'Guest',
  president: 'President',
  vp_education: 'VP Education',
  vp_membership: 'VP Membership',
  vp_pr: 'VP PR',
  secretary: 'Secretary',
  treasurer: 'Treasurer',
  saa: 'SAA',
};

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  member: 'Member',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

export const ASSIGNABLE_CLUB_ROLES: ClubRole[] = [
  'president',
  'vp_education',
  'vp_membership',
  'vp_pr',
  'secretary',
  'treasurer',
  'saa',
  'member',
];

export const ASSIGNABLE_APP_ROLES: AppRole[] = ['member', 'admin', 'super_admin'];

// ── Meetings ────────────────────────────────────────────────────────────────

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
export type SpeechDuration = (typeof SPEECH_DURATIONS)[number];

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

export const STATUS_COLOR: Record<MeetingStatus, string> = {
  draft: '#f59e0b',
  published: '#10b981',
  completed: '#6b7280',
};

export const STATUS_LABEL: Record<MeetingStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  completed: 'Completed',
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

// ── Members ─────────────────────────────────────────────────────────────────

export interface Member {
  id: string;
  auth_user_id: string | null;
  club_id: string;
  email: string;
  phone: string | null;
  name: string;
  birthday: string | null; // MM-DD format
  birthday_collected: boolean;
  source: string | null;
  is_guest: boolean;
  app_role: AppRole | null;
  club_role: ClubRole;
  created_at: string;
  is_active: boolean;
  is_confirmed: boolean;
}

// ── Club ────────────────────────────────────────────────────────────────────

export interface Club {
  id: string;
  name: string;
  instagram_url: string | null;
  linkedin_url: string | null;
  whatsapp_invite_url: string | null;
}
