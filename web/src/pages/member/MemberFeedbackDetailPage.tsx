import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Star } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getMeetingRoster } from '@/services/meetingService';
import { getMemberVotingState } from '@/services/voteService';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Meeting, MyVotingState, VoteCategory } from '@/types';

const VOTE_CATEGORY_LABELS: Record<VoteCategory, string> = {
  best_speaker: 'Best Speaker',
  best_table_topic: 'Best Table Topics Speaker',
  best_evaluator: 'Best Evaluator',
  best_mrp: 'Best MRP',
  best_arp: 'Best ARP',
};

export default function MemberFeedbackDetailPage() {
  const { id, memberId } = useParams<{ id: string; memberId: string }>();
  const navigate = useNavigate();
  const { session } = useAuthStore();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [memberName, setMemberName] = useState('');
  const [votingState, setVotingState] = useState<MyVotingState>({ votes: [], rating: null });
  const [memberMap, setMemberMap] = useState<Map<string, string>>(new Map());
  const [fetching, setFetching] = useState(true);

  const load = useCallback(async () => {
    if (!session || !id || !memberId) return;
    setFetching(true);
    try {
      const [rosterData, voting] = await Promise.all([
        getMeetingRoster(id, session.access_token),
        getMemberVotingState(id, memberId, session.access_token),
      ]);
      setMeeting(rosterData.meeting);
      const map = new Map(rosterData.roster.map((r) => [r.member_id, r.member_name ?? '—']));
      setMemberMap(map);
      setMemberName(map.get(memberId) ?? '—');
      setVotingState(voting);
    } catch { /* ignore */ } finally {
      setFetching(false);
    }
  }, [session, id, memberId]);

  useEffect(() => { load(); }, [load]);

  const votedCategories = Object.entries(VOTE_CATEGORY_LABELS) as [VoteCategory, string][];

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate(`/meetings/${id}/feedback-details`)} className="flex items-center text-brand font-semibold text-base w-[70px]">
            <ChevronLeft size={20} /> Back
          </button>
          <h1 className="text-lg font-bold text-gray-900 truncate">Member Feedback</h1>
          <div className="w-[70px]" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-12 max-w-lg mx-auto w-full">
        {fetching ? (
          <>
            <Skeleton className="w-40 h-6 rounded-full mb-2" />
            <Skeleton className="w-64 h-4 rounded-full mb-5" />
            <Skeleton className="w-full h-32 rounded-2xl" />
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-1">{memberName}</h2>
            <p className="text-[13px] text-gray-500 mb-5">{meeting?.title}</p>

            {/* Votes */}
            <SectionLabel>Votes</SectionLabel>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-5">
              {votedCategories.map(([cat, label], i) => {
                const vote = votingState.votes.find((v) => v.category === cat);
                return (
                  <div key={cat}>
                    {i > 0 && <Divider />}
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-[13px] text-gray-500 font-medium">{label}</span>
                      <span className={`text-sm font-semibold ${vote ? 'text-gray-900' : 'text-gray-300'}`}>
                        {vote ? (memberMap.get(vote.nominee_id) ?? '—') : 'Not voted'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Overall meeting feedback */}
            <SectionLabel>Overall Meeting Feedback</SectionLabel>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              {votingState.rating ? (
                <>
                  <div className="flex items-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} size={22} className={n <= votingState.rating!.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} />
                    ))}
                  </div>
                  {votingState.rating.comment && <p className="text-[13px] text-gray-600 italic">"{votingState.rating.comment}"</p>}
                </>
              ) : (
                <p className="text-[13px] text-gray-400 text-center">Not submitted yet</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5">{children}</p>;
}
function Divider() {
  return <div className="h-px bg-gray-100 mx-4" />;
}
