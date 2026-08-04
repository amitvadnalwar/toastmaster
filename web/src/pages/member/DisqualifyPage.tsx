import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getMeetingRoster, setRoleDisqualified } from '@/services/meetingService';
import { MeetingDetailSkeleton } from '@/components/ui/Skeleton';
import type { MeetingRole, MeetingWithRoster } from '@/types';
import { ROLE_LABELS } from '@/types';

const ROLE_ORDER = Object.keys(ROLE_LABELS) as MeetingRole[];

export default function DisqualifyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuthStore();

  const [data, setData] = useState<MeetingWithRoster | null>(null);
  const [fetching, setFetching] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session || !id) return;
    setFetching(true);
    try {
      const result = await getMeetingRoster(id, session.access_token);
      setData(result);
    } catch { /* ignore */ } finally {
      setFetching(false);
    }
  }, [session, id]);

  useEffect(() => { load(); }, [load]);

  async function handleToggle(roleId: string, disqualified: boolean) {
    if (!session || !id) return;
    setActingId(roleId);
    try {
      await setRoleDisqualified(id, roleId, disqualified, session.access_token);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setActingId(null);
    }
  }

  if (fetching) {
    return (
      <div className="flex flex-col min-h-full bg-gray-50">
        <Header onBack={() => navigate(-1)} />
        <MeetingDetailSkeleton />
      </div>
    );
  }
  if (!data) return null;

  const roster = [...data.roster].sort(
    (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role),
  );

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <Header onBack={() => navigate(-1)} />

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-12 max-w-lg mx-auto w-full">
        <h2 className="text-lg font-bold text-gray-900 mb-1">{data.meeting.title}</h2>
        <p className="text-[13px] text-gray-400 mb-5">
          Disqualified members are excluded from feedback and voting for this meeting.
        </p>

        {roster.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-gray-400">No role assignments yet</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {roster.map((r, i) => (
              <div key={r.id}>
                {i > 0 && <Divider />}
                <div className="flex items-center gap-2 px-4 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${r.disqualified ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {r.member_name ?? '—'}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{ROLE_LABELS[r.role]}</p>
                  </div>
                  {r.disqualified ? (
                    <button
                      onClick={() => handleToggle(r.id, false)}
                      disabled={actingId === r.id}
                      className="shrink-0 bg-gray-100 text-gray-600 rounded-lg px-3 py-1.5 text-[13px] font-semibold disabled:opacity-50"
                    >
                      Reinstate
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggle(r.id, true)}
                      disabled={actingId === r.id}
                      className="shrink-0 bg-[#fef2f2] text-red-500 rounded-lg px-3 py-1.5 text-[13px] font-semibold disabled:opacity-50"
                    >
                      Disqualify
                    </button>
                  )}
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
        <h1 className="text-lg font-bold text-gray-900 truncate">Disqualify</h1>
        <div className="w-[70px]" />
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-gray-100 mx-4" />;
}
