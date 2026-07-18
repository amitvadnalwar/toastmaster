import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { confirmPasswordChanged } from '@/services/memberService';
import Button from '@/components/ui/Button';
import { Eye, EyeOff, Lock } from 'lucide-react';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { session, setSession } = useAuthStore();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== confirm) return setError('Passwords do not match');

    setError('');
    setLoading(true);
    try {
      // 1. Update the password via Supabase Auth
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) throw updateErr;

      // 2. Tell the backend to clear the must_change_password flag — this
      //    lives in app_metadata, which only the service role can modify,
      //    so it cannot be cleared via the client-side updateUser() call above
      if (session) {
        await confirmPasswordChanged(session.access_token);
      }

      // 3. Refresh the session so the new access token no longer carries
      //    must_change_password (JWT claims are baked in at issuance time)
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) throw refreshError;
      if (refreshed.session) setSession(refreshed.session);

      navigate('/', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-5">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
            <Lock size={28} className="text-brand" />
          </div>
          <h1 className="text-2xl font-black text-gray-900">Set New Password</h1>
          <p className="text-sm text-gray-500 mt-1 text-center">
            {session?.user?.email}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">New Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 bg-white text-sm placeholder:text-gray-400 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1"
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">Confirm Password</label>
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Re-enter password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm placeholder:text-gray-400 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          <Button type="submit" fullWidth size="lg" loading={loading} className="mt-2">
            Update Password
          </Button>
        </form>
      </div>
    </div>
  );
}
