import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getMembers } from '@/services/memberService';
import { MemberBottomNav } from '@/components/layout/BottomNav';
import { PageSpinner } from '@/components/ui/Spinner';
import type { Member } from '@/types';
import { initials } from '@/lib/utils';
import { CLUB_ROLE_LABELS } from '@/types';

export default function MemberMembersPage() {
  const { session } = useAuthStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!session) return;
    getMembers(session.access_token)
      .then((data) => setMembers(data.filter((m) => m.is_active)))
      .finally(() => setLoading(false));
  }, [session]);

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(query.toLowerCase()) ||
      m.email.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 pt-5 pb-4 sticky top-0 z-20">
        <div className="max-w-lg mx-auto mb-3">
          <h1 className="text-xl font-black text-gray-900">Members</h1>
        </div>
        <div className="max-w-lg mx-auto relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search members..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
          />
        </div>
      </div>

      {loading ? (
        <PageSpinner />
      ) : (
        <div className="flex-1 overflow-y-auto pb-28 max-w-lg mx-auto w-full px-4 pt-4">
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 mt-16">No members found</p>
          )}
          <div className="flex flex-col gap-2">
            {filtered.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
              >
                <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center shrink-0">
                  <span className="text-white text-sm font-bold">{initials(m.name)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">{m.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {CLUB_ROLE_LABELS[m.club_role] ?? m.club_role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <MemberBottomNav />
    </div>
  );
}
