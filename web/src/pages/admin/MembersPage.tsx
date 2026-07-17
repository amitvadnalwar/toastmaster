import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getAllMembers } from '@/services/memberService';
import { AdminBottomNav } from '@/components/layout/BottomNav';
import { MembersListSkeleton } from '@/components/ui/Skeleton';
import type { Member } from '@/types';
import { CLUB_ROLE_LABELS } from '@/types';
import { initials } from '@/lib/utils';

function statusDotColor(m: Member): string {
  if (!m.is_active) return '#9ca3af';
  if (!m.is_confirmed) return '#f59e0b';
  return '#10b981';
}

export default function AdminMembersPage() {
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    getAllMembers(session.access_token)
      .then(setMembers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate('/admin')} className="flex items-center text-brand font-semibold text-base w-[70px]">
            <ChevronLeft size={20} /> Back
          </button>
          <h1 className="text-lg font-bold text-gray-900">Members</h1>
          <button onClick={() => navigate('/admin/members/new')} className="w-[70px] flex justify-end">
            <UserPlus size={20} className="text-brand" />
          </button>
        </div>
      </div>

      {loading ? (
        <MembersListSkeleton />
      ) : (
        <div className="flex-1 overflow-y-auto px-5 pt-5 pb-28 max-w-lg mx-auto w-full">
          {members.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center">
              <p className="text-base font-bold text-gray-900 mb-2">No members yet</p>
              <p className="text-sm text-gray-500">Tap the icon above to add the first member.</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500 font-medium mb-3">
                {members.length} member{members.length !== 1 ? 's' : ''}
              </p>
              <div className="flex flex-col gap-2.5">
                {members.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => navigate(`/admin/members/${m.id}`)}
                    className={`w-full bg-white rounded-xl px-3.5 py-3 flex items-center shadow-sm text-left ${!m.is_active ? 'opacity-[0.55]' : ''}`}
                  >
                    <div
                      className="w-[42px] h-[42px] rounded-full flex items-center justify-center mr-3 shrink-0"
                      style={{ backgroundColor: m.is_active ? '#8B1A1A' : '#9ca3af' }}
                    >
                      <span className="text-white text-[15px] font-bold">{initials(m.name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[15px] font-semibold truncate ${m.is_active ? 'text-gray-900' : 'text-gray-500'}`}>{m.name}</p>
                      <p className="text-xs text-gray-500 truncate">{m.email}</p>
                      {m.club_role !== 'member' && m.club_role !== 'guest' && (
                        <p className="text-[11px] text-brand font-semibold mt-0.5">
                          {CLUB_ROLE_LABELS[m.club_role] ?? m.club_role}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 ml-2 shrink-0">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusDotColor(m) }} />
                      <ChevronRight size={16} className="text-gray-300" />
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex justify-center gap-4 mt-5">
                <Legend color="#10b981" label="Active" />
                <Legend color="#f59e0b" label="Invite pending" />
                <Legend color="#9ca3af" label="Inactive" />
              </div>
            </>
          )}
        </div>
      )}

      <AdminBottomNav isSuperAdmin />
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[11px] text-gray-400">{label}</span>
    </div>
  );
}
