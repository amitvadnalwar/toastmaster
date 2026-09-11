import { FormEvent, useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface Props {
  loading: boolean;
  onSubmit: (email: string, name: string, phone: string) => void;
}

// Collects the same three details as the member passwordless login screen —
// Email, Full Name, Mobile Number — so guests and members have one
// consistent, password-free way in. No "how did you find us?" question, and
// no option to register as a member from here.
export default function RegisterForm({ loading, onSubmit }: Props) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!phone.trim()) {
      setError('Please enter your mobile number.');
      return;
    }

    onSubmit(email.trim(), name.trim(), phone.trim());
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
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />

        <Input
          label="Full Name"
          type="text"
          placeholder="e.g. Priya Sharma"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />

        <Input
          label="Mobile Number"
          type="tel"
          placeholder="98765 43210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
          inputMode="numeric"
        />

        <Button type="submit" fullWidth size="lg" loading={loading} className="mt-2">
          Continue
        </Button>
      </form>
    </>
  );
}
