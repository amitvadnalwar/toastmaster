import { useState, FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { ApiError } from '@/lib/apiClient';
import { simpleLogin } from '@/services/memberService';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Eye, EyeOff } from 'lucide-react';
import { CLUB_SHORT_NAME } from '@/lib/constants';

const SUPER_ADMIN_PASSWORD_REQUIRED = 'Super admin accounts sign in with a password.';

export default function LoginPage() {
  const { session, _hydrated } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  // Revealed only for a super admin's email — everyone else never sees a
  // password field at all.
  const [needsPassword, setNeedsPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (_hydrated && session) return <Navigate to="/" replace />;

  function goToGuest() {
    const meetingId = searchParams.get('meeting_id');
    navigate(meetingId ? `/guest?meeting_id=${meetingId}` : '/guest');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (needsPassword) {
        const { error: authErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authErr) throw authErr;
        return;
      }

      const result = await simpleLogin({ email: email.trim(), name: name.trim(), phone: phone.trim() });
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        token_hash: result.hashed_token,
        type: 'magiclink',
      });
      if (verifyErr) throw verifyErr;
    } catch (err: unknown) {
      if (err instanceof ApiError && err.message === SUPER_ADMIN_PASSWORD_REQUIRED) {
        setNeedsPassword(true);
        setError('This account signs in with a password.');
      } else {
        setError(err instanceof Error ? err.message : 'Sign in failed');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-5">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-brand flex items-center justify-center mb-4 shadow-lg">
            <span className="text-white text-2xl font-black">T</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900">{CLUB_SHORT_NAME}</h1>
        </div>

        {/* Member / Guest toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          <button
            type="button"
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-white text-brand shadow-sm"
          >
            Member
          </button>
          <button
            type="button"
            onClick={goToGuest}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-700"
          >
            Guest
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setNeedsPassword(false); setError(''); }}
            autoComplete="email"
            required
          />

          {needsPassword ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  autoFocus
                  required
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          ) : (
            <>
              <Input
                label="Full Name"
                type="text"
                placeholder="e.g. Priya Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
              <Input
                label="Mobile Number"
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                required
              />
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          <Button type="submit" fullWidth size="lg" loading={loading} className="mt-2">
            {needsPassword ? 'Sign In' : 'Continue'}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          New here?{' '}
          <button type="button" onClick={() => navigate('/register')} className="text-brand font-semibold">
            Register as Member
          </button>
        </p>

        <p className="text-center text-xs text-gray-400 mt-8">
          Toastmasters International · Club #7715097
        </p>
        <p className="text-center text-xs text-gray-300 mt-1.5">
          Designed and developed by TM Shruti &amp; Amit Vadnalwar
        </p>
      </div>
    </div>
  );
}
