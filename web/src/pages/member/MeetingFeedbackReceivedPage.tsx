import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Frown, Meh, Smile, MessageSquare } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getMeetingById, getReceivedFeedback } from '@/services/meetingService';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Meeting, ReceivedFeedback } from '@/types';

const RATING_LABELS: Record<number, string> = { 1: 'Need Improvement', 2: 'Ok', 3: 'Super' };
const RATING_ICONS: Record<number, typeof Frown> = { 1: Frown, 2: Meh, 3: Smile };
const FEEDBACK_FIELDS: { key: 'content_rating' | 'structure_rating' | 'confidence_rating' | 'interaction_rating'; label: string }[] = [
  { key: 'content_rating', label: 'Content' },
  { key: 'structure_rating', label: 'Structure' },
  { key: 'confidence_rating', label: 'Confidence' },
  { key: 'interaction_rating', label: 'Interact' },
];

function RatingBadge({ value }: { value: number }) {
  const Icon = RATING_ICONS[value] ?? Meh;
  return (
    <span className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">
      <Icon size={12} className="text-gray-500" />
      <span className="text-[11px] font-semibold text-gray-600">{RATING_LABELS[value] ?? '—'}</span>
    </span>
  );
}

export default function MeetingFeedbackReceivedPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { session } = useAuthStore();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [feedback, setFeedback] = useState<ReceivedFeedback[]>([]);
  const [fetching, setFetching] = useState(true);

  const load = useCallback(async () => {
    if (!session || !meetingId) return;
    setFetching(true);
    try {
      const [m, f] = await Promise.all([
        getMeetingById(meetingId, session.access_token),
        getReceivedFeedback(meetingId, session.access_token),
      ]);
      setMeeting(m);
      setFeedback(f);
    } catch { /* ignore */ } finally {
      setFetching(false);
    }
  }, [session, meetingId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate('/feedback-history')} className="flex items-center text-brand font-semibold text-base w-[70px]">
            <ChevronLeft size={20} /> Back
          </button>
          <h1 className="text-lg font-bold text-gray-900 truncate">Feedback</h1>
          <div className="w-[70px]" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-12 max-w-lg mx-auto w-full">
        {fetching ? (
          <>
            <Skeleton className="w-48 h-6 rounded-full mb-4" />
            <Skeleton className="w-full h-28 rounded-2xl" />
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-1">{meeting?.title}</h2>
            <p className="text-[13px] text-gray-500 mb-5">Feedback is anonymous.</p>

            {feedback.length === 0 ? (
              <div className="flex flex-col items-center gap-3 pt-16">
                <MessageSquare size={36} className="text-gray-300" />
                <p className="text-sm text-gray-400 text-center">No feedback published for this meeting yet.</p>
              </div>
            ) : (
              feedback.map((f, i) => (
                <div key={f.id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
                  <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-2">Feedback {i + 1}</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {FEEDBACK_FIELDS.map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-1">
                        <span className="text-[11px] text-gray-400">{label}:</span>
                        <RatingBadge value={f[key]} />
                      </div>
                    ))}
                  </div>
                  {f.comment && <p className="text-[13px] text-gray-600 italic">"{f.comment}"</p>}
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
