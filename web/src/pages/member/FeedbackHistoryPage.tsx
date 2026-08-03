import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MessageSquare, Calendar } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getSpeakingHistory } from '@/services/meetingService';
import { Skeleton } from '@/components/ui/Skeleton';
import type { SpeakingHistoryItem } from '@/types';
import { formatDate } from '@/lib/utils';

export default function FeedbackHistoryPage() {
  const navigate = useNavigate();
  const { session } = useAuthStore();

  const [history, setHistory] = useState<SpeakingHistoryItem[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!session) return;
    getSpeakingHistory(session.access_token)
      .then(setHistory)
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [session]);

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate('/home')} className="flex items-center text-brand font-semibold text-base w-[70px]">
            <ChevronLeft size={20} /> Back
          </button>
          <h1 className="text-lg font-bold text-gray-900 truncate">Feedback &amp; Rating</h1>
          <div className="w-[70px]" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-12 max-w-lg mx-auto w-full">
        {fetching ? (
          <>
            <Skeleton className="w-full h-16 rounded-2xl mb-2.5" />
            <Skeleton className="w-full h-16 rounded-2xl" />
          </>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center gap-3 pt-16">
            <MessageSquare size={36} className="text-gray-300" />
            <p className="text-sm text-gray-400 text-center">You haven't spoken at a meeting yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {history.map((m, i) => (
              <button
                key={m.meeting_id}
                onClick={() => navigate(`/feedback-history/${m.meeting_id}`)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left ${i > 0 ? 'border-t border-gray-100' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{m.title}</p>
                  <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                    <Calendar size={11} />
                    <span>{formatDate(m.scheduled_at)}</span>
                  </div>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  {m.feedback_count} feedback{m.feedback_count === 1 ? '' : 's'}
                </span>
                <ChevronRight size={18} className="text-gray-400 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
