import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, KeyRound, CalendarX2, UserPlus } from 'lucide-react';
import { ApiError } from '@/lib/apiClient';
import { CLUB_NAME } from '@/lib/constants';
import { formatDate, formatTime } from '@/lib/utils';
import Button from '@/components/ui/Button';
import RegisterForm from './components/RegisterForm';
import SpeakerCard, { EMPTY_SPEAKER_RATING, type SpeakerRatingState } from './components/SpeakerCard';
import MeetingQualityCard, {
  EMPTY_MEETING_RATING,
  type MeetingRatingState,
} from './components/MeetingQualityCard';
import NomineeSection from './components/NomineeSection';
import {
  addSpeakerForGuest,
  getGuestProgress,
  getGuestTodaysMeeting,
  getMeetingNominees,
  getMeetingSpeakers,
  registerGuest,
  submitMeetingFeedback,
  submitSpeakerFeedback,
  submitVotes,
} from '@/services/guestService';
import { getStoredGuest, storeGuest } from './guestStorage';
import type { Meeting } from '@/types';
import type { GuestNomineeCategory, GuestProgress, GuestSpeaker } from '@/types/guest';

type Step =
  | 'loading'
  | 'no-meeting'
  | 'error'
  | 'details'
  | 'checkin'
  | 'speakers'
  | 'meeting'
  | 'votes'
  | 'thanks';

const PROGRESS_STEPS: { step: Step; label: string }[] = [
  { step: 'speakers', label: 'Speakers' },
  { step: 'meeting', label: 'Meeting' },
  { step: 'votes', label: 'Votes' },
];

export default function GuestPage() {
  const [step, setStep] = useState<Step>('loading');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [meeting, setMeeting] = useState<Meeting | null>(null);

  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestId, setGuestId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');

  const [speakers, setSpeakers] = useState<GuestSpeaker[]>([]);
  const [nomineeCategories, setNomineeCategories] = useState<GuestNomineeCategory[]>([]);
  const [speakerRatings, setSpeakerRatings] = useState<Record<string, SpeakerRatingState>>({});
  const [meetingRating, setMeetingRating] = useState<MeetingRatingState>(EMPTY_MEETING_RATING);
  const [votes, setVotes] = useState<Record<string, string>>({});

  const [addSpeakerOpen, setAddSpeakerOpen] = useState(false);
  const [newSpeakerName, setNewSpeakerName] = useState('');
  const [addingSpeaker, setAddingSpeaker] = useState(false);

  function ratingFromProgress(progress: GuestProgress | null, roleId: string): SpeakerRatingState {
    const fb = progress?.speaker_feedback.find((f) => f.speaker_role_id === roleId);
    if (!fb) return EMPTY_SPEAKER_RATING;
    return {
      content: fb.content_rating,
      structure: fb.structure_rating,
      confidence: fb.confidence_rating,
      interaction: fb.interaction_rating,
      comment: fb.comment ?? '',
    };
  }

  // Loads the meeting's speakers/nominees and, if this guest has already
  // submitted feedback for this meeting, prefills it so nothing is lost.
  async function loadGuestContent(mId: string, gId: string) {
    const [sp, nm, progress] = await Promise.all([
      getMeetingSpeakers(mId).catch(() => []),
      getMeetingNominees(mId).catch(() => []),
      getGuestProgress(gId, mId).catch(() => null),
    ]);
    setSpeakers(sp);
    setSpeakerRatings(Object.fromEntries(sp.map((s) => [s.role_id, ratingFromProgress(progress, s.role_id)])));
    setNomineeCategories(nm);
    if (progress?.meeting_feedback) {
      const mf = progress.meeting_feedback;
      setMeetingRating({
        punctual: mf.punctual_rating,
        agenda: mf.agenda_rating,
        inclusive: mf.inclusive_rating,
        experience: mf.experience_rating,
        overall: mf.overall_rating,
        comment: mf.comment ?? '',
      });
    }
    if (progress?.votes.length) {
      setVotes(Object.fromEntries(progress.votes.map((v) => [v.category, v.nominee_role_id])));
    }
  }

  // Same interstitial members see after logging in: find today's meeting (if
  // any), and — on this device — resume a guest who's already checked in
  // straight into their feedback instead of asking them to register again.
  async function loadTodaysMeeting() {
    setStep('loading');
    setError('');
    try {
      const todays = await getGuestTodaysMeeting();
      setMeeting(todays);

      const stored = getStoredGuest(todays.id);
      if (stored) {
        setGuestId(stored.id);
        setGuestName(stored.name);
        try {
          await loadGuestContent(todays.id, stored.id);
          setStep('speakers');
          return;
        } catch {
          // Fall through to a fresh check-in if resuming their feedback fails.
        }
      }
      setStep('details');
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setStep('no-meeting');
      } else {
        setStep('error');
      }
    }
  }

  useEffect(() => {
    loadTodaysMeeting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDetailsSubmit(email: string, name: string, phone: string) {
    setGuestEmail(email);
    setGuestPhone(phone);
    setGuestName(name);
    setStep('checkin');
  }

  async function handleCheckIn() {
    if (!meeting) return;
    setError('');
    setLoading(true);
    try {
      const result = await registerGuest({
        meeting_id: meeting.id,
        name: guestName,
        email: guestEmail || null,
        phone: guestPhone || null,
      });
      setGuestId(result.id);
      setGuestName(result.name);
      storeGuest(meeting.id, { id: result.id, name: result.name });

      await loadGuestContent(meeting.id, result.id);
      setStep('speakers');
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setStep('no-meeting');
      } else {
        setError('Could not connect. Please check your internet and try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  function updateSpeakerRating(roleId: string, field: keyof SpeakerRatingState, value: number | string) {
    setSpeakerRatings((prev) => ({ ...prev, [roleId]: { ...prev[roleId], [field]: value } }));
  }

  async function handleAddSpeaker() {
    const name = newSpeakerName.trim();
    if (!name || !meeting) return;
    setError('');
    setAddingSpeaker(true);
    try {
      const sp = await addSpeakerForGuest(meeting.id, name);
      setSpeakers((prev) => [...prev, sp]);
      setSpeakerRatings((prev) => ({ ...prev, [sp.role_id]: EMPTY_SPEAKER_RATING }));
      setAddSpeakerOpen(false);
      setNewSpeakerName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add speaker. Please try again.');
    } finally {
      setAddingSpeaker(false);
    }
  }

  async function handleSpeakersNext() {
    setError('');
    if (!speakers.length) {
      setStep('meeting');
      return;
    }

    for (const s of speakers) {
      const r = speakerRatings[s.role_id];
      if (!r.content || !r.structure || !r.interaction || !r.confidence) {
        setError(`Please rate all categories for ${s.name}`);
        return;
      }
    }

    setLoading(true);
    try {
      await submitSpeakerFeedback(
        guestId!,
        meeting!.id,
        speakers.map((s) => {
          const r = speakerRatings[s.role_id];
          return {
            speaker_role_id: s.role_id,
            content_rating: r.content!,
            structure_rating: r.structure!,
            interaction_rating: r.interaction!,
            confidence_rating: r.confidence!,
            comment: r.comment.trim() || null,
          };
        }),
      );
      setStep('meeting');
    } catch {
      setError('Could not save. Please check your internet and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleMeetingNext() {
    setError('');
    const r = meetingRating;
    if (!r.punctual || !r.agenda || !r.inclusive || !r.experience) {
      setError('Please rate all categories.');
      return;
    }
    if (!r.overall) {
      setError('Please select an overall meeting quality rating.');
      return;
    }

    setLoading(true);
    try {
      await submitMeetingFeedback(guestId!, {
        meeting_id: meeting!.id,
        punctual_rating: r.punctual,
        agenda_rating: r.agenda,
        inclusive_rating: r.inclusive,
        experience_rating: r.experience,
        overall_rating: r.overall,
        comment: r.comment.trim() || null,
      });
      setStep(nomineeCategories.length ? 'votes' : 'thanks');
    } catch {
      setError('Could not save. Please check your internet and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVotesSubmit() {
    setError('');
    if (!nomineeCategories.length) {
      setStep('thanks');
      return;
    }
    for (const cat of nomineeCategories) {
      if (!votes[cat.category]) {
        setError(`Please vote for ${cat.label}`);
        return;
      }
    }

    setLoading(true);
    try {
      await submitVotes(
        guestId!,
        meeting!.id,
        nomineeCategories.map((cat) => ({ category: cat.category, nominee_role_id: votes[cat.category] })),
      );
      setStep('thanks');
    } catch {
      setError('Could not save. Please check your internet and try again.');
    } finally {
      setLoading(false);
    }
  }

  const progressIndex = PROGRESS_STEPS.findIndex((p) => p.step === step);

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center px-4 py-6">
      <div className="w-full max-w-md bg-white rounded-[20px] shadow-lg p-6 sm:p-8">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-[9px] bg-brand flex items-center justify-center shrink-0">
            <span className="text-white text-base font-black">T</span>
          </div>
          <span className="text-[15px] font-bold text-brand">{CLUB_NAME}</span>
        </div>

        {progressIndex >= 0 && (
          <div className="mb-7">
            <div className="flex items-center mb-2">
              {PROGRESS_STEPS.map((p, i) => (
                <div key={p.step} className="flex items-center flex-1 last:flex-none">
                  <div
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                      i < progressIndex
                        ? 'bg-brand border-brand text-white'
                        : i === progressIndex
                          ? 'bg-brand border-brand text-white ring-4 ring-brand/15'
                          : 'bg-white border-gray-300 text-gray-500'
                    }`}
                  >
                    {i + 1}
                  </div>
                  {i < PROGRESS_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 ${i < progressIndex ? 'bg-brand' : 'bg-gray-300'}`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between px-0.5">
              {PROGRESS_STEPS.map((p) => (
                <span key={p.step} className="text-[11px] text-gray-500 flex-1 text-center first:text-left last:text-right">
                  {p.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {step === 'loading' && (
          <div className="flex flex-col items-center gap-4 py-16">
            <span className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Checking today&apos;s meeting…</p>
          </div>
        )}

        {step === 'no-meeting' && (
          <div className="text-center py-2">
            <div className="w-16 h-16 rounded-full bg-brand-light flex items-center justify-center mx-auto mb-5">
              <CalendarX2 size={28} className="text-brand" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2.5">No meeting is scheduled</h2>
            <p className="text-[15px] text-gray-500 leading-relaxed">
              There isn&apos;t a meeting scheduled for today.
              <br />
              Please check back on the next meeting day.
            </p>
          </div>
        )}

        {step === 'error' && (
          <div className="text-center py-2">
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
              <p className="text-sm text-red-600 font-medium">Could not connect. Please check your internet and try again.</p>
            </div>
            <Button fullWidth size="lg" onClick={loadTodaysMeeting}>
              Retry
            </Button>
          </div>
        )}

        {step === 'details' && (
          <>
            {error && <ErrorBanner message={error} />}
            <RegisterForm loading={loading} onSubmit={handleDetailsSubmit} />
          </>
        )}

        {step === 'checkin' && meeting && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-1.5">Today&apos;s Meeting</h1>
            <p className="text-[15px] text-gray-500 leading-relaxed mb-6">
              Check in to join and share your feedback.
            </p>
            {error && <ErrorBanner message={error} />}

            <div className="bg-gray-50 rounded-2xl overflow-hidden mb-6 border border-gray-100">
              <div className="p-5">
                <h2 className="text-lg font-bold text-gray-900 mb-4">{meeting.title}</h2>
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
              </div>
            </div>

            <Button
              fullWidth
              size="lg"
              loading={loading}
              onClick={handleCheckIn}
              className="flex items-center justify-center gap-2"
            >
              <KeyRound size={18} /> Check In
            </Button>
          </>
        )}

        {step === 'speakers' && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-1.5">Rate the Speakers</h1>
            <p className="text-[15px] text-gray-500 leading-relaxed mb-6">
              Share your thoughts on each speaker.
            </p>
            {error && <ErrorBanner message={error} />}
            {speakers.length === 0 ? (
              <p className="text-center text-[15px] text-gray-500 leading-relaxed py-6">
                No speakers have been enrolled for this meeting yet.
              </p>
            ) : (
              speakers.map((s, i) => (
                <SpeakerCard
                  key={s.role_id}
                  speaker={s}
                  index={i}
                  rating={speakerRatings[s.role_id] ?? EMPTY_SPEAKER_RATING}
                  onChange={(field, value) => updateSpeakerRating(s.role_id, field, value)}
                />
              ))
            )}
            <button
              type="button"
              onClick={() => setAddSpeakerOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 border border-dashed border-gray-300 rounded-xl py-3 text-brand text-sm font-semibold mb-4"
            >
              <UserPlus size={15} /> Add a Speaker
            </button>
            <Button fullWidth size="lg" loading={loading} onClick={handleSpeakersNext} className="mt-2">
              Next: Meeting Quality
            </Button>
          </>
        )}

        {step === 'meeting' && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-1.5">Rate the Meeting</h1>
            <p className="text-[15px] text-gray-500 leading-relaxed mb-6">How was today&apos;s overall session?</p>
            {error && <ErrorBanner message={error} />}
            <MeetingQualityCard
              rating={meetingRating}
              onChange={(field, value) => setMeetingRating((prev) => ({ ...prev, [field]: value }))}
            />
            <Button fullWidth size="lg" loading={loading} onClick={handleMeetingNext} className="mt-2">
              Next: Vote for Awards
            </Button>
          </>
        )}

        {step === 'votes' && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-1.5">Cast Your Vote</h1>
            <p className="text-[15px] text-gray-500 leading-relaxed mb-6">
              Choose your favourite for each award.
            </p>
            {error && <ErrorBanner message={error} />}
            {nomineeCategories.length === 0 ? (
              <p className="text-center text-[15px] text-gray-500 leading-relaxed py-6">
                No nominees available for this meeting.
              </p>
            ) : (
              nomineeCategories.map((cat) => (
                <NomineeSection
                  key={cat.category}
                  category={cat}
                  selectedNomineeId={votes[cat.category] ?? null}
                  onSelect={(roleId) => setVotes((prev) => ({ ...prev, [cat.category]: roleId }))}
                />
              ))
            )}
            <Button fullWidth size="lg" loading={loading} onClick={handleVotesSubmit} className="mt-2">
              Submit Feedback
            </Button>
          </>
        )}

        {step === 'thanks' && (
          <div className="text-center py-2">
            <div className="w-16 h-16 rounded-full bg-brand-light flex items-center justify-center mx-auto mb-5">
              <svg viewBox="0 0 24 24" className="w-8 h-8 stroke-brand fill-none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2.5">Thank you, {guestName}!</h2>
            <p className="text-[15px] text-gray-500 leading-relaxed">
              Your feedback helps make our meetings better.
              <br />
              Enjoy the session!
            </p>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-8">
          Are you a club member?{' '}
          <Link to="/login" className="text-brand font-semibold">
            Sign in
          </Link>
        </p>
      </div>

      {/* Add Speaker bottom sheet — free-text only, guests can't browse the member list */}
      {addSpeakerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/40"
          onClick={() => { setAddSpeakerOpen(false); setNewSpeakerName(''); }}
        >
          <div className="w-full max-w-md mx-auto bg-white rounded-t-3xl pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <button
                onClick={() => { setAddSpeakerOpen(false); setNewSpeakerName(''); }}
                className="text-gray-500 text-base w-[60px] text-left"
              >
                Cancel
              </button>
              <h3 className="text-base font-semibold text-gray-900">Add Speaker</h3>
              <div className="w-[60px] flex justify-end">
                <button
                  onClick={handleAddSpeaker}
                  disabled={!newSpeakerName.trim() || addingSpeaker}
                  className="text-brand font-semibold text-base disabled:opacity-30"
                >
                  Add
                </button>
              </div>
            </div>
            <div className="px-5 pt-4">
              <p className="text-[13px] text-gray-500 font-medium mb-2">Enter the speaker&apos;s name as announced at the meeting.</p>
              <input
                autoFocus
                value={newSpeakerName}
                onChange={(e) => setNewSpeakerName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddSpeaker(); }}
                placeholder="Speaker's name"
                className="w-full bg-white border border-gray-300 rounded-[10px] px-4 py-3.5 text-base text-gray-900 outline-none focus:border-brand"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
      <p className="text-sm text-red-600 font-medium">{message}</p>
    </div>
  );
}
