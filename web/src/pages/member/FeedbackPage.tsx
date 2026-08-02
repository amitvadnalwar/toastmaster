import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle, MicOff, Frown, Meh, Smile } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { showAlert } from '@/store/alertStore';
import { getMeetingRoster, getMyFeedback, submitFeedback } from '@/services/meetingService';
import { Skeleton } from '@/components/ui/Skeleton';
import type { MeetingRoleAssignment, SpeakerFeedback, SpeakerFeedbackPayload } from '@/types';

interface SpeakerRow {
  assignment: MeetingRoleAssignment;
  content: number;
  structure: number;
  confidence: number;
  interaction: number;
  comment: string;
}

type CategoryKey = 'content' | 'structure' | 'confidence' | 'interaction';

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: 'content', label: 'Content' },
  { key: 'structure', label: 'Structure' },
  { key: 'confidence', label: 'Confidence' },
  { key: 'interaction', label: 'Interact' },
];

const SMILEYS: { value: 1 | 2 | 3; label: string; Icon: typeof Frown }[] = [
  { value: 1, label: 'Need Improvement', Icon: Frown },
  { value: 2, label: 'Ok', Icon: Meh },
  { value: 3, label: 'Super', Icon: Smile },
];

function SmileyRow({ label, value, onChange }: { label: string; value: number; onChange: (n: 1 | 2 | 3) => void }) {
  return (
    <div className="mb-3.5 last:mb-0">
      <p className="text-[13px] font-semibold text-gray-700 mb-1.5">{label}</p>
      <div className="flex gap-2">
        {SMILEYS.map(({ value: v, label: optLabel, Icon }) => {
          const selected = value === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-colors ${
                selected ? 'border-brand bg-brand/5' : 'border-gray-200 bg-white'
              }`}
            >
              <Icon size={22} className={selected ? 'text-brand' : 'text-gray-300'} />
              <span className={`text-[10px] font-semibold text-center leading-tight ${selected ? 'text-brand' : 'text-gray-400'}`}>
                {optLabel}
              </span>
            </button>
          );
        })}
      </div>
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
      const myEmail = session.user?.email;
      const rows: SpeakerRow[] = rosterData.roster
        .filter((r) => r.role === 'speaker' && r.member_email !== myEmail)
        .map((a) => {
          const prev = feedbackMap.get(a.member_id);
          return {
            assignment: a,
            content: prev?.content_rating ?? 0,
            structure: prev?.structure_rating ?? 0,
            confidence: prev?.confidence_rating ?? 0,
            interaction: prev?.interaction_rating ?? 0,
            comment: prev?.comment ?? '',
          };
        });
      setSpeakers(rows);
    } catch { /* ignore */ } finally {
      setFetching(false);
    }
  }, [session, id]);

  useEffect(() => { load(); }, [load]);

  function updateRating(index: number, key: CategoryKey, value: 1 | 2 | 3) {
    setSpeakers((prev) => prev.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  }
  function updateComment(index: number, comment: string) {
    setSpeakers((prev) => prev.map((r, i) => (i === index ? { ...r, comment } : r)));
  }

  async function handleSubmit() {
    const unrated = speakers.some(
      (r) => r.content === 0 || r.structure === 0 || r.confidence === 0 || r.interaction === 0,
    );
    if (unrated) {
      await showAlert('Please rate all categories for every speaker before submitting.');
      return;
    }
    if (!session || !id) return;
    setSubmitting(true);
    try {
      const payload: SpeakerFeedbackPayload[] = speakers.map((r) => ({
        speaker_member_id: r.assignment.member_id,
        content_rating: r.content,
        structure_rating: r.structure,
        confidence_rating: r.confidence,
        interaction_rating: r.interaction,
        comment: r.comment.trim() || null,
      }));
      await submitFeedback(id, payload, session.access_token);
      await showAlert('Thank you for your feedback!');
      navigate(`/meetings/${id}`);
    } catch (e: unknown) {
      await showAlert(e instanceof Error ? e.message : 'Failed to submit feedback. Please try again.');
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
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="w-full h-14 rounded-xl mb-2.5" />
              ))}
              <Skeleton className="w-full h-16 rounded-[10px]" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-4 pb-28 max-w-lg mx-auto w-full">
            <h2 className="text-2xl font-black text-gray-900 mb-1.5">{meetingTitle}</h2>
            <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3.5 py-2 mb-5">
              <CheckCircle size={14} className="text-green-600" />
              <span className="text-[13px] font-semibold text-green-700">Checked in</span>
            </div>

            {speakers.length === 0 ? (
              <div className="flex flex-col items-center gap-3 pt-16">
                <MicOff size={36} className="text-gray-300" />
                <p className="text-sm text-gray-400">No speakers to rate for this meeting.</p>
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
                    </div>

                    {CATEGORIES.map(({ key, label }) => (
                      <SmileyRow key={key} label={label} value={row[key]} onChange={(v) => updateRating(i, key, v)} />
                    ))}

                    <textarea
                      value={row.comment}
                      onChange={(e) => updateComment(i, e.target.value)}
                      placeholder="Add a comment (optional)…"
                      rows={3}
                      className="w-full mt-3.5 border border-gray-200 rounded-[10px] p-3 text-sm text-gray-900 bg-[#fafafa] outline-none focus:border-brand resize-none"
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
