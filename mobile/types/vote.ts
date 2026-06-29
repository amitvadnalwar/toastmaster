export type VoteCategory =
  | 'best_speaker'
  | 'best_supporting_role'
  | 'best_table_topics_master'
  | 'best_evaluator'
  | 'best_table_topic';

export interface Vote {
  id: string;
  meeting_id: string;
  voter_id: string;
  category: VoteCategory;
  nominee_id: string;
  created_at: string;
}

export interface MeetingRating {
  id: string;
  meeting_id: string;
  voter_id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  created_at: string;
}

export interface VoteSummary {
  category: VoteCategory;
  nominee_id: string;
  nominee_name: string;
  count: number;
}
