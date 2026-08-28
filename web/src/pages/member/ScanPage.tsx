import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, AlertCircle, KeyRound } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { checkinByCode } from '@/services/meetingService';

const CODE_LENGTH = 6;

export default function MemberScanPage() {
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const accessToken = session?.access_token;

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  async function submitCode(code: string) {
    if (!accessToken || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await checkinByCode(code, accessToken);
      navigate(`/meetings/${result.meeting.id}/feedback`, { replace: true });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Invalid code. Please try again.');
      setLoading(false);
      setDigits(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    }
  }

  // Reads/writes `digits` directly rather than via setDigits(prev => ...) —
  // StrictMode double-invokes updater functions in dev, and submitCode (a
  // network call) must only ever fire once per completed entry.
  function handleChange(index: number, raw: string) {
    const value = raw.replace(/\D/g, '');
    const next = [...digits];

    if (!value) {
      next[index] = '';
      setDigits(next);
      return;
    }

    // Handles a full code pasted or autofilled into one box, not just single digits.
    let i = index;
    for (const ch of value.split('')) {
      if (i >= CODE_LENGTH) break;
      next[i] = ch;
      i++;
    }
    setDigits(next);

    const joined = next.join('');
    if (joined.length === CODE_LENGTH) {
      submitCode(joined);
    } else {
      inputRefs.current[Math.min(i, CODE_LENGTH - 1)]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setDigits((prev) => { const next = [...prev]; next[index - 1] = ''; return next; });
      e.preventDefault();
    }
  }

  return (
    <div className="flex flex-col min-h-full bg-[#f5f5f5]">
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate('/home')} className="flex items-center text-brand font-semibold text-base w-[60px]">
            <ChevronLeft size={20} /> Back
          </button>
          <h1 className="text-[17px] font-bold text-gray-900">Check In</h1>
          <div className="w-[60px]" />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-6 pt-16">
        <div className="w-16 h-16 rounded-full bg-brand-light flex items-center justify-center mb-5">
          <KeyRound size={28} className="text-brand" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1.5 text-center">Enter Check-In Code</h2>
        <p className="text-[15px] text-gray-500 text-center leading-relaxed mb-8 max-w-xs">
          Ask your TMOD or SAA for today's 6-digit code, shown on screen at the meeting.
        </p>

        <div className="flex gap-2.5 mb-6">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={loading}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={CODE_LENGTH}
              autoFocus={i === 0}
              className="w-11 h-14 text-center text-2xl font-bold text-gray-900 bg-white border-2 border-gray-200 rounded-xl outline-none focus:border-brand disabled:opacity-60"
            />
          ))}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <span className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-semibold">Checking in…</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-1.5 text-red-500">
            <AlertCircle size={16} />
            <span className="text-[13px] text-center">{error}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
