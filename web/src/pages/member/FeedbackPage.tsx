import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { getMeetingRoster } from '@/services/meetingService';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { CheckCircle } from 'lucide-react';
import type { RosterEntry } from '@/types';
import { ROLE_LABELS } from '@/types';
import { apiRequest } from '@/lib/apiClient';

const EMOJIS = ['😞', '😕', '😐', '🙂', '😊'];

function EmojiRating({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-2">
      <span className="text-sm text-gray-700 flex-1">{label}</span>
      <div className="flex gap-1.5">
        {EMOJIS.map((emoji, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i + 1)}
            className={`text-xl transition-all ${value === i + 1 ? 'scale-125' : 'opacity-40'}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

interface SpeakerFeedbackState {
  member_id: string;
  name: string;
  content: number;
  structure: number;
  interaction: number;
  confidence: number;
  overall: number;
  comment: string;
}

export default function MemberFeedbackPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [speakers, setSpeakers] = useState<RosterEntry[]>([]);
  const [speakerFeedbacks, setSpeakerFeedbacks] = useState<SpeakerFeedbackState[]>([]);
  const [meetingRatings, setMeetingRatings] = useState({
    punctual: 0, agenda: 0, inclusive: 0, experience: 0, overall: 0, comment: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session || !id) return;
    getMeetingRoster(id, session.access_token)
      .then(({ roster }) => {
        const spkrs = roster.filter((r) => r.role === 'speaker');
        setSpeakers(spkrs);
        setSpeakerFeedbacks(
          spkrs.map((s) => ({
            member_id: s.member_id,
            name: s.member_name ?? 'Speaker',
            content: 0,
            structure: 0,
            interaction: 0,
            confidence: 0,
            overall: 0,
            comment: '',
          })),
        );
      })
      .finally(() => setLoading(false));
  }, [session, id]);

  function updateSpeakerFb(idx: number, field: keyof SpeakerFeedbackState, val: number | string) {
    setSpeakerFeedbacks((prev) =>
      prev.map((fb, i) => (i === idx ? { ...fb, [field]: val } : fb)),
    );
  }

  async function submit() {
    if (!session || !id) return;
    setError('');
    setSubmitting(true);

    try {
      const token = session.access_token;

      if (speakerFeedbacks.length > 0) {
        await apiRequest(`/members/me/speaker-feedback`, {
          method: 'POST',
          token,
          body: JSON.stringify({
            meeting_id: id,
            feedbacks: speakerFeedbacks.map((fb) => ({
              speaker_member_id: fb.member_id,
              content_rating: fb.content,
              structure_rating: fb.structure,
              interaction_rating: fb.interaction,
              confidence_rating: fb.confidence,
              overall_rating: fb.overall,
              comment: fb.comment || null,
            })),
          }),
        });
      }

      await apiRequest(`/members/me/meeting-feedback`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          meeting_id: id,
          punctual_rating: meetingRatings.punctual,
          agenda_rating: meetingRatings.agenda,
          inclusive_rating: meetingRatings.inclusive,
          experience_rating: meetingRatings.experience,
          overall_rating: meetingRatings.overall,
          comment: meetingRatings.comment || null,
        }),
      });

      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  }

  const totalSteps = speakers.length + 1;

  if (loading) return <div className="flex flex-col min-h-full bg-gray-50"><PageHeader title="Feedback" back /><PageSpinner /></div>;

  if (done) {
    return (
      <div className="flex flex-col min-h-full bg-gray-50">
        <PageHeader title="Feedback" back backPath={`/meetings/${id}`} />
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle size={44} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-900">Thank You!</h2>
          <p className="text-gray-500">Your feedback has been submitted.</p>
          <Button onClick={() => navigate(`/meetings/${id}`)} variant="primary" className="mt-4">
            Back to Meeting
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <PageHeader
        title="Meeting Feedback"
        back
        backPath={`/meetings/${id}`}
        subtitle={`Step ${step} of ${totalSteps}`}
      />

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-full bg-brand transition-all duration-300"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>

      <div className="flex-1 overflow-y-auto pb-10 max-w-lg mx-auto w-full px-4 pt-5">
        {/* Speaker feedback steps */}
        {step <= speakers.length && speakerFeedbacks[step - 1] && (
          <div className="flex flex-col gap-4">
            <div className="bg-brand rounded-2xl px-4 py-3">
              <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Speaker Feedback</p>
              <p className="text-white font-black text-lg mt-0.5">{speakerFeedbacks[step - 1].name}</p>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col divide-y divide-gray-50">
              <EmojiRating label="Content" value={speakerFeedbacks[step - 1].content} onChange={(v) => updateSpeakerFb(step - 1, 'content', v)} />
              <EmojiRating label="Structure" value={speakerFeedbacks[step - 1].structure} onChange={(v) => updateSpeakerFb(step - 1, 'structure', v)} />
              <EmojiRating label="Interaction" value={speakerFeedbacks[step - 1].interaction} onChange={(v) => updateSpeakerFb(step - 1, 'interaction', v)} />
              <EmojiRating label="Confidence" value={speakerFeedbacks[step - 1].confidence} onChange={(v) => updateSpeakerFb(step - 1, 'confidence', v)} />
              <EmojiRating label="Overall" value={speakerFeedbacks[step - 1].overall} onChange={(v) => updateSpeakerFb(step - 1, 'overall', v)} />
            </div>

            <textarea
              placeholder="Comments (optional)"
              rows={3}
              value={speakerFeedbacks[step - 1].comment}
              onChange={(e) => updateSpeakerFb(step - 1, 'comment', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-brand resize-none"
            />

            <Button
              fullWidth
              size="lg"
              onClick={() => {
                const fb = speakerFeedbacks[step - 1];
                if (!fb.content || !fb.structure || !fb.interaction || !fb.confidence || !fb.overall) {
                  setError('Please fill all ratings');
                  return;
                }
                setError('');
                setStep((s) => s + 1);
              }}
            >
              Next
            </Button>
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          </div>
        )}

        {/* Meeting quality step */}
        {step === speakers.length + 1 && (
          <div className="flex flex-col gap-4">
            <div className="bg-brand rounded-2xl px-4 py-3">
              <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Meeting Quality</p>
              <p className="text-white font-black text-lg mt-0.5">Overall Experience</p>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col divide-y divide-gray-50">
              <EmojiRating label="Punctuality" value={meetingRatings.punctual} onChange={(v) => setMeetingRatings((r) => ({ ...r, punctual: v }))} />
              <EmojiRating label="Agenda Flow" value={meetingRatings.agenda} onChange={(v) => setMeetingRatings((r) => ({ ...r, agenda: v }))} />
              <EmojiRating label="Inclusiveness" value={meetingRatings.inclusive} onChange={(v) => setMeetingRatings((r) => ({ ...r, inclusive: v }))} />
              <EmojiRating label="Experience" value={meetingRatings.experience} onChange={(v) => setMeetingRatings((r) => ({ ...r, experience: v }))} />
              <EmojiRating label="Overall" value={meetingRatings.overall} onChange={(v) => setMeetingRatings((r) => ({ ...r, overall: v }))} />
            </div>

            <textarea
              placeholder="Comments (optional)"
              rows={3}
              value={meetingRatings.comment}
              onChange={(e) => setMeetingRatings((r) => ({ ...r, comment: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-brand resize-none"
            />

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

            <Button
              fullWidth
              size="lg"
              loading={submitting}
              onClick={() => {
                const r = meetingRatings;
                if (!r.punctual || !r.agenda || !r.inclusive || !r.experience || !r.overall) {
                  setError('Please fill all ratings');
                  return;
                }
                setError('');
                submit();
              }}
            >
              Submit Feedback
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
