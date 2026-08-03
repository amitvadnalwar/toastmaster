import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle, Star, Frown, Meh, Smile, Clock } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { showAlert } from '@/store/alertStore';
import { getMeetingRoster, getMyFeedback } from '@/services/meetingService';
import { submitVote, submitRating, getMyVotingState } from '@/services/voteService';
import { Skeleton } from '@/components/ui/Skeleton';
import type {
  Meeting,
  MeetingRoleAssignment,
  SpeakerFeedback,
  MyVotingState,
  VoteCategory,
} from '@/types';

const RATING_LABELS: Record<number, string> = { 1: 'Need Improvement', 2: 'Ok', 3: 'Super' };
const RATING_ICONS: Record<number, typeof Frown> = { 1: Frown, 2: Meh, 3: Smile };
const FEEDBACK_CATEGORIES: { key: 'content_rating' | 'structure_rating' | 'confidence_rating' | 'interaction_rating'; label: string }[] = [
  { key: 'content_rating', label: 'Content' },
  { key: 'structure_rating', label: 'Structure' },
  { key: 'confidence_rating', label: 'Confidence' },
  { key: 'interaction_rating', label: 'Interact' },
];

const VOTE_CATEGORIES: { key: VoteCategory; label: string; role: MeetingRoleAssignment['role'] }[] = [
  { key: 'best_speaker', label: 'Best Speaker', role: 'speaker' },
  { key: 'best_evaluator', label: 'Best Evaluator', role: 'evaluator' },
  { key: 'best_mrp', label: 'Best MRP', role: 'tmod' },
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

export default function MemberMeetingWrapUpPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuthStore();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [roster, setRoster] = useState<MeetingRoleAssignment[]>([]);
  const [myFeedback, setMyFeedback] = useState<SpeakerFeedback[]>([]);
  const [votingState, setVotingState] = useState<MyVotingState>({ votes: [], rating: null });
  const [selections, setSelections] = useState<Partial<Record<VoteCategory, string>>>({});
  const [fetching, setFetching] = useState(true);
  const [submittingVotes, setSubmittingVotes] = useState(false);

  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [exiting, setExiting] = useState(false);

  const load = useCallback(async () => {
    if (!session || !id) return;
    setFetching(true);
    try {
      const [rosterData, feedback, voting] = await Promise.all([
        getMeetingRoster(id, session.access_token),
        getMyFeedback(id, session.access_token).catch(() => [] as SpeakerFeedback[]),
        getMyVotingState(id, session.access_token).catch(() => ({ votes: [], rating: null }) as MyVotingState),
      ]);
      setMeeting(rosterData.meeting);
      setRoster(rosterData.roster);
      setMyFeedback(feedback);
      setVotingState(voting);
      if (voting.rating) {
        setRatingValue(voting.rating.rating);
        setRatingComment(voting.rating.comment ?? '');
      }
    } catch { /* ignore */ } finally {
      setFetching(false);
    }
  }, [session, id]);

  useEffect(() => { load(); }, [load]);

  const votedMap = useMemo(
    () => new Map(votingState.votes.map((v) => [v.category, v.nominee_id])),
    [votingState],
  );

  const nomineesByCategory = useMemo(() => {
    const map: Partial<Record<VoteCategory, MeetingRoleAssignment[]>> = {};
    for (const cat of VOTE_CATEGORIES) {
      map[cat.key] = roster.filter((r) => r.role === cat.role);
    }
    return map;
  }, [roster]);

  const votingOpen = meeting?.voting_status === 'open';
  const allCategoriesVoted = VOTE_CATEGORIES.every((c) => votedMap.has(c.key) || (nomineesByCategory[c.key]?.length ?? 0) === 0);

  async function handleSubmitVotes() {
    if (!session || !id) return;
    const toSubmit = VOTE_CATEGORIES.filter((c) => !votedMap.has(c.key) && selections[c.key]);
    if (toSubmit.length === 0) {
      await showAlert('Pick a nominee in at least one category before submitting.');
      return;
    }
    setSubmittingVotes(true);
    try {
      for (const cat of toSubmit) {
        await submitVote(
          { meeting_id: id, category: cat.key, nominee_id: selections[cat.key]! },
          session.access_token,
        );
      }
      const fresh = await getMyVotingState(id, session.access_token);
      setVotingState(fresh);
      await showAlert('Your votes have been recorded. Thank you!');
    } catch (e: unknown) {
      await showAlert(e instanceof Error ? e.message : 'Failed to submit votes. Please try again.');
    } finally {
      setSubmittingVotes(false);
    }
  }

  async function handleExitMeeting() {
    if (!session || !id) return;
    if (!votingState.rating && ratingValue === 0) {
      await showAlert('Please rate the meeting before exiting.');
      return;
    }
    if (votingState.rating) {
      navigate('/home', { replace: true });
      return;
    }
    setExiting(true);
    try {
      await submitRating(
        { meeting_id: id, rating: ratingValue, comment: ratingComment.trim() || null },
        session.access_token,
      );
      await showAlert('Thanks for your feedback — see you at the next meeting!');
      navigate('/home', { replace: true });
    } catch (e: unknown) {
      await showAlert(e instanceof Error ? e.message : 'Failed to submit your rating. Please try again.');
    } finally {
      setExiting(false);
    }
  }

  return (
    <div className="flex flex-col min-h-full bg-[#f5f5f5]">
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate(`/meetings/${id}`)} className="flex items-center text-brand font-semibold text-base w-[60px]">
            <ChevronLeft size={20} /> Back
          </button>
          <h1 className="text-[17px] font-bold text-gray-900">Meeting Wrap-Up</h1>
          <div className="w-[60px]" />
        </div>
      </div>

      {fetching ? (
        <div className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full">
          <Skeleton className="w-52 h-8 rounded-full mb-4" />
          <Skeleton className="w-full h-40 rounded-2xl mb-4" />
          <Skeleton className="w-full h-40 rounded-2xl" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 pb-8 max-w-lg mx-auto w-full">
          <h2 className="text-2xl font-black text-gray-900 mb-1.5">{meeting?.title}</h2>
          <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3.5 py-2 mb-6">
            <CheckCircle size={14} className="text-green-600" />
            <span className="text-[13px] font-semibold text-green-700">Checked in</span>
          </div>

          {/* ── Section 1: Your speaker feedback recap ── */}
          <SectionLabel>Your Speaker Feedback</SectionLabel>
          {myFeedback.length === 0 ? (
            <p className="text-sm text-gray-400 mb-6">No feedback submitted.</p>
          ) : (
            <div className="mb-6">
              {myFeedback.map((fb) => (
                <div key={fb.id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
                  <p className="text-[15px] font-bold text-gray-900 mb-2">{fb.speaker_name ?? '—'}</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {FEEDBACK_CATEGORIES.map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-1">
                        <span className="text-[11px] text-gray-400">{label}:</span>
                        <RatingBadge value={fb[key]} />
                      </div>
                    ))}
                  </div>
                  {fb.comment && <p className="text-[13px] text-gray-600 italic">"{fb.comment}"</p>}
                </div>
              ))}
            </div>
          )}

          {/* ── Section 2: Voting ── */}
          <SectionLabel>Voting</SectionLabel>
          {!votingOpen ? (
            <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm flex flex-col items-center text-center gap-2">
              <Clock size={28} className="text-gray-300" />
              <p className="text-[15px] font-semibold text-gray-700">
                {meeting?.voting_status === 'closed' ? 'Voting has closed' : 'Voting is yet to open'}
              </p>
              <p className="text-[13px] text-gray-400">Voting can be started by your club admin.</p>
            </div>
          ) : (
            <div className="mb-2">
              {VOTE_CATEGORIES.map((cat) => {
                const nominees = nomineesByCategory[cat.key] ?? [];
                const votedNomineeId = votedMap.get(cat.key);
                return (
                  <div key={cat.key} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
                    <p className="text-[14px] font-bold text-gray-900 mb-3">{cat.label}</p>
                    {nominees.length === 0 ? (
                      <p className="text-[13px] text-gray-400">No nominees available.</p>
                    ) : votedNomineeId ? (
                      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                        <CheckCircle size={16} className="text-green-600" />
                        <span className="text-[14px] font-semibold text-green-700">
                          {nominees.find((n) => n.member_id === votedNomineeId)?.member_name ?? 'Voted'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {nominees.map((n) => {
                          const selected = selections[cat.key] === n.member_id;
                          return (
                            <button
                              key={n.id}
                              type="button"
                              onClick={() => setSelections((prev) => ({ ...prev, [cat.key]: n.member_id }))}
                              className={`text-left px-3.5 py-2.5 rounded-xl border text-[14px] font-semibold transition-colors ${
                                selected ? 'border-brand bg-brand/5 text-brand' : 'border-gray-200 text-gray-700'
                              }`}
                            >
                              {n.member_name ?? '—'}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                <p className="text-[14px] font-bold text-gray-900 mb-1">Best ARP</p>
                <p className="text-[13px] text-gray-400">Categories coming soon.</p>
              </div>

              {!allCategoriesVoted && (
                <button
                  onClick={handleSubmitVotes}
                  disabled={submittingVotes}
                  className="w-full bg-brand text-white rounded-xl py-[15px] text-base font-bold disabled:opacity-60 mb-6"
                >
                  {submittingVotes ? 'Submitting…' : 'Submit Votes'}
                </button>
              )}
            </div>
          )}

          {/* ── Section 3: Overall meeting feedback ── */}
          <SectionLabel>Overall Meeting Feedback</SectionLabel>
          <div className="bg-white rounded-2xl p-[18px] mb-4 shadow-sm">
            {votingState.rating ? (
              <div className="flex items-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} size={26} className={n <= votingState.rating!.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} />
                ))}
              </div>
            ) : (
              <div className="flex gap-2.5 mb-3.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setRatingValue(n)} className="p-1 -m-1">
                    <Star size={30} className={n <= ratingValue ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} />
                  </button>
                ))}
              </div>
            )}
            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Any feedback about the meeting overall? (optional)"
              rows={3}
              readOnly={!!votingState.rating}
              className="w-full border border-gray-200 rounded-[10px] p-3 text-sm text-gray-900 bg-[#fafafa] outline-none focus:border-brand resize-none"
            />
          </div>

          <button
            onClick={handleExitMeeting}
            disabled={exiting}
            className="w-full bg-brand text-white rounded-xl py-[15px] text-base font-bold disabled:opacity-60"
          >
            {exiting ? 'Submitting…' : 'Exit Meeting'}
          </button>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] font-bold text-gray-500 uppercase tracking-wide mb-2.5">{children}</p>;
}
