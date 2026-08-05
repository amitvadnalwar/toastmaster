import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Coins } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getMemberPoints } from '@/services/leaderboardService';
import { MeetingDetailSkeleton } from '@/components/ui/Skeleton';
import type { MemberPointsOut } from '@/types';
import { initials, avatarColor } from '@/lib/utils';

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function LeaderboardDetailPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const month = searchParams.get('month') ?? currentMonthKey();

  const [data, setData] = useState<MemberPointsOut | null>(null);
  const [fetching, setFetching] = useState(true);

  const load = useCallback(async () => {
    if (!session || !memberId) return;
    setFetching(true);
    try {
      const result = await getMemberPoints(memberId, month, session.access_token);
      setData(result);
    } catch { /* ignore */ } finally {
      setFetching(false);
    }
  }, [session, memberId, month]);

  useEffect(() => { load(); }, [load]);

  if (fetching) {
    return (
      <div className="flex flex-col min-h-full bg-gray-50">
        <Header onBack={() => navigate(-1)} />
        <MeetingDetailSkeleton />
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <Header onBack={() => navigate(-1)} />

      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-12 max-w-lg mx-auto w-full">
        <div className="flex flex-col items-center mb-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
            style={{ backgroundColor: avatarColor(data.member_name) }}
          >
            <span className="text-white text-xl font-bold">{initials(data.member_name)}</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{data.member_name}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-3xl font-extrabold text-gray-900">{data.total_points}</span>
            <Coins size={22} className="text-amber-500" />
          </div>
        </div>

        {data.breakdown.length === 0 ? (
          <p className="text-center text-[13px] text-gray-400 mt-8">No points recorded this month.</p>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {data.breakdown.map((b, i) => (
              <div key={b.label}>
                {i > 0 && <div className="h-px bg-gray-100 mx-4" />}
                <div className="flex items-center justify-between px-4 py-3.5">
                  <span className="text-[14px] font-semibold text-gray-800">{b.label}</span>
                  <span className="text-[13px] text-gray-500">
                    {b.count} &times; {b.points_each} = <span className="font-bold text-gray-900">{b.total}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-20">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        <button onClick={onBack} className="flex items-center text-brand font-semibold text-base w-[70px]">
          <ChevronLeft size={20} /> Back
        </button>
        <h1 className="text-lg font-bold text-gray-900 truncate">Points Breakdown</h1>
        <div className="w-[70px]" />
      </div>
    </div>
  );
}
