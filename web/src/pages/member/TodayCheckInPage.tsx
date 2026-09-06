import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, CheckCircle2, KeyRound, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { ApiError } from '@/lib/apiClient';
import { getTodaysMeeting } from '@/services/meetingService';
import { formatDate, formatTime } from '@/lib/utils';
import { PageSpinner } from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import type { CheckinResult } from '@/types';
import { CLUB_SHORT_NAME } from '@/lib/constants';

export default function TodayCheckInPage() {
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!session) return;
    getTodaysMeeting(session.access_token)
      .then(setResult)
      .catch((e: unknown) => {
        // No meeting scheduled today — straight through to the dashboard,
        // this page has nothing to show.
        if (e instanceof ApiError && e.status === 404) {
          navigate('/home', { replace: true });
        }
      })
      .finally(() => setFetching(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  if (fetching || !result) return <PageSpinner />;

  const { meeting, already_checked_in } = result;

  return (
    <div className="flex flex-col min-h-full bg-[#f5f5f5]">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand flex items-center justify-center mb-3 shadow-lg">
            <span className="text-white text-xl font-black">T</span>
          </div>
          <h1 className="text-lg font-black text-gray-900">{CLUB_SHORT_NAME}</h1>
        </div>

        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="bg-brand px-5 py-3">
            <p className="text-white text-[11px] font-bold uppercase tracking-wide">Today's Meeting</p>
          </div>
          <div className="p-5">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{meeting.title}</h2>
            <div className="flex items-center gap-2.5 mb-2.5">
              <Calendar size={16} className="text-gray-400 shrink-0" />
              <span className="text-sm text-gray-700 font-medium">{formatDate(meeting.scheduled_at)}</span>
            </div>
            <div className="flex items-center gap-2.5 mb-2.5">
              <Clock size={16} className="text-gray-400 shrink-0" />
              <span className="text-sm text-gray-700 font-medium">{formatTime(meeting.scheduled_at)}</span>
            </div>
            {meeting.venue && (
              <div className="flex items-center gap-2.5">
                <MapPin size={16} className="text-gray-400 shrink-0" />
                <span className="text-sm text-gray-700 font-medium">{meeting.venue}</span>
              </div>
            )}

            {already_checked_in && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3.5 py-2.5 mt-4">
                <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                <span className="text-[13px] text-green-700 font-semibold">You're checked in</span>
              </div>
            )}
          </div>
        </div>

        <div className="w-full max-w-sm">
          {already_checked_in ? (
            <Button
              fullWidth
              size="lg"
              onClick={() => navigate(`/meetings/${meeting.id}/feedback`)}
              className="flex items-center justify-center gap-2"
            >
              Continue to Feedback <ArrowRight size={18} />
            </Button>
          ) : (
            <Button
              fullWidth
              size="lg"
              onClick={() => navigate('/scan')}
              className="flex items-center justify-center gap-2"
            >
              <KeyRound size={18} /> Check In
            </Button>
          )}

          <button
            onClick={() => navigate('/home')}
            className="w-full text-center text-gray-500 text-sm font-semibold mt-4 py-2"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
