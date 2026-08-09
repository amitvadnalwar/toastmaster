import { FormEvent, useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { GUEST_SOURCES, type GuestSource } from '@/types/guest';

interface Props {
  loading: boolean;
  onSubmit: (name: string, phone: string | null, source: GuestSource) => void;
}

export default function RegisterForm({ loading, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState<GuestSource | ''>('');
  const [error, setError] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    const digits = phone.replace(/\D/g, '');
    if (phone && digits.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!source) {
      setError('Please select how you found us.');
      return;
    }

    onSubmit(name.trim(), phone.trim() || null, source);
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-1.5">Nice to meet you!</h1>
      <p className="text-[15px] text-gray-500 leading-relaxed mb-6">
        Tell us a bit about yourself to join today&apos;s meeting.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
          <p className="text-sm text-red-600 font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Full name *"
          type="text"
          placeholder="Your full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />

        <Input
          label="Mobile number"
          type="tel"
          placeholder="98765 43210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
          inputMode="numeric"
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-gray-700">How did you find us? *</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as GuestSource)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/10"
          >
            <option value="" disabled>
              Select an option
            </option>
            {GUEST_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" fullWidth size="lg" loading={loading} className="mt-2">
          Register
        </Button>
      </form>
    </>
  );
}
