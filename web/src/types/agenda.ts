export type AgendaItemType = 'section' | 'item' | 'speech';

export interface AgendaItem {
  id: string;
  meeting_id: string;
  position: number;
  item_type: AgendaItemType;
  title: string;
  break_minutes: number | null;
  duration_green_sec: number | null;
  duration_yellow_sec: number | null;
  duration_red_sec: number | null;
  start_time_override: string | null; // "HH:MM"
  host_member_id: string | null;
  host_name: string | null;
  evaluator_member_id: string | null;
  evaluator_name: string | null;
  path_code: string | null;
  level_project: string | null;
  computed_start_time: string; // "HH:MM"
}

// The editable shape — server-assigned fields are dropped; a new draft row
// has no computed_start_time until the cascade util fills it in locally.
export type AgendaItemDraft = Omit<AgendaItem, 'id' | 'meeting_id' | 'position' | 'computed_start_time'>;

export interface Agenda {
  items: AgendaItem[];
  word_of_day: string | null;
  word_of_day_meaning: string | null;
  word_of_day_usage: string | null;
  idiom_of_day: string | null;
  idiom_of_day_meaning: string | null;
  idiom_of_day_usage: string | null;
}

export interface AgendaSavePayload {
  items: AgendaItemDraft[];
  word_of_day: string | null;
  word_of_day_meaning: string | null;
  word_of_day_usage: string | null;
  idiom_of_day: string | null;
  idiom_of_day_meaning: string | null;
  idiom_of_day_usage: string | null;
}

export function emptyDraft(item_type: AgendaItemType): AgendaItemDraft {
  return {
    item_type,
    title: '',
    break_minutes: item_type === 'section' ? 0 : null,
    duration_green_sec: item_type === 'section' ? null : 0,
    duration_yellow_sec: item_type === 'section' ? null : 0,
    duration_red_sec: item_type === 'section' ? null : 0,
    start_time_override: null,
    host_member_id: null,
    host_name: null,
    evaluator_member_id: null,
    evaluator_name: null,
    path_code: null,
    level_project: null,
  };
}
