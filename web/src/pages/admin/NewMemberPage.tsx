import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { createMember } from '@/services/memberService';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { AdminBottomNav } from '@/components/layout/BottomNav';
import { CLUB_ROLE_LABELS } from '@/types';

const APP_ROLES = [
  { value: 'member', label: 'Member' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
];

export default function AdminNewMemberPage() {
  const navigate = useNavigate();
  const { session } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [clubRole, setClubRole] = useState('member');
  const [appRole, setAppRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    if (!name.trim() || !email.trim()) return setError('Name and email are required');

    setError('');
    setLoading(true);
    try {
      await createMember(
        {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          birthday: birthday || undefined,
          club_role: clubRole,
          app_role: appRole,
        },
        session.access_token,
      );
      navigate('/admin/members', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create member');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <PageHeader title="Add Member" back backPath="/admin/members" />

      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-28 max-w-lg mx-auto w-full">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Full Name"
            placeholder="e.g. Rahul Sharma"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Email"
            type="email"
            placeholder="rahul@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Phone (optional)"
            type="tel"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            label="Birthday (optional)"
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
          />
          <Select
            label="Club Role"
            value={clubRole}
            onChange={(e) => setClubRole(e.target.value)}
          >
            {Object.entries(CLUB_ROLE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </Select>
          <Select
            label="App Role"
            value={appRole}
            onChange={(e) => setAppRole(e.target.value)}
          >
            {APP_ROLES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>

          <p className="text-xs text-gray-500 bg-gray-100 rounded-xl px-4 py-3">
            An invite email will be sent to the member with a temporary password.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          <Button type="submit" fullWidth size="lg" loading={loading} className="mt-2">
            Create Member
          </Button>
        </form>
      </div>

      <AdminBottomNav isSuperAdmin />
    </div>
  );
}
