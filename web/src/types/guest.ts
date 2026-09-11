// Types for the unauthenticated guest check-in flow (/guest route).
// Mirrors backend/app/models/guest.py.

export interface GuestRegisterPayload {
  meeting_id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface GuestRegisterResult {
  id: string;
  name: string;
}

export interface GuestSpeaker {
  // The speaker's own meeting_roles row — stable identity whether or not
  // they have a member account.
  role_id: string;
  member_id: string | null;
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
  speaker_role_id: string;
  content_rating: number;
  structure_rating: number;
  interaction_rating: number;
  confidence_rating: number;
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

export interface GuestProgress {
  guest_name: string;
  speaker_feedback: GuestSpeakerFeedbackItem[];
  meeting_feedback: {
    punctual_rating: number;
    agenda_rating: number;
    inclusive_rating: number;
    experience_rating: number;
    overall_rating: number;
    comment: string | null;
  } | null;
  votes: GuestVoteItem[];
}
