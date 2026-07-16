import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { getMe } from '@/services/memberService';
import { AdminBottomNav } from '@/components/layout/BottomNav';
import Button from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import type { Member } from '@/types';
import { initials, formatDateShort } from '@/lib/utils';
import { CLUB_ROLE_LABELS } from '@/types';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 gap-4">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900 text-right truncate">{value || '—'}</span>
    </div>
  );
}

export default function AdminProfilePage() {
  const { session, appRole } = useAuthStore();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const isSuperAdmin = appRole === 'super_admin';

  useEffect(() => {
    if (!session) return;
    getMe(session.access_token)
      .then(setMember)
      .finally(() => setLoading(false));
  }, [session]);

  async function handleSignOut() {
    if (!confirm('Are you sure you want to sign out?')) return;
    setSigningOut(true);
    await supabase.auth.signOut();
  }

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 pt-5 pb-4 sticky top-0 z-20">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-black text-gray-900">Profile</h1>
        </div>
      </div>

      {loading ? (
        <PageSpinner />
      ) : (
        <div className="flex-1 overflow-y-auto pb-28 max-w-lg mx-auto w-full">
          {/* Avatar */}
          <div className="flex flex-col items-center pt-8 pb-6">
            <div className="w-20 h-20 rounded-full bg-brand flex items-center justify-center mb-3">
              <span className="text-white text-3xl font-bold">
                {member ? initials(member.name) : '?'}
              </span>
            </div>
            <h2 className="text-xl font-black text-gray-900">{member?.name ?? '—'}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {member ? (CLUB_ROLE_LABELS[member.club_role] ?? member.club_role) : ''}
            </p>
          </div>

          <p className="mx-4 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Details</p>
          <div className="mx-4 bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50 mb-8">
            <DetailRow label="Email" value={member?.email ?? ''} />
            <DetailRow label="Phone" value={member?.phone ?? ''} />
            <DetailRow label="Club Role" value={member ? (CLUB_ROLE_LABELS[member.club_role] ?? member.club_role) : ''} />
            <DetailRow label="Member Since" value={member ? formatDateShort(member.created_at) : ''} />
          </div>

          <div className="mx-4">
            <Button variant="danger" fullWidth onClick={handleSignOut} loading={signingOut}>
              Sign Out
            </Button>
          </div>
        </div>
      )}

      <AdminBottomNav isSuperAdmin={isSuperAdmin} />
    </div>
  );
}
