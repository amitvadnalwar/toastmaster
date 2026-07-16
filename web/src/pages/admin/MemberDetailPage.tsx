import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { getMember, updateMember, resendInvite } from '@/services/memberService';
import { AdminBottomNav } from '@/components/layout/BottomNav';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { PageSpinner } from '@/components/ui/Spinner';
import type { Member } from '@/types';
import { CLUB_ROLE_LABELS } from '@/types';
import { initials, formatDateShort } from '@/lib/utils';

const APP_ROLE_LABELS: Record<string, string> = {
  member: 'Member',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 gap-4">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900 text-right truncate">{value || '—'}</span>
    </div>
  );
}

export default function AdminMemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuthStore();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [resending, setResending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session || !id) return;
    getMember(id, session.access_token)
      .then(setMember)
      .finally(() => setLoading(false));
  }, [session, id]);

  async function handleToggleActive() {
    if (!session || !id || !member) return;
    setUpdating(true);
    setError('');
    try {
      const updated = await updateMember(id, { is_active: !member.is_active }, session.access_token);
      setMember(updated);
      setSuccess(`Member ${updated.is_active ? 'activated' : 'deactivated'}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setUpdating(false);
    }
  }

  async function handleRoleChange(club_role: string) {
    if (!session || !id || !member) return;
    setUpdating(true);
    setError('');
    try {
      const updated = await updateMember(id, { club_role }, session.access_token);
      setMember(updated);
      setSuccess('Role updated');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setUpdating(false);
    }
  }

  async function handleResendInvite() {
    if (!session || !id) return;
    setResending(true);
    setError('');
    try {
      await resendInvite(id, session.access_token);
      setSuccess('Invite sent');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setResending(false);
    }
  }

  if (loading) return <div className="flex flex-col min-h-full bg-gray-50"><PageHeader title="Member" back /><PageSpinner /></div>;
  if (!member) return <div className="flex flex-col min-h-full bg-gray-50"><PageHeader title="Member" back /><p className="text-center mt-20 text-gray-500">Not found</p></div>;

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <PageHeader title="Member Details" back backPath="/admin/members" />

      <div className="flex-1 overflow-y-auto pb-28 max-w-lg mx-auto w-full">
        {/* Avatar */}
        <div className="flex flex-col items-center pt-8 pb-6">
          <div className="w-20 h-20 rounded-full bg-brand flex items-center justify-center mb-3">
            <span className="text-white text-3xl font-bold">{initials(member.name)}</span>
          </div>
          <h2 className="text-xl font-black text-gray-900">{member.name}</h2>
          <p className="text-sm text-gray-500 mt-1">{CLUB_ROLE_LABELS[member.club_role] ?? member.club_role}</p>
          <span className={`mt-2 text-xs font-bold px-2.5 py-1 rounded-full ${member.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {member.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Details */}
        <p className="mx-4 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Details</p>
        <div className="mx-4 bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50 mb-4">
          <DetailRow label="Email" value={member.email} />
          <DetailRow label="Phone" value={member.phone ?? ''} />
          <DetailRow label="Birthday" value={member.birthday ?? ''} />
          <DetailRow label="App Role" value={APP_ROLE_LABELS[member.app_role] ?? member.app_role} />
          <DetailRow label="Member Since" value={formatDateShort(member.created_at)} />
        </div>

        {/* Change Club Role */}
        <p className="mx-4 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Club Role</p>
        <div className="mx-4 mb-4">
          <Select
            value={member.club_role}
            onChange={(e) => handleRoleChange(e.target.value)}
            disabled={updating}
          >
            {Object.entries(CLUB_ROLE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </Select>
        </div>

        {/* Actions */}
        {success && (
          <div className="mx-4 mb-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <p className="text-sm text-green-700 font-medium">{success}</p>
          </div>
        )}
        {error && (
          <div className="mx-4 mb-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="mx-4 flex flex-col gap-3">
          <Button variant="outline" fullWidth onClick={handleResendInvite} loading={resending}>
            Resend Invite Email
          </Button>
          <Button
            variant={member.is_active ? 'danger' : 'primary'}
            fullWidth
            onClick={handleToggleActive}
            loading={updating}
          >
            {member.is_active ? 'Deactivate Member' : 'Activate Member'}
          </Button>
        </div>
      </div>

      <AdminBottomNav isSuperAdmin />
    </div>
  );
}
