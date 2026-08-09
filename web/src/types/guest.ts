// Types for the unauthenticated guest check-in flow (/guest route).
// Mirrors backend/app/models/guest.py.

export type GuestSource = 'Google' | 'Word of mouth' | 'LinkedIn' | 'Instagram' | 'Other';

export const GUEST_SOURCES: GuestSource[] = ['Google', 'Word of mouth', 'LinkedIn', 'Instagram', 'Other'];

export interface GuestRegisterPayload {
  meeting_id: string;
  name: string;
  phone: string | null;
  source: GuestSource;
}

export interface GuestRegisterResult {
  id: string;
  name: string;
}

export interface GuestSpeaker {
  member_id: string;
  name: string;
}

export interface GuestNominee {
  member_id: string;
  name: string;
}

export interface GuestNomineeCategory {
  category: string;
  label: string;
  nominees: GuestNominee[];
}

export interface GuestSpeakerFeedbackItem {
  speaker_member_id: string;
  content_rating: number;
  structure_rating: number;
  interaction_rating: number;
  confidence_rating: number;
  overall_rating: number;
  comment: string | null;
}

export interface GuestMeetingFeedbackPayload {
  meeting_id: string;
  punctual_rating: number;
  agenda_rating: number;
  inclusive_rating: number;
  experience_rating: number;
  overall_rating: number;
  comment: string | null;
}

export interface GuestVoteItem {
  category: string;
  nominee_id: string;
}
