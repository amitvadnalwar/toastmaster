import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { getMe } from '@/services/memberService';
import { AdminBottomNav } from '@/components/layout/BottomNav';
import { ProfileSkeleton } from '@/components/ui/Skeleton';
import type { Member } from '@/types';
import { CLUB_ROLE_LABELS, APP_ROLE_LABELS } from '@/types';
import { initials, formatDateShort } from '@/lib/utils';

export default function AdminProfilePage() {
  const navigate = useNavigate();
  const { session, appRole } = useAuthStore();
  const isSuperAdmin = appRole === 'super_admin';
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!session) return;
    getMe(session.access_token).then(setMember).catch(() => {}).finally(() => setLoading(false));
  }, [session]);

  async function handleSignOut() {
    if (!window.confirm('Are you sure you want to sign out?')) return;
    setSigningOut(true);
    await supabase.auth.signOut();
  }

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate('/admin')} className="flex items-center text-brand font-semibold text-base w-[70px]">
            <ChevronLeft size={20} /> Back
          </button>
          <h1 className="text-lg font-bold text-gray-900">Profile</h1>
          <div className="w-[70px]" />
        </div>
      </div>

      {loading ? (
        <ProfileSkeleton />
      ) : (
        <div className="flex-1 overflow-y-auto px-5 pt-6 pb-28 max-w-lg mx-auto w-full">
          <div className="flex flex-col items-center mb-7">
            <div className="w-20 h-20 rounded-full bg-brand flex items-center justify-center mb-3.5">
              <span className="text-white text-[28px] font-bold">{member ? initials(member.name) : '?'}</span>
            </div>
            <h2 className="text-[22px] font-bold text-gray-900 mb-1">{member?.name ?? '—'}</h2>
            <p className="text-[13px] text-gray-500 font-medium">{member?.app_role ? APP_ROLE_LABELS[member.app_role] : ''}</p>
          </div>

          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Details</p>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-8">
            <DetailRow label="Email" value={member?.email ?? '—'} />
            <Divider />
            <DetailRow label="Phone" value={member?.phone ?? '—'} />
            <Divider />
            <DetailRow label="Birthday" value={member?.birthday ?? '—'} />
            <Divider />
            <DetailRow label="Club Role" value={member ? CLUB_ROLE_LABELS[member.club_role] : '—'} />
            <Divider />
            <DetailRow label="App Role" value={member?.app_role ? APP_ROLE_LABELS[member.app_role] : '—'} />
            <Divider />
            <DetailRow label="Member Since" value={member ? formatDateShort(member.created_at) : '—'} />
          </div>

          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full border border-red-300 bg-white rounded-xl py-3.5 text-[15px] font-semibold text-red-500 active:bg-red-50"
          >
            {signingOut ? 'Signing out…' : 'Sign Out'}
          </button>
        </div>
      )}

      <AdminBottomNav isSuperAdmin={isSuperAdmin} />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3.5 flex items-center justify-between gap-4">
      <span className="text-[13px] text-gray-500 font-medium">{label}</span>
      <span className="text-sm text-gray-900 font-medium text-right flex-1 truncate">{value}</span>
    </div>
  );
}
function Divider() {
  return <div className="h-px bg-gray-100 mx-4" />;
}
