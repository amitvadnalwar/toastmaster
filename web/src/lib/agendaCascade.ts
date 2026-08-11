import type { AgendaItemDraft } from '@/types/agenda';

// Mirrors backend/app/services/agenda_service.py::compute_times — kept here so
// the editor can show live-updating times as the admin types, without a
// round-trip to the server per keystroke.

function hhmmToSeconds(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 3600 + m * 60;
}

function secondsToHhmm(totalSeconds: number): string {
  const s = ((totalSeconds % 86400) + 86400) % 86400;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Duration cells accept either plain minutes ("4") or minutes:seconds ("1:30"),
// matching how the Green/Yellow/Red timing-card columns are written today.
export function parseDurationToSeconds(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.includes(':')) {
    const [m, s] = trimmed.split(':').map((p) => parseInt(p, 10));
    if (Number.isNaN(m) || Number.isNaN(s)) return null;
    return m * 60 + s;
  }
  const m = parseInt(trimmed, 10);
  return Number.isNaN(m) ? null : m * 60;
}

export function formatSecondsAsDuration(sec: number | null | undefined): string {
  if (sec === null || sec === undefined) return '';
  if (sec % 60 === 0) return String(sec / 60);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export function computeTimes<T extends AgendaItemDraft>(rows: T[]): (T & { computed_start_time: string })[] {
  let currentSec: number | null = null;
  return rows.map((row) => {
    if (row.start_time_override) {
      currentSec = hhmmToSeconds(row.start_time_override);
    }
    const computed_start_time = currentSec !== null ? secondsToHhmm(currentSec) : '';
    if (currentSec !== null) {
      currentSec += row.item_type === 'section' ? (row.break_minutes ?? 0) * 60 : row.duration_red_sec ?? 0;
    }
    return { ...row, computed_start_time };
  });
}
