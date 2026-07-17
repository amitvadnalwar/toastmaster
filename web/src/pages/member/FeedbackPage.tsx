import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle, MicOff, Star } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getMeetingRoster, getMyFeedback, submitFeedback } from '@/services/meetingService';
import { Skeleton } from '@/components/ui/Skeleton';
import type { MeetingRoleAssignment, SpeakerFeedback, SpeakerFeedbackPayload } from '@/types';

interface SpeakerRow {
  assignment: MeetingRoleAssignment;
  rating: number;
  comment: string;
}

function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-2.5 mb-3.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => onChange(n)} className="p-1 -m-1">
          <Star size={30} className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} />
        </button>
      ))}
    </div>
  );
}

export default function MemberFeedbackPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuthStore();

  const [speakers, setSpeakers] = useState<SpeakerRow[]>([]);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [fetching, setFetching] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!session || !id) return;
    setFetching(true);
    try {
      const [rosterData, existing] = await Promise.all([
        getMeetingRoster(id, session.access_token),
        getMyFeedback(id, session.access_token).catch(() => [] as SpeakerFeedback[]),
      ]);
      setMeetingTitle(rosterData.meeting.title);
      const feedbackMap = new Map<string, SpeakerFeedback>(existing.map((fb) => [fb.speaker_member_id, fb]));
      const rows: SpeakerRow[] = rosterData.roster
        .filter((r) => r.role === 'speaker')
        .map((a) => {
          const prev = feedbackMap.get(a.member_id);
          return { assignment: a, rating: prev?.rating ?? 0, comment: prev?.comment ?? '' };
        });
      setSpeakers(rows);
    } catch { /* ignore */ } finally {
      setFetching(false);
    }
  }, [session, id]);

  useEffect(() => { load(); }, [load]);

  function updateRating(index: number, rating: number) {
    setSpeakers((prev) => prev.map((r, i) => (i === index ? { ...r, rating } : r)));
  }
  function updateComment(index: number, comment: string) {
    setSpeakers((prev) => prev.map((r, i) => (i === index ? { ...r, comment } : r)));
  }

  async function handleSubmit() {
    const unrated = speakers.filter((r) => r.rating === 0);
    if (unrated.length > 0) {
      alert('Please rate all speakers before submitting.');
      return;
    }
    if (!session || !id) return;
    setSubmitting(true);
    try {
      const payload: SpeakerFeedbackPayload[] = speakers.map((r) => ({
        speaker_member_id: r.assignment.member_id,
        rating: r.rating,
        comment: r.comment.trim() || null,
      }));
      await submitFeedback(id, payload, session.access_token);
      alert('Thank you for your feedback!');
      navigate(`/meetings/${id}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col min-h-full bg-[#f5f5f5]">
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate(`/meetings/${id}`)} className="flex items-center text-brand font-semibold text-base w-[60px]">
            <ChevronLeft size={20} /> Back
          </button>
          <h1 className="text-[17px] font-bold text-gray-900">Speaker Feedback</h1>
          <div className="w-[60px]" />
        </div>
      </div>

      {fetching ? (
        <div className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full">
          <Skeleton className="w-52 h-8 rounded-full mb-4" />
          <Skeleton className="w-64 h-3 mb-4" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-[18px] mb-3.5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="w-[42px] h-[42px] rounded-full" />
                <div className="flex-1">
                  <Skeleton className="w-32 h-4 mb-2" />
                  <Skeleton className="w-20 h-3" />
                </div>
              </div>
              <div className="flex gap-2.5 mb-3.5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Skeleton key={j} className="w-[30px] h-[30px] rounded-md" />
                ))}
              </div>
              <Skeleton className="w-full h-16 rounded-[10px]" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-4 pb-28 max-w-lg mx-auto w-full">
            <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3.5 py-2 mb-4">
              <CheckCircle size={14} className="text-green-600" />
              <span className="text-[13px] font-semibold text-green-700">Checked in · {meetingTitle}</span>
            </div>

            {speakers.length === 0 ? (
              <div className="flex flex-col items-center gap-3 pt-16">
                <MicOff size={36} className="text-gray-300" />
                <p className="text-sm text-gray-400">No speakers in this meeting.</p>
              </div>
            ) : (
              <>
                <p className="text-[13px] text-gray-500 mb-4">Rate each speaker's performance and leave optional comments.</p>
                {speakers.map((row, i) => (
                  <div key={row.assignment.id} className="bg-white rounded-2xl p-[18px] mb-3.5 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-[42px] h-[42px] rounded-full bg-blue-50 flex items-center justify-center">
                        <span className="text-lg font-bold text-blue-500">{(row.assignment.member_name ?? '?').charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-[15px] font-bold text-gray-900">{row.assignment.member_name ?? '—'}</p>
                        {row.assignment.speech_duration && <p className="text-xs text-gray-400 mt-0.5">{row.assignment.speech_duration}</p>}
                      </div>
                      {row.rating > 0 && <span className="text-sm font-bold text-amber-500">{row.rating}/5</span>}
                    </div>
                    <StarRating value={row.rating} onChange={(n) => updateRating(i, n)} />
                    <textarea
                      value={row.comment}
                      onChange={(e) => updateComment(i, e.target.value)}
                      placeholder="Add a comment (optional)…"
                      rows={3}
                      className="w-full border border-gray-200 rounded-[10px] p-3 text-sm text-gray-900 bg-[#fafafa] outline-none focus:border-brand resize-none"
                    />
                  </div>
                ))}
              </>
            )}
          </div>

          {speakers.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4">
              <div className="max-w-lg mx-auto">
                <button onClick={handleSubmit} disabled={submitting} className="w-full bg-brand text-white rounded-xl py-[15px] text-base font-bold disabled:opacity-60">
                  {submitting ? 'Submitting…' : 'Submit Feedback'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
