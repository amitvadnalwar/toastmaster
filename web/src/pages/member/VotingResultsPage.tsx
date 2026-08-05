import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getVoteSummary } from '@/services/voteService';
import { getMeetingRoster } from '@/services/meetingService';
import { MeetingDetailSkeleton } from '@/components/ui/Skeleton';
import type { MeetingRoleAssignment, VoteCategory, VoteSummaryItem } from '@/types';
import { ROLE_LABELS } from '@/types';

const CATEGORIES: { key: VoteCategory; label: string; roles: MeetingRoleAssignment['role'][] }[] = [
  { key: 'best_speaker', label: 'Speaker', roles: ['speaker'] },
  { key: 'best_evaluator', label: 'Evaluator', roles: ['evaluator'] },
  { key: 'best_mrp', label: 'Main Role Player (MRP)', roles: ['tmod', 'general_evaluator', 'table_topics_master'] },
  { key: 'best_arp', label: 'Auxiliary Role Player (ARP)', roles: ['timer', 'ah_counter', 'grammarian'] },
];

interface Participant {
  memberId: string;
  name: string;
  role: MeetingRoleAssignment['role'];
  count: number;
}

export default function VotingResultsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuthStore();

  const [items, setItems] = useState<VoteSummaryItem[]>([]);
  const [roster, setRoster] = useState<MeetingRoleAssignment[]>([]);
  const [fetching, setFetching] = useState(true);

  const load = useCallback(async () => {
    if (!session || !id) return;
    setFetching(true);
    try {
      const [summary, rosterData] = await Promise.all([
        getVoteSummary(id, session.access_token),
        getMeetingRoster(id, session.access_token),
      ]);
      setItems(summary);
      setRoster(rosterData.roster);
    } catch { /* ignore */ } finally {
      setFetching(false);
    }
  }, [session, id]);

  useEffect(() => { load(); }, [load]);

  if (fetching) {
    return (
      <div className="flex flex-col min-h-full bg-gray-50">
        <Header onBack={() => navigate(-1)} />
        <MeetingDetailSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <Header onBack={() => navigate(-1)} />

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-12 max-w-lg mx-auto w-full">
        {CATEGORIES.map((cat) => {
          const countByMember = new Map(
            items.filter((i) => i.category === cat.key).map((i) => [i.nominee_id, i.count]),
          );

          const participantMap = new Map<string, Participant>();
          for (const r of roster) {
            if (!cat.roles.includes(r.role) || r.disqualified) continue;
            if (!participantMap.has(r.member_id)) {
              participantMap.set(r.member_id, {
                memberId: r.member_id,
                name: r.member_name ?? '—',
                role: r.role,
                count: countByMember.get(r.member_id) ?? 0,
              });
            }
          }
          const participants = Array.from(participantMap.values()).sort((a, b) => b.count - a.count);
          const total = participants.reduce((sum, p) => sum + p.count, 0);

          return (
            <div key={cat.key} className="bg-white rounded-2xl shadow-sm p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[15px] font-bold text-gray-900">{cat.label}</p>
                <p className="text-[12px] text-gray-400">{total} {total === 1 ? 'response' : 'responses'}</p>
              </div>

              {participants.length === 0 ? (
                <p className="text-[13px] text-gray-400">No one assigned to this role yet</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {participants.map((p) => {
                    const pct = total === 0 ? 0 : Math.round((p.count / total) * 100);
                    return (
                      <div key={p.memberId}>
                        <div className="flex items-end justify-between mb-1">
                          <div className="min-w-0">
                            <span className="text-[13px] font-semibold text-gray-800 truncate block">{p.name}</span>
                            {cat.roles.length > 1 && (
                              <span className="text-[11px] text-gray-400">{ROLE_LABELS[p.role]}</span>
                            )}
                          </div>
                          <span className="text-[12px] text-gray-500 shrink-0 ml-2">{pct}% · {p.count}</span>
                        </div>
                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-200 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
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
        <h1 className="text-lg font-bold text-gray-900 truncate">Voting Results</h1>
        <div className="w-[70px]" />
      </div>
    </div>
  );
}
