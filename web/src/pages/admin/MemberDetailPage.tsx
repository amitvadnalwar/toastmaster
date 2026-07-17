import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Mail, X, Check } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import {
  getMemberById, setMemberActive, resendInvite,
  updateMemberClubRole, updateMemberAppRole,
} from '@/services/memberService';
import Spinner from '@/components/ui/Spinner';
import { ProfileSkeleton } from '@/components/ui/Skeleton';
import type { Member, ClubRole, AppRole } from '@/types';
import { CLUB_ROLE_LABELS, APP_ROLE_LABELS, ASSIGNABLE_CLUB_ROLES, ASSIGNABLE_APP_ROLES } from '@/types';
import { initials, formatDateShort } from '@/lib/utils';

type PickerTarget = 'club_role' | 'app_role' | null;

export default function AdminMemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuthStore();

  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [resending, setResending] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [savingRole, setSavingRole] = useState(false);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    if (!session || !id) return;
    try {
      const m = await getMemberById(id, session.access_token);
      setMember(m);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [session, id]);

  useEffect(() => { load(); }, [load]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function handleToggleActive() {
    if (!session || !member) return;
    const next = !member.is_active;
    const ok = window.confirm(
      next
        ? `${member.name} will be able to log in again.`
        : `${member.name} will be blocked from logging in. Their data is kept.`,
    );
    if (!ok) return;
    setToggling(true);
    try {
      await setMemberActive(member.id, next, session.access_token);
      setMember((prev) => (prev ? { ...prev, is_active: next } : prev));
      flash(next ? 'Account activated' : 'Account deactivated');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to update status');
    } finally {
      setToggling(false);
    }
  }

  async function handleResendInvite() {
    if (!session || !member) return;
    setResending(true);
    try {
      await resendInvite(member.id, session.access_token);
      flash(`Activation link sent to ${member.email}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to resend invite');
    } finally {
      setResending(false);
    }
  }

  async function handleSelectRole(value: string) {
    if (!session || !member || !pickerTarget) return;
    const target = pickerTarget;
    setPickerTarget(null);
    setSavingRole(true);
    try {
      if (target === 'club_role') {
        await updateMemberClubRole(member.id, value as ClubRole, session.access_token);
        setMember((prev) => (prev ? { ...prev, club_role: value as ClubRole } : prev));
        flash(`Club role updated to ${CLUB_ROLE_LABELS[value as ClubRole]}`);
      } else {
        await updateMemberAppRole(member.id, value as AppRole, session.access_token);
        setMember((prev) => (prev ? { ...prev, app_role: value as AppRole } : prev));
        flash(`App role updated to ${APP_ROLE_LABELS[value as AppRole]}`);
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to update role');
    } finally {
      setSavingRole(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-full bg-gray-50">
        <Header onBack={() => navigate('/admin/members')} />
        <ProfileSkeleton />
      </div>
    );
  }
  if (!member) return null;

  const statusColor = !member.is_active ? '#9ca3af' : member.is_confirmed ? '#10b981' : '#f59e0b';
  const statusText = !member.is_active ? 'Inactive' : member.is_confirmed ? 'Active' : 'Invite pending';

  const pickerOptions =
    pickerTarget === 'club_role'
      ? ASSIGNABLE_CLUB_ROLES.map((r) => ({ value: r, label: CLUB_ROLE_LABELS[r] }))
      : ASSIGNABLE_APP_ROLES.map((r) => ({ value: r, label: APP_ROLE_LABELS[r] }));
  const currentPickerValue = pickerTarget === 'club_role' ? member.club_role : member.app_role;

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <Header onBack={() => navigate('/admin/members')} />

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-12 max-w-lg mx-auto w-full">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-6">
          <div
            className="w-[72px] h-[72px] rounded-full flex items-center justify-center mb-3"
            style={{ backgroundColor: member.is_active ? '#8B1A1A' : '#9ca3af' }}
          >
            <span className="text-white text-[26px] font-bold">{initials(member.name)}</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1.5">{member.name}</h2>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
            <span className="text-[13px] text-gray-500 font-medium">{statusText}</span>
          </div>
        </div>

        {/* Details */}
        <SectionTitle>Details</SectionTitle>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-5">
          <DetailRow label="Email" value={member.email} />
          <Divider />
          <DetailRow label="Phone" value={member.phone ?? '—'} />
          <Divider />
          <DetailRow label="Birthday" value={member.birthday ?? '—'} />
          <Divider />
          <DetailRow label="Joined" value={formatDateShort(member.created_at)} />
        </div>

        {/* Account */}
        <SectionTitle>Account</SectionTitle>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-5">
          <div className="px-4 py-3.5 flex items-center justify-between">
            <div>
              <p className="text-[15px] font-semibold text-gray-900">Account Active</p>
              <p className="text-xs text-gray-500 mt-0.5">{member.is_active ? 'Member can log in' : 'Login blocked'}</p>
            </div>
            {toggling ? (
              <Spinner size="sm" />
            ) : (
              <button
                onClick={handleToggleActive}
                className={`w-12 h-7 rounded-full transition-colors relative ${member.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all ${member.is_active ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            )}
          </div>
          {!member.is_confirmed && (
            <>
              <Divider />
              <button onClick={handleResendInvite} disabled={resending} className="w-full px-4 py-3.5 flex items-center gap-2.5">
                {resending ? <Spinner size="sm" /> : <Mail size={16} className="text-brand" />}
                <span className="text-sm text-brand font-semibold">Resend Activation Link</span>
              </button>
            </>
          )}
        </div>

        {/* Roles */}
        <SectionTitle>Roles</SectionTitle>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button onClick={() => setPickerTarget('club_role')} disabled={savingRole} className="w-full px-4 py-3.5 flex items-center justify-between text-left">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Club Role</p>
              <p className="text-[15px] font-semibold text-gray-900">{CLUB_ROLE_LABELS[member.club_role]}</p>
            </div>
            {savingRole && pickerTarget === 'club_role' ? <Spinner size="sm" /> : <ChevronRight size={18} className="text-gray-400" />}
          </button>
          <Divider />
          <button onClick={() => setPickerTarget('app_role')} disabled={savingRole} className="w-full px-4 py-3.5 flex items-center justify-between text-left">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">App Role</p>
              <p className="text-[15px] font-semibold text-gray-900">{member.app_role ? APP_ROLE_LABELS[member.app_role] : '—'}</p>
            </div>
            {savingRole && pickerTarget === 'app_role' ? <Spinner size="sm" /> : <ChevronRight size={18} className="text-gray-400" />}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* Role picker bottom sheet */}
      {pickerTarget && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setPickerTarget(null)}>
          <div className="w-full bg-white rounded-t-3xl max-h-[60%] overflow-y-auto pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="text-base font-bold text-gray-900">
                {pickerTarget === 'club_role' ? 'Select Club Role' : 'Select App Role'}
              </h3>
              <button onClick={() => setPickerTarget(null)}><X size={20} className="text-gray-500" /></button>
            </div>
            {pickerOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSelectRole(opt.value)}
                className="w-full px-5 py-4 flex items-center justify-between border-b border-gray-50 last:border-0"
              >
                <span className={`text-[15px] ${opt.value === currentPickerValue ? 'text-brand font-bold' : 'text-gray-700'}`}>
                  {opt.label}
                </span>
                {opt.value === currentPickerValue && <Check size={16} className="text-brand" />}
              </button>
            ))}
          </div>
        </div>
      )}
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
        <h1 className="text-lg font-bold text-gray-900">Member Details</h1>
        <div className="w-[70px]" />
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5 mt-2">{children}</p>;
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
