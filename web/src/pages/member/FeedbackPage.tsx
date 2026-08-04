import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CheckCircle, MicOff, Frown, Meh, Smile, Star, Clock, Pencil, Check } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { showAlert } from '@/store/alertStore';
import { getMeetingById, getMeetingRoster, getMyFeedback, submitFeedback } from '@/services/meetingService';
import { submitVote, submitRating, getMyVotingState } from '@/services/voteService';
import { Skeleton } from '@/components/ui/Skeleton';
import type {
  Meeting,
  MeetingRoleAssignment,
  SpeakerFeedback,
  SpeakerFeedbackPayload,
  MyVotingState,
  VoteCategory,
} from '@/types';

interface SpeakerRow {
  assignment: MeetingRoleAssignment;
  content: number;
  structure: number;
  confidence: number;
  interaction: number;
  comment: string;
}

type Step = 'feedback' | 'voting' | 'overall';
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

const RATING_LABELS: Record<number, string> = { 1: 'Need Improvement', 2: 'Ok', 3: 'Super' };
const RATING_ICONS: Record<number, typeof Frown> = { 1: Frown, 2: Meh, 3: Smile };
const FEEDBACK_FIELDS: { key: 'content_rating' | 'structure_rating' | 'confidence_rating' | 'interaction_rating'; label: string }[] = [
  { key: 'content_rating', label: 'Content' },
  { key: 'structure_rating', label: 'Structure' },
  { key: 'confidence_rating', label: 'Confidence' },
  { key: 'interaction_rating', label: 'Interact' },
];

const VOTE_CATEGORIES: { key: VoteCategory; label: string; roles: MeetingRoleAssignment['role'][] }[] = [
  { key: 'best_speaker', label: 'Best Speaker', roles: ['speaker'] },
  { key: 'best_evaluator', label: 'Best Evaluator', roles: ['evaluator'] },
  { key: 'best_mrp', label: 'Best MRP', roles: ['tmod', 'general_evaluator', 'table_topics_master'] },
  { key: 'best_arp', label: 'Best ARP', roles: ['timer', 'ah_counter', 'grammarian'] },
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

function RatingBadge({ value }: { value: number }) {
  const Icon = RATING_ICONS[value] ?? Meh;
  return (
    <span className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">
      <Icon size={12} className="text-gray-500" />
      <span className="text-[11px] font-semibold text-gray-600">{RATING_LABELS[value] ?? '—'}</span>
    </span>
  );
}

function StepTabs({ step, feedbackDone, onSelect }: { step: Step; feedbackDone: boolean; onSelect: (s: Step) => void }) {
  const steps: { key: Step; label: string; num: number }[] = [
    { key: 'feedback', label: 'Feedback', num: 1 },
    { key: 'voting', label: 'Voting', num: 2 },
    { key: 'overall', label: 'Overall', num: 3 },
  ];
  return (
    <div className="flex items-center mb-6">
      {steps.map((s, i) => {
        const locked = s.key !== 'feedback' && !feedbackDone;
        const active = step === s.key;
        const done = s.key === 'feedback' && feedbackDone;
        return (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            <button
              type="button"
              disabled={locked}
              onClick={() => !locked && onSelect(s.key)}
              className="flex flex-col items-center gap-1 disabled:cursor-not-allowed"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  active ? 'bg-brand text-white' : done ? 'bg-green-100 text-green-600' : locked ? 'bg-gray-100 text-gray-300' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {done && !active ? <Check size={16} /> : s.num}
              </div>
              <span className={`text-[11px] font-semibold ${active ? 'text-brand' : locked ? 'text-gray-300' : 'text-gray-500'}`}>{s.label}</span>
            </button>
            {i < steps.length - 1 && <div className="flex-1 h-0.5 bg-gray-200 mx-1 -mt-4" />}
          </div>
        );
      })}
    </div>
  );
}

const STEP_ORDER: Step[] = ['feedback', 'voting', 'overall'];

function StepNav({ step, canGoNext, onPrev, onNext }: { step: Step; canGoNext: boolean; onPrev: () => void; onNext: () => void }) {
  const idx = STEP_ORDER.indexOf(step);
  const showPrev = idx > 0;
  const showNext = idx < STEP_ORDER.length - 1;
  if (!showPrev && !showNext) return null;
  return (
    <div className="flex items-center justify-between mt-5 mb-2">
      {showPrev ? (
        <button onClick={onPrev} className="flex items-center gap-1 text-gray-500 text-[13px] font-semibold px-3 py-2">
          <ChevronLeft size={15} /> Previous
        </button>
      ) : <div />}
      {showNext && (
        <button
          onClick={onNext}
          disabled={!canGoNext}
          className="flex items-center gap-1 text-brand text-[13px] font-semibold px-3 py-2 disabled:text-gray-300"
        >
          Next <ChevronRight size={15} />
        </button>
      )}
    </div>
  );
}

export default function MemberFeedbackPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuthStore();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [speakers, setSpeakers] = useState<SpeakerRow[]>([]);
  const [myFeedback, setMyFeedback] = useState<SpeakerFeedback[]>([]);
  const [editingFeedback, setEditingFeedback] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [step, setStep] = useState<Step>('feedback');

  const [roster, setRoster] = useState<MeetingRoleAssignment[]>([]);
  const [votingState, setVotingState] = useState<MyVotingState>({ votes: [], rating: null });
  const [selections, setSelections] = useState<Partial<Record<VoteCategory, string>>>({});
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

      const myEmail = session.user?.email;
      const feedbackMap = new Map<string, SpeakerFeedback>(feedback.map((fb) => [fb.speaker_member_id, fb]));
      const rows: SpeakerRow[] = rosterData.roster
        .filter((r) => r.role === 'speaker' && r.member_email !== myEmail && !r.disqualified)
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
      setMyFeedback(feedback);
      setEditingFeedback(feedback.length === 0 && rows.length > 0);

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

  // Poll the meeting's voting_status so this page reflects admin opening/closing
  // voting live, without the member needing to reload or navigate away and back.
  useEffect(() => {
    if (!session || !id) return;
    const interval = setInterval(() => {
      getMeetingById(id, session.access_token).then(setMeeting).catch(() => {});
    }, 8000);
    return () => clearInterval(interval);
  }, [session, id]);

  const feedbackDone = speakers.length === 0 || myFeedback.length > 0;

  const votedMap = useMemo(
    () => new Map(votingState.votes.map((v) => [v.category, v.nominee_id])),
    [votingState],
  );
  const nomineesByCategory = useMemo(() => {
    const map: Partial<Record<VoteCategory, MeetingRoleAssignment[]>> = {};
    for (const cat of VOTE_CATEGORIES) map[cat.key] = roster.filter((r) => cat.roles.includes(r.role) && !r.disqualified);
    return map;
  }, [roster]);
  const votingOpen = meeting?.voting_status === 'open';
  const allCategoriesVoted = VOTE_CATEGORIES.every((c) => votedMap.has(c.key) || (nomineesByCategory[c.key]?.length ?? 0) === 0);

  function updateRating(index: number, key: CategoryKey, value: 1 | 2 | 3) {
    setSpeakers((prev) => prev.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  }
  function updateComment(index: number, comment: string) {
    setSpeakers((prev) => prev.map((r, i) => (i === index ? { ...r, comment } : r)));
  }

  async function handleSubmitFeedback() {
    const unrated = speakers.some(
      (r) => r.content === 0 || r.structure === 0 || r.confidence === 0 || r.interaction === 0,
    );
    if (unrated) {
      await showAlert('Please rate all categories for every speaker before submitting.');
      return;
    }
    if (!session || !id) return;
    setSubmittingFeedback(true);
    try {
      const payload: SpeakerFeedbackPayload[] = speakers.map((r) => ({
        speaker_member_id: r.assignment.member_id,
        content_rating: r.content,
        structure_rating: r.structure,
        confidence_rating: r.confidence,
        interaction_rating: r.interaction,
        comment: r.comment.trim() || null,
      }));
      const result = await submitFeedback(id, payload, session.access_token);
      setMyFeedback(result);
      setEditingFeedback(false);
      await showAlert('Thank you for your feedback!');
    } catch (e: unknown) {
      await showAlert(e instanceof Error ? e.message : 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmittingFeedback(false);
    }
  }

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
        await submitVote({ meeting_id: id, category: cat.key, nominee_id: selections[cat.key]! }, session.access_token);
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
      await submitRating({ meeting_id: id, rating: ratingValue, comment: ratingComment.trim() || null }, session.access_token);
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
          <Skeleton className="w-full h-10 rounded-xl mb-4" />
          <Skeleton className="w-full h-40 rounded-2xl" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 pb-8 max-w-lg mx-auto w-full">
          <h2 className="text-2xl font-black text-gray-900 mb-1.5">{meeting?.title}</h2>
          <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3.5 py-2 mb-5">
            <CheckCircle size={14} className="text-green-600" />
            <span className="text-[13px] font-semibold text-green-700">Checked in</span>
          </div>

          <StepTabs step={step} feedbackDone={feedbackDone} onSelect={setStep} />

          {/* ── Step 1: Speaker feedback ── */}
          {step === 'feedback' && (
            speakers.length === 0 ? (
              <div className="flex flex-col items-center gap-3 pt-16">
                <MicOff size={36} className="text-gray-300" />
                <p className="text-sm text-gray-400">No speakers to rate for this meeting.</p>
              </div>
            ) : editingFeedback ? (
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
                <button
                  onClick={handleSubmitFeedback}
                  disabled={submittingFeedback}
                  className="w-full bg-brand text-white rounded-xl py-[15px] text-base font-bold disabled:opacity-60"
                >
                  {submittingFeedback ? 'Submitting…' : 'Submit Feedback'}
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[13px] text-gray-500">Your submitted feedback</p>
                  <button
                    onClick={() => setEditingFeedback(true)}
                    className="flex items-center gap-1 text-brand text-[13px] font-semibold"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                </div>
                {myFeedback.map((fb) => (
                  <div key={fb.id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
                    <p className="text-[15px] font-bold text-gray-900 mb-2">{fb.speaker_name ?? '—'}</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {FEEDBACK_FIELDS.map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-1">
                          <span className="text-[11px] text-gray-400">{label}:</span>
                          <RatingBadge value={fb[key]} />
                        </div>
                      ))}
                    </div>
                    {fb.comment && <p className="text-[13px] text-gray-600 italic">"{fb.comment}"</p>}
                  </div>
                ))}
              </>
            )
          )}

          {/* ── Step 2: Voting ── */}
          {step === 'voting' && (
            !votingOpen ? (
              <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center text-center gap-2">
                <Clock size={28} className="text-gray-300" />
                <p className="text-[15px] font-semibold text-gray-700">
                  {meeting?.voting_status === 'closed' ? 'Voting has closed' : 'Voting is yet to open'}
                </p>
                <p className="text-[13px] text-gray-400">Voting can be started by your club admin.</p>
              </div>
            ) : (
              <div>
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

                {!allCategoriesVoted && (
                  <button
                    onClick={handleSubmitVotes}
                    disabled={submittingVotes}
                    className="w-full bg-brand text-white rounded-xl py-[15px] text-base font-bold disabled:opacity-60"
                  >
                    {submittingVotes ? 'Submitting…' : 'Submit Votes'}
                  </button>
                )}
              </div>
            )
          )}

          {/* ── Step 3: Overall meeting feedback ── */}
          {step === 'overall' && (
            <>
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
            </>
          )}

          <StepNav
            step={step}
            canGoNext={step === 'feedback' ? feedbackDone : true}
            onPrev={() => setStep(STEP_ORDER[STEP_ORDER.indexOf(step) - 1])}
            onNext={() => setStep(STEP_ORDER[STEP_ORDER.indexOf(step) + 1])}
          />
        </div>
      )}
    </div>
  );
}
