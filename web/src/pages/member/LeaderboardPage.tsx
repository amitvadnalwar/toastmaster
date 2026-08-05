import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getLeaderboard } from '@/services/leaderboardService';
import { MembersListSkeleton } from '@/components/ui/Skeleton';
import type { LeaderboardEntry } from '@/types';
import { initials } from '@/lib/utils';

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const RANK_STYLES: Record<number, { bg: string; text: string }> = {
  1: { bg: '#fef3c7', text: '#b45309' },
  2: { bg: '#f3f4f6', text: '#4b5563' },
  3: { bg: '#fde8d7', text: '#9a5b2c' },
};

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const currentMonth = currentMonthKey();

  const [month, setMonth] = useState(currentMonth);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [fetching, setFetching] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    setFetching(true);
    try {
      const result = await getLeaderboard(month, session.access_token);
      setEntries(result);
    } catch { /* ignore */ } finally {
      setFetching(false);
    }
  }, [session, month]);

  useEffect(() => { load(); }, [load]);

  const isCurrentMonth = month === currentMonth;

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center text-brand font-semibold text-base w-[70px]">
            <ChevronLeft size={20} /> Back
          </button>
          <h1 className="text-lg font-bold text-gray-900 truncate">Leaderboard</h1>
          <div className="w-[70px]" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-12 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-center gap-4 mb-5">
          <button onClick={() => setMonth((m) => shiftMonth(m, -1))} className="p-2 text-gray-400 active:text-brand">
            <ChevronLeft size={18} />
          </button>
          <p className="text-[15px] font-bold text-gray-900 min-w-[150px] text-center">{monthLabel(month)}</p>
          <button
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            disabled={isCurrentMonth}
            className="p-2 text-gray-400 active:text-brand disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {fetching ? (
          <MembersListSkeleton />
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center gap-3 pt-16">
            <Trophy size={36} className="text-gray-300" />
            <p className="text-sm text-gray-400">No points recorded for this month yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {entries.map((e, i) => {
              const style = RANK_STYLES[e.rank];
              return (
                <button
                  key={e.member_id}
                  onClick={() => navigate(`/leaderboard/${e.member_id}?month=${month}`)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left ${i > 0 ? 'border-t border-gray-100' : ''}`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[13px] font-bold"
                    style={{ backgroundColor: style?.bg ?? '#f3f4f6', color: style?.text ?? '#6b7280' }}
                  >
                    {e.rank}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center shrink-0">
                    <span className="text-white text-[13px] font-bold">{initials(e.member_name)}</span>
                  </div>
                  <span className="flex-1 text-[15px] font-semibold text-gray-900 truncate">{e.member_name}</span>
                  <span className="text-[15px] font-extrabold text-brand shrink-0">{e.points} pts</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
