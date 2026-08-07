import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { createMember } from '@/services/memberService';
import { showAlert } from '@/store/alertStore';
import Button from '@/components/ui/Button';
import type { MemberInitials } from '@/types';
import { MEMBER_INITIALS } from '@/types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s\-().]{7,15}$/;

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

function validate(name: string, email: string, phone: string) {
  if (!name.trim()) return { field: 'name', msg: 'Full name is required' };
  if (!email.trim()) return { field: 'email', msg: 'Email is required' };
  if (!EMAIL_RE.test(email.trim())) return { field: 'email', msg: 'Enter a valid email address' };
  if (!phone.trim()) return { field: 'phone', msg: 'Mobile number is required' };
  if (!PHONE_RE.test(phone.trim())) return { field: 'phone', msg: 'Enter a valid mobile number' };
  return null;
}

export default function AdminNewMemberPage() {
  const navigate = useNavigate();
  const { session, appRole } = useAuthStore();

  const [initials, setInitials] = useState<MemberInitials>('TM');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthMonth, setBirthMonth] = useState(''); // '01'..'12'
  const [birthDay, setBirthDay] = useState(''); // '01'..'31'
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const maxDay = MONTHS.find((m) => m.value === birthMonth)?.days ?? 31;

  function selectMonth(value: string) {
    setBirthMonth(value);
    const max = MONTHS.find((m) => m.value === value)?.days ?? 31;
    if (birthDay && Number(birthDay) > max) setBirthDay('');
  }

  function touch(field: string) {
    setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  async function handleSubmit() {
    const err = validate(name, email, phone);
    if (err) {
      setErrors({ [err.field]: err.msg });
      return;
    }
    if (!session) return;
    setSubmitting(true);
    try {
      const birthday = birthMonth && birthDay ? `${birthMonth}-${birthDay}` : undefined;
      await createMember(
        { name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), birthday, initials },
        session.access_token,
      );
      await showAlert(`An invitation email has been sent to ${email.trim()} to set up their account.`);
      navigate(appRole === 'super_admin' ? '/admin/members' : '/members', { replace: true });
    } catch (e: unknown) {
      await showAlert(e instanceof Error ? e.message : 'Failed to create member');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center text-brand font-semibold text-base w-[70px]">
            <ChevronLeft size={20} /> Cancel
          </button>
          <h1 className="text-lg font-bold text-gray-900">New Member</h1>
          <div className="w-[70px]" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-12 max-w-lg mx-auto w-full">
        <Label>Initials</Label>
        <div className="flex gap-2.5 mb-4">
          {MEMBER_INITIALS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setInitials(opt)}
              className={`flex-1 rounded-[10px] py-3.5 text-[15px] font-semibold border transition-colors ${
                initials === opt ? 'border-brand bg-brand/5 text-brand' : 'border-gray-300 text-gray-500'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        <Label>Full Name <span className="text-red-500">*</span></Label>
        <input value={name} onChange={(e) => { setName(e.target.value); touch('name'); }} placeholder="e.g. Priya Sharma" className={inputCls(errors.name)} />
        {errors.name && <p className="text-xs text-red-500 -mt-3.5 mb-3.5">{errors.name}</p>}

        <Label>Email <span className="text-red-500">*</span></Label>
        <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); touch('email'); }} placeholder="member@example.com" className={inputCls(errors.email)} />
        {errors.email && <p className="text-xs text-red-500 -mt-3.5 mb-3.5">{errors.email}</p>}

        <Label>Mobile <span className="text-red-500">*</span></Label>
        <input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); touch('phone'); }} placeholder="+91 98765 43210" className={inputCls(errors.phone)} />
        {errors.phone && <p className="text-xs text-red-500 -mt-3.5 mb-3.5">{errors.phone}</p>}

        <Label>Date of Birth <span className="text-gray-400 font-normal">(optional)</span></Label>
        <div className="flex items-center gap-2.5 mb-1.5">
          <select
            value={birthMonth}
            onChange={(e) => selectMonth(e.target.value)}
            className="flex-1 bg-white border border-gray-300 rounded-[10px] px-3.5 py-3.5 text-[15px] text-gray-900 outline-none focus:border-brand"
          >
            <option value="">Month</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select
            value={birthDay}
            onChange={(e) => setBirthDay(e.target.value)}
            disabled={!birthMonth}
            className="w-24 bg-white border border-gray-300 rounded-[10px] px-3.5 py-3.5 text-[15px] text-gray-900 outline-none focus:border-brand disabled:opacity-50"
          >
            <option value="">Day</option>
            {Array.from({ length: maxDay }, (_, i) => String(i + 1).padStart(2, '0')).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          {(birthMonth || birthDay) && (
            <button onClick={() => { setBirthMonth(''); setBirthDay(''); }} className="p-2.5"><X size={16} className="text-gray-400" /></button>
          )}
        </div>
        <p className="text-xs text-gray-400 mb-7">Only month and day are needed — used for birthday reminders, no year required.</p>

        <Button fullWidth size="lg" loading={submitting} onClick={handleSubmit}>
          Add Member &amp; Send Invite
        </Button>
      </div>
    </div>
  );
}

function inputCls(err?: string) {
  return `w-full bg-white border rounded-[10px] px-4 py-3.5 text-base text-gray-900 outline-none focus:border-brand mb-4 ${err ? 'border-red-500' : 'border-gray-300'}`;
}
function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] font-semibold text-gray-700 mb-2">{children}</p>;
}
