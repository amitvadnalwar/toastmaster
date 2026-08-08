import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Mail, X, Check, Edit2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import {
  getMemberById, getAllMembers, setMemberActive, resendInvite,
  updateMemberClubRole, updateMemberAppRole, updateMemberDetails,
} from '@/services/memberService';
import Spinner from '@/components/ui/Spinner';
import { ProfileSkeleton } from '@/components/ui/Skeleton';
import type { Member, ClubRole, AppRole, MemberInitials } from '@/types';
import { CLUB_ROLE_LABELS, APP_ROLE_LABELS, ASSIGNABLE_CLUB_ROLES, ASSIGNABLE_APP_ROLES, MEMBER_INITIALS } from '@/types';
import { initials as avatarInitials, formatDateShort } from '@/lib/utils';

type PickerTarget = 'club_role' | 'app_role' | null;

const MONTHS = [
  { value: '01', label: 'January', days: 31 },
  { value: '02', label: 'February', days: 29 },
  { value: '03', label: 'March', days: 31 },
  { value: '04', label: 'April', days: 30 },
  { value: '05', label: 'May', days: 31 },
  { value: '06', label: 'June', days: 30 },
  { value: '07', label: 'July', days: 31 },
  { value: '08', label: 'August', days: 31 },
  { value: '09', label: 'September', days: 30 },
  { value: '10', label: 'October', days: 31 },
  { value: '11', label: 'November', days: 30 },
  { value: '12', label: 'December', days: 31 },
];

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
  const [roleHolders, setRoleHolders] = useState<Map<ClubRole, { id: string; name: string }>>(new Map());

  // Edit details
  const [editing, setEditing] = useState(false);
  const [editInitials, setEditInitials] = useState<MemberInitials>('TM');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBirthMonth, setEditBirthMonth] = useState('');
  const [editBirthDay, setEditBirthDay] = useState('');
  const [saving, setSaving] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const editMaxDay = MONTHS.find((m) => m.value === editBirthMonth)?.days ?? 31;

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

  useEffect(() => {
    if (!session) return;
    getAllMembers(session.access_token).then((list) => {
      const map = new Map<ClubRole, { id: string; name: string }>();
      for (const m of list) {
        if (m.club_role !== 'member' && m.club_role !== 'guest') {
          map.set(m.club_role, { id: m.id, name: m.name });
        }
      }
      setRoleHolders(map);
    }).catch(() => {});
  }, [session]);

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

  function startEdit() {
    if (!member) return;
    setEditInitials(member.initials);
    setEditName(member.name);
    setEditEmail(member.email);
    setEditPhone(member.phone ?? '');
    const [month, day] = member.birthday ? member.birthday.split('-') : ['', ''];
    setEditBirthMonth(month ?? '');
    setEditBirthDay(day ?? '');
    setEditErrors({});
    setEditing(true);
  }

  function selectEditMonth(value: string) {
    setEditBirthMonth(value);
    const max = MONTHS.find((m) => m.value === value)?.days ?? 31;
    if (editBirthDay && Number(editBirthDay) > max) setEditBirthDay('');
  }

  async function handleSaveDetails() {
    if (!session || !member) return;
    if (!editName.trim()) { setEditErrors({ name: 'Full name is required' }); return; }
    if (!editEmail.trim()) { setEditErrors({ email: 'Email is required' }); return; }
    if (!editPhone.trim()) { setEditErrors({ phone: 'Mobile number is required' }); return; }
    setSaving(true);
    try {
      const birthday = editBirthMonth && editBirthDay ? `${editBirthMonth}-${editBirthDay}` : null;
      const updated = await updateMemberDetails(member.id, {
        name: editName.trim(),
        email: editEmail.trim().toLowerCase(),
        phone: editPhone.trim(),
        birthday,
        initials: editInitials,
      }, session.access_token);
      setMember(updated);
      setEditing(false);
      flash('Details updated');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to update details');
    } finally {
      setSaving(false);
    }
  }

  async function handleSelectRole(value: string) {
    if (!session || !member || !pickerTarget) return;
    const target = pickerTarget;
    setPickerTarget(null);
    setSavingRole(true);
    try {
      if (target === 'club_role') {
        const previousHolder = roleHolders.get(value as ClubRole);
        await updateMemberClubRole(member.id, value as ClubRole, session.access_token);
        setMember((prev) => (prev ? { ...prev, club_role: value as ClubRole } : prev));
        if (previousHolder && previousHolder.id !== member.id) {
          flash(`${CLUB_ROLE_LABELS[value as ClubRole]} transferred from ${previousHolder.name} to ${member.name}`);
        } else {
          flash(`Club role updated to ${CLUB_ROLE_LABELS[value as ClubRole]}`);
        }
        setRoleHolders((prev) => {
          const next = new Map(prev);
          if (value !== 'member') next.set(value as ClubRole, { id: member.id, name: member.name });
          return next;
        });
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
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          {editing ? (
            <button onClick={() => setEditing(false)} className="text-brand font-semibold text-base w-[70px] text-left">Cancel</button>
          ) : (
            <button onClick={() => navigate('/admin/members')} className="flex items-center text-brand font-semibold text-base w-[70px]">
              <ChevronLeft size={20} /> Back
            </button>
          )}
          <h1 className="text-lg font-bold text-gray-900">{editing ? 'Edit Member' : 'Member Details'}</h1>
          <div className="w-[70px] flex justify-end">
            {editing ? (
              <button onClick={handleSaveDetails} disabled={saving} className="p-2">
                {saving ? <Spinner size="sm" /> : <Check size={20} className="text-green-500" />}
              </button>
            ) : (
              <button onClick={startEdit} className="p-2"><Edit2 size={18} className="text-gray-700" /></button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-12 max-w-lg mx-auto w-full">
        {editing ? (
          <>
            <Label>Initials</Label>
            <div className="flex gap-2.5 mb-4">
              {MEMBER_INITIALS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setEditInitials(opt)}
                  className={`flex-1 rounded-[10px] py-3.5 text-[15px] font-semibold border transition-colors ${
                    editInitials === opt ? 'border-brand bg-brand/5 text-brand' : 'border-gray-300 text-gray-500'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            <Label>Full Name</Label>
            <input value={editName} onChange={(e) => setEditName(e.target.value)} className={inputCls(editErrors.name)} />
            {editErrors.name && <p className="text-xs text-red-500 -mt-3.5 mb-3.5">{editErrors.name}</p>}

            <Label>Email</Label>
            <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className={inputCls(editErrors.email)} />
            {editErrors.email && <p className="text-xs text-red-500 -mt-3.5 mb-3.5">{editErrors.email}</p>}

            <Label>Mobile</Label>
            <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className={inputCls(editErrors.phone)} />
            {editErrors.phone && <p className="text-xs text-red-500 -mt-3.5 mb-3.5">{editErrors.phone}</p>}

            <Label>Date of Birth <span className="text-gray-400 font-normal">(optional)</span></Label>
            <div className="flex items-center gap-2.5 mb-1.5">
              <select
                value={editBirthMonth}
                onChange={(e) => selectEditMonth(e.target.value)}
                className="flex-1 bg-white border border-gray-300 rounded-[10px] px-3.5 py-3.5 text-[15px] text-gray-900 outline-none focus:border-brand"
              >
                <option value="">Month</option>
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <select
                value={editBirthDay}
                onChange={(e) => setEditBirthDay(e.target.value)}
                disabled={!editBirthMonth}
                className="w-24 bg-white border border-gray-300 rounded-[10px] px-3.5 py-3.5 text-[15px] text-gray-900 outline-none focus:border-brand disabled:opacity-50"
              >
                <option value="">Day</option>
                {Array.from({ length: editMaxDay }, (_, i) => String(i + 1).padStart(2, '0')).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              {(editBirthMonth || editBirthDay) && (
                <button onClick={() => { setEditBirthMonth(''); setEditBirthDay(''); }} className="p-2.5"><X size={16} className="text-gray-400" /></button>
              )}
            </div>
          </>
        ) : (
          <>
        {/* Avatar */}
        <div className="flex flex-col items-center mb-6">
          <div
            className="w-[72px] h-[72px] rounded-full flex items-center justify-center mb-3"
            style={{ backgroundColor: member.is_active ? '#8B1A1A' : '#9ca3af' }}
          >
            <span className="text-white text-[26px] font-bold">{avatarInitials(member.name)}</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1.5">{member.initials} {member.name}</h2>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
            <span className="text-[13px] text-gray-500 font-medium">{statusText}</span>
          </div>
        </div>

        {/* Details */}
        <SectionTitle>Details</SectionTitle>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-5">
          <DetailRow label="Initials" value={member.initials} />
          <Divider />
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
          </>
        )}
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
            {pickerOptions.map((opt) => {
              const holder = pickerTarget === 'club_role' ? roleHolders.get(opt.value as ClubRole) : undefined;
              const heldByOther = holder && holder.id !== member.id;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleSelectRole(opt.value)}
                  className="w-full px-5 py-4 flex items-center justify-between border-b border-gray-50 last:border-0"
                >
                  <div className="text-left">
                    <span className={`text-[15px] ${opt.value === currentPickerValue ? 'text-brand font-bold' : 'text-gray-700'}`}>
                      {opt.label}
                    </span>
                    {heldByOther && (
                      <p className="text-[11px] text-gray-400 mt-0.5">Currently: {holder.name} — will move to Member</p>
                    )}
                  </div>
                  {opt.value === currentPickerValue && <Check size={16} className="text-brand" />}
                </button>
              );
            })}
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
function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] font-semibold text-gray-700 mb-2">{children}</p>;
}
function inputCls(err?: string) {
  return `w-full bg-white border rounded-[10px] px-4 py-3.5 text-base text-gray-900 outline-none focus:border-brand mb-4 ${err ? 'border-red-500' : 'border-gray-300'}`;
}
function Divider() {
  return <div className="h-px bg-gray-100 mx-4" />;
}
