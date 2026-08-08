import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Trophy, Coins, Info, Mic, MessageSquare, Crown, Star, Users, CheckCircle,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getLeaderboard } from '@/services/leaderboardService';
import { MembersListSkeleton } from '@/components/ui/Skeleton';
import { initials, avatarColor, formatMemberName } from '@/lib/utils';

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

const POINT_RULES: { icon: typeof Mic; label: string; sub?: string; points: number }[] = [
  { icon: Crown, label: 'TMOD', sub: 'Toastmaster of the Day', points: 20 },
  { icon: Star, label: 'General Evaluator', points: 20 },
  { icon: Mic, label: 'Speeches', sub: 'Giving a speech', points: 15 },
  { icon: MessageSquare, label: 'Evaluators', sub: 'Evaluating a speech', points: 15 },
  { icon: Users, label: 'Other Meeting Roles', sub: 'Table Topics Master, Timer, Ah Counter, Grammarian', points: 10 },
  { icon: CheckCircle, label: 'Attendance', sub: 'Checking in to the meeting', points: 10 },
  { icon: Trophy, label: 'Winners', sub: 'Most votes in a category', points: 10 },
];

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const currentMonth = currentMonthKey();

  const [month, setMonth] = useState(currentMonth);
  const [showInfo, setShowInfo] = useState(false);

  const { data: entries = [], isLoading: fetching } = useQuery({
    queryKey: ['leaderboard', month, session?.user?.id],
    queryFn: () => getLeaderboard(month, session!.access_token),
    enabled: !!session,
  });

  const isCurrentMonth = month === currentMonth;

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center text-brand font-semibold text-base w-[70px]">
            <ChevronLeft size={20} /> Back
          </button>
          <h1 className="text-lg font-bold text-gray-900 truncate">Leaderboard</h1>
          <div className="w-[70px] flex justify-end">
            <button onClick={() => setShowInfo(true)} className="p-2 text-gray-400 active:text-brand">
              <Info size={20} />
            </button>
          </div>
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
            {entries.map((e, i) => (
              <button
                key={e.member_id}
                onClick={() => navigate(`/leaderboard/${e.member_id}?month=${month}`)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left ${i > 0 ? 'border-t border-gray-100' : ''}`}
              >
                <span className="w-5 text-[13px] font-semibold text-gray-400 shrink-0 text-right">{e.rank}</span>
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: avatarColor(e.member_name) }}
                >
                  <span className="text-white text-[13px] font-bold">{initials(e.member_name)}</span>
                </div>
                <span className="flex-1 text-[15px] font-semibold text-gray-900 truncate">{formatMemberName(e.member_name, e.member_initials)}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[15px] font-bold text-gray-900">{e.points}</span>
                  <Coins size={16} className="text-amber-500" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setShowInfo(false)}>
          <div className="w-full bg-white rounded-t-3xl max-h-[85%] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="w-[60px]" />
              <h3 className="text-base font-semibold text-gray-900">How Points Work</h3>
              <button onClick={() => setShowInfo(false)} className="text-brand text-base font-semibold w-[60px] text-right">Done</button>
            </div>
            <div className="overflow-y-auto px-5 py-4 pb-8">
              <p className="text-[13px] text-gray-500 mb-4">
                Every month, you earn points for taking part in meetings. Here's how it adds up:
              </p>
              <div className="bg-gray-50 rounded-2xl overflow-hidden mb-4">
                {POINT_RULES.map((rule, i) => {
                  const Icon = rule.icon;
                  return (
                    <div key={rule.label}>
                      {i > 0 && <div className="h-px bg-gray-200 mx-4" />}
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
                          <Icon size={16} className="text-brand" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-gray-900">{rule.label}</p>
                          {rule.sub && <p className="text-[11px] text-gray-400 mt-0.5">{rule.sub}</p>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[14px] font-bold text-gray-900">{rule.points}</span>
                          <Coins size={14} className="text-amber-500" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[12px] text-gray-400 leading-5">
                Points are added up across everything you did that month, and only count once a meeting has actually happened.
                The leaderboard resets at the start of each new month.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
