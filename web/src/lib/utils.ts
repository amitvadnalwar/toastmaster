export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// Prefixes a member's display name with their Toastmaster designation (TM/DTM),
// e.g. "TM Jane Doe". Falls back to the bare name when initials aren't known.
export function formatMemberName(name: string | null | undefined, memberInitials?: string | null): string {
  if (!name) return '—';
  return memberInitials ? `${memberInitials} ${name}` : name;
}

const AVATAR_COLORS = ['#93c5fd', '#c4b5fd', '#86efac', '#fca5a5', '#fcd34d', '#67e8f9', '#f9a8d4'];
export function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  );
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

// Formats a MM-DD birthday (no year, by design) as "18th July".
export function formatBirthday(mmdd: string | null | undefined): string {
  if (!mmdd) return '—';
  const [mm, dd] = mmdd.split('-').map(Number);
  if (!mm || !dd || mm < 1 || mm > 12) return mmdd;
  return `${ordinal(dd)} ${MONTH_NAMES[mm - 1]}`;
}

export function isPastMeeting(scheduledAt: string): boolean {
  return new Date(scheduledAt).getTime() < Date.now();
}

export function dateparts(iso: string) {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString('en-IN', { weekday: 'short' }),
    date: d.getDate().toString().padStart(2, '0'),
    month: d.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase(),
    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
  };
}
