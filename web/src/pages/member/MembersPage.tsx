import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getClubMembers } from '@/services/memberService';
import { MemberBottomNav } from '@/components/layout/BottomNav';
import Spinner from '@/components/ui/Spinner';
import { CLUB_ROLE_LABELS } from '@/types';
import { initials } from '@/lib/utils';

type ClubMember = { id: string; name: string; club_role: string; app_role: string | null; is_active: boolean };

export default function MemberMembersPage() {
  const { session } = useAuthStore();
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    getClubMembers(session.access_token)
      .then(setMembers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-5 py-4 sticky top-0 z-20">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-bold text-gray-900">Members</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{members.length} members</p>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <div className="flex-1 overflow-y-auto pb-28 max-w-lg mx-auto w-full">
          {members.length === 0 ? (
            <p className="text-center text-gray-400 mt-16">No members found.</p>
          ) : (
            <div className="px-5 pt-4">
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {members.map((m, i) => (
                  <div key={m.id} className={`flex items-center gap-3 px-4 py-3.5 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: m.is_active ? '#8B1A1A' : '#9ca3af' }}>
                      <span className="text-white text-sm font-bold">{initials(m.name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold text-gray-900 truncate">{m.name}</p>
                      <p className="text-xs text-gray-500 truncate">{CLUB_ROLE_LABELS[m.club_role as keyof typeof CLUB_ROLE_LABELS] ?? m.club_role}</p>
                    </div>
                    {(m.app_role === 'admin' || m.app_role === 'super_admin') && (
                      <span className="text-[11px] font-semibold text-brand bg-[#fef2f2] border border-red-200 rounded-lg px-2 py-0.5">Admin</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <MemberBottomNav />
    </div>
  );
}
