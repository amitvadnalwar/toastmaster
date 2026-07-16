export type AppRole = 'admin' | 'super_admin' | 'member';

export type MeetingStatus = 'draft' | 'published' | 'completed';

export type MeetingRole =
  | 'tmod'
  | 'timer'
  | 'general_evaluator'
  | 'grammarian'
  | 'ah_counter'
  | 'table_topics_master'
  | 'table_topics_speaker'
  | 'speaker'
  | 'evaluator'
  | 'supporting_role';

export const ROLE_LABELS: Record<string, string> = {
  tmod: 'Toastmaster of the Day',
  timer: 'Timer',
  general_evaluator: 'General Evaluator',
  grammarian: 'Grammarian',
  ah_counter: 'Ah Counter',
  table_topics_master: 'Table Topics Master',
  table_topics_speaker: 'Table Topics Speaker',
  speaker: 'Speaker',
  evaluator: 'Evaluator',
  supporting_role: 'Supporting Role',
};

export const SINGLETON_ROLES: MeetingRole[] = [
  'tmod',
  'timer',
  'general_evaluator',
  'grammarian',
  'ah_counter',
  'table_topics_master',
];

export const CLUB_ROLE_LABELS: Record<string, string> = {
  member: 'Member',
  president: 'President',
  vp_education: 'VP Education',
  vp_membership: 'VP Membership',
  vp_pr: 'VP PR',
  secretary: 'Secretary',
  treasurer: 'Treasurer',
  saa: 'SAA',
};

export interface Meeting {
  id: string;
  club_id: string;
  title: string;
  scheduled_at: string;
  venue: string | null;
  theme: string | null;
  status: MeetingStatus;
  max_speakers: number;
  voting_open: boolean;
  created_at: string;
}

export interface RosterEntry {
  id: string;
  meeting_id: string;
  member_id: string;
  member_name?: string;
  member_email?: string;
  role: MeetingRole;
  evaluates_member_id?: string | null;
  speech_title?: string | null;
  speech_duration?: string | null;
}

export interface MeetingWithRoster {
  meeting: Meeting;
  roster: RosterEntry[];
}

export interface Member {
  id: string;
  club_id: string;
  name: string;
  email: string;
  phone: string | null;
  birthday: string | null;
  club_role: string;
  is_active: boolean;
  app_role: AppRole;
  created_at: string;
}

export interface Club {
  id: string;
  name: string;
  city: string | null;
  logo_url: string | null;
}
