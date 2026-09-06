import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, AlertCircle, CalendarX } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { ApiError } from '@/lib/apiClient';
import { getTodaysMeeting, checkinMeeting } from '@/services/meetingService';
import Button from '@/components/ui/Button';

// TEMPORARY: skips the 6-digit code prompt — checks the member straight into
// today's meeting on arrival. Revert to code entry (see git history for this
// file) once that step comes back.
export default function MemberScanPage() {
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const accessToken = session?.access_token;

  const [noMeetingToday, setNoMeetingToday] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    (async () => {
      try {
        const today = await getTodaysMeeting(accessToken);
        const result = await checkinMeeting(today.meeting.id, accessToken);
        if (!cancelled) navigate(`/meetings/${result.meeting.id}/feedback`, { replace: true });
      } catch (e: unknown) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 404) {
          setNoMeetingToday(true);
        } else {
          setError(e instanceof Error ? e.message : 'Failed to check in. Please try again.');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [accessToken, navigate]);

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
        {noMeetingToday ? (
          <>
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-5">
              <CalendarX size={28} className="text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1.5 text-center">No Meeting Today</h2>
            <p className="text-[15px] text-gray-500 text-center leading-relaxed mb-8 max-w-xs">
              There's no meeting scheduled for today to check in to.
            </p>
            <Button onClick={() => navigate('/home')}>Back to Dashboard</Button>
          </>
        ) : error ? (
          <>
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-5">
              <AlertCircle size={28} className="text-red-500" />
            </div>
            <p className="text-[15px] text-red-600 text-center leading-relaxed mb-8 max-w-xs">{error}</p>
            <Button onClick={() => navigate('/home')}>Back to Dashboard</Button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 pt-8">
            <span className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 font-semibold">Checking you in…</p>
          </div>
        )}
      </div>
    </div>
  );
}
