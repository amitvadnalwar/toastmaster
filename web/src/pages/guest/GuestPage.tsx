import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { QrCode } from 'lucide-react';
import { ApiError } from '@/lib/apiClient';
import { CLUB_NAME } from '@/lib/constants';
import Button from '@/components/ui/Button';
import RegisterForm from './components/RegisterForm';
import SpeakerCard, { EMPTY_SPEAKER_RATING, type SpeakerRatingState } from './components/SpeakerCard';
import MeetingQualityCard, {
  EMPTY_MEETING_RATING,
  type MeetingRatingState,
} from './components/MeetingQualityCard';
import NomineeSection from './components/NomineeSection';
import QrScanner from './components/QrScanner';
import {
  getMeetingNominees,
  getMeetingSpeakers,
  registerGuest,
  submitMeetingFeedback,
  submitSpeakerFeedback,
  submitVotes,
} from '@/services/guestService';
import type { GuestNomineeCategory, GuestSource, GuestSpeaker } from '@/types/guest';

type Step = 'scan-prompt' | 'scanning' | 'register' | 'speakers' | 'meeting' | 'votes' | 'thanks' | 'invalid';

const PROGRESS_STEPS: { step: Step; label: string }[] = [
  { step: 'speakers', label: 'Speakers' },
  { step: 'meeting', label: 'Meeting' },
  { step: 'votes', label: 'Votes' },
];

export default function GuestPage() {
  const [searchParams] = useSearchParams();
  const [meetingId, setMeetingId] = useState<string | null>(searchParams.get('meeting_id'));

  const [step, setStep] = useState<Step>(meetingId ? 'register' : 'scan-prompt');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [guestId, setGuestId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');

  const [speakers, setSpeakers] = useState<GuestSpeaker[]>([]);
  const [nomineeCategories, setNomineeCategories] = useState<GuestNomineeCategory[]>([]);
  const [speakerRatings, setSpeakerRatings] = useState<Record<string, SpeakerRatingState>>({});
  const [meetingRating, setMeetingRating] = useState<MeetingRatingState>(EMPTY_MEETING_RATING);
  const [votes, setVotes] = useState<Record<string, string>>({});

  function handleScan(scannedMeetingId: string) {
    setMeetingId(scannedMeetingId);
    setStep('register');
  }

  async function handleRegister(name: string, phone: string | null, source: GuestSource) {
    if (!meetingId) return;
    setError('');
    setLoading(true);
    try {
      const result = await registerGuest({ meeting_id: meetingId, name, phone, source });
      setGuestId(result.id);
      setGuestName(result.name);

      const [sp, nm] = await Promise.all([
        getMeetingSpeakers(meetingId).catch(() => []),
        getMeetingNominees(meetingId).catch(() => []),
      ]);
      setSpeakers(sp);
      setSpeakerRatings(Object.fromEntries(sp.map((s) => [s.member_id, EMPTY_SPEAKER_RATING])));
      setNomineeCategories(nm);
      setStep('speakers');
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setStep('invalid');
      } else {
        setError('Could not connect. Please check your internet and try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  function updateSpeakerRating(memberId: string, field: keyof SpeakerRatingState, value: number | string) {
    setSpeakerRatings((prev) => ({ ...prev, [memberId]: { ...prev[memberId], [field]: value } }));
  }

  async function handleSpeakersNext() {
    setError('');
    if (!speakers.length) {
      setStep('meeting');
      return;
    }

    for (const s of speakers) {
      const r = speakerRatings[s.member_id];
      if (!r.content || !r.structure || !r.interaction || !r.confidence) {
        setError(`Please rate all categories for ${s.name}`);
        return;
      }
    }

    setLoading(true);
    try {
      await submitSpeakerFeedback(
        guestId!,
        meetingId!,
        speakers.map((s) => {
          const r = speakerRatings[s.member_id];
          return {
            speaker_member_id: s.member_id,
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
        meeting_id: meetingId!,
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
        meetingId!,
        nomineeCategories.map((cat) => ({ category: cat.category, nominee_id: votes[cat.category] })),
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

        {step === 'scan-prompt' && (
          <div className="text-center py-2">
            <div className="w-16 h-16 rounded-full bg-brand-light flex items-center justify-center mx-auto mb-5">
              <QrCode size={30} className="text-brand" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1.5">Check In to the Meeting</h1>
            <p className="text-[15px] text-gray-500 leading-relaxed mb-6">
              Please scan the QR code at the venue to check in to today&apos;s meeting.
            </p>
            <Button fullWidth size="lg" onClick={() => setStep('scanning')}>
              Scan QR Code
            </Button>
          </div>
        )}

        {step === 'scanning' && (
          <QrScanner onScan={handleScan} onCancel={() => setStep('scan-prompt')} />
        )}

        {step === 'register' && (
          <>
            {error && <ErrorBanner message={error} />}
            <RegisterForm loading={loading} onSubmit={handleRegister} />
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
                <br />
                Tap Next to continue.
              </p>
            ) : (
              speakers.map((s, i) => (
                <SpeakerCard
                  key={s.member_id}
                  speaker={s}
                  index={i}
                  rating={speakerRatings[s.member_id] ?? EMPTY_SPEAKER_RATING}
                  onChange={(field, value) => updateSpeakerRating(s.member_id, field, value)}
                />
              ))
            )}
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
                  onSelect={(memberId) => setVotes((prev) => ({ ...prev, [cat.category]: memberId }))}
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

        {step === 'invalid' && (
          <div className="text-center py-2">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
              <svg viewBox="0 0 24 24" className="w-8 h-8 stroke-red-700 fill-none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2.5">Invalid link</h2>
            <p className="text-[15px] text-gray-500 leading-relaxed">
              This QR code is not valid or the meeting has ended.
              <br />
              Please scan the QR code at the venue.
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
