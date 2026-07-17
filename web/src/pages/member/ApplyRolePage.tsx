import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Mic, Clock, Star, BookOpen, Volume2, Users, MessageSquare,
  Info, XCircle, X,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import {
  getMeetingRoster, enrollInRole, enrollAsSpeaker, enrollAsEvaluator, withdrawFromRole,
} from '@/services/meetingService';
import { getMe } from '@/services/memberService';
import { MeetingDetailSkeleton } from '@/components/ui/Skeleton';
import type { MeetingRoleAssignment, MeetingWithRoster, SpeechDuration } from '@/types';
import { SINGLETON_ROLES, ROLE_LABELS, SPEECH_DURATIONS } from '@/types';
import { isPastMeeting } from '@/lib/utils';

const ROLE_ICON: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
  tmod: { icon: Mic, bg: '#dcfce7', color: '#16a34a' },
  timer: { icon: Clock, bg: '#fff7ed', color: '#f97316' },
  general_evaluator: { icon: Star, bg: '#fef9c3', color: '#ca8a04' },
  grammarian: { icon: BookOpen, bg: '#fce7f3', color: '#db2777' },
  ah_counter: { icon: Volume2, bg: '#f0fdf4', color: '#22c55e' },
  table_topics_master: { icon: Users, bg: '#eff6ff', color: '#3b82f6' },
  speaker: { icon: Mic, bg: '#eff6ff', color: '#3b82f6' },
  evaluator: { icon: MessageSquare, bg: '#f5f3ff', color: '#8b5cf6' },
};

interface RoleRowProps {
  roleKey: string;
  label: string;
  assignment?: MeetingRoleAssignment;
  isMe: boolean;
  canApply: boolean;
  isOpen: boolean;
  isPast: boolean;
  acting: boolean;
  onApply: () => void;
  onWithdraw: () => void;
}

function RoleRow({ roleKey, label, assignment, isMe, canApply, isOpen, isPast, acting, onApply, onWithdraw }: RoleRowProps) {
  const cfg = ROLE_ICON[roleKey] ?? { icon: Users, bg: '#f3f4f6', color: '#6b7280' };
  const Icon = cfg.icon;
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="w-[42px] h-[42px] rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: cfg.bg }}>
        <Icon size={18} style={{ color: cfg.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-bold text-gray-900">{label}</p>
        {isMe ? (
          <p className="text-[13px] font-medium text-green-600">You are assigned</p>
        ) : assignment ? (
          <p className="text-[13px] font-medium text-gray-700">{assignment.member_name ?? '—'}</p>
        ) : isPast ? (
          <p className="text-[13px] text-gray-400">Meeting date has passed</p>
        ) : isOpen ? (
          <p className="text-[13px] text-gray-400">Open for applications</p>
        ) : (
          <p className="text-[13px] text-gray-400">Not open yet</p>
        )}
      </div>
      {isMe ? (
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-green-600 bg-green-100 rounded-full px-2.5 py-1">Assigned</span>
          <button onClick={onWithdraw} disabled={acting}><XCircle size={16} className="text-gray-300" /></button>
        </div>
      ) : canApply ? (
        <button onClick={onApply} disabled={acting} className="bg-[#fef2f2] rounded-full px-2.5 py-1 text-xs font-bold text-brand">
          Apply Now
        </button>
      ) : !assignment && isOpen ? (
        <span className="text-xs font-semibold text-gray-400 bg-gray-100 rounded-full px-2.5 py-1">Open</span>
      ) : null}
    </div>
  );
}

export default function MemberApplyRolePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuthStore();

  const [data, setData] = useState<MeetingWithRoster | null>(null);
  const [myMemberId, setMyMemberId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [acting, setActing] = useState(false);
  const [showTMOD, setShowTMOD] = useState(false);
  const [showDuration, setShowDuration] = useState(false);
  const [theme, setTheme] = useState('');

  const load = useCallback(async () => {
    if (!session || !id) return;
    setFetching(true);
    try {
      const [rosterResult, me] = await Promise.all([
        getMeetingRoster(id, session.access_token),
        getMe(session.access_token),
      ]);
      setData(rosterResult);
      setMyMemberId(me.id);
    } catch { /* ignore */ } finally {
      setFetching(false);
    }
  }, [session, id]);

  useEffect(() => { load(); }, [load]);

  if (fetching) {
    return (
      <div className="flex flex-col min-h-full bg-[#f5f5f5]">
        <Header onBack={() => navigate(`/meetings/${id}`)} />
        <MeetingDetailSkeleton />
      </div>
    );
  }
  if (!data) return null;

  const { meeting, roster } = data;
  const isPublished = meeting.status === 'published';
  const isPast = isPastMeeting(meeting.scheduled_at);
  const isOpen = isPublished && !isPast;
  const myAssignment = roster.find((r) => r.member_id === myMemberId);
  const alreadyEnrolled = !!myAssignment;
  const speakers = roster.filter((r) => r.role === 'speaker');
  const evaluators = roster.filter((r) => r.role === 'evaluator');
  const canEnroll = isOpen && !alreadyEnrolled;

  function startEnroll(role: string) {
    if (isPast) { alert('This meeting date has passed. Applications are closed.'); return; }
    if (alreadyEnrolled) { alert('You can only apply for one role per meeting.'); return; }
    if (role === 'tmod') { setTheme(''); setShowTMOD(true); }
    else if (role === 'speaker') setShowDuration(true);
    else confirmEnroll(role);
  }

  async function confirmEnroll(role: string, themeVal?: string) {
    if (!session || !id) return;
    setActing(true);
    try {
      await enrollInRole(id, role as never, session.access_token, themeVal);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to apply');
    } finally { setActing(false); }
  }

  async function handleDuration(duration: SpeechDuration) {
    setShowDuration(false);
    if (!session || !id) return;
    setActing(true);
    try {
      await enrollAsSpeaker(id, duration, session.access_token);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to apply');
    } finally { setActing(false); }
  }

  async function handleApplyEvaluator(speakerMemberId: string, speakerName?: string | null) {
    if (isPast) { alert('This meeting date has passed. Applications are closed.'); return; }
    if (!window.confirm(`Evaluate ${speakerName ?? 'this speaker'}?`)) return;
    if (!session || !id) return;
    setActing(true);
    try {
      await enrollAsEvaluator(id, speakerMemberId, session.access_token);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to apply');
    } finally { setActing(false); }
  }

  async function handleWithdraw() {
    if (!myAssignment || !session || !id) return;
    if (!window.confirm('Withdraw from this role?')) return;
    setActing(true);
    try {
      await withdrawFromRole(id, myAssignment.id, session.access_token);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to withdraw');
    } finally { setActing(false); }
  }

  const openSpeakerSlots = Math.max(0, meeting.max_speakers - speakers.length);

  return (
    <div className="flex flex-col min-h-full bg-[#f5f5f5]">
      <Header onBack={() => navigate(`/meetings/${id}`)} />

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-12 max-w-lg mx-auto w-full">
        {/* Context */}
        <div className="bg-white rounded-xl p-3.5 mb-5 shadow-sm">
          <p className="text-[15px] font-bold text-gray-900 mb-1 truncate">{meeting.title}</p>
          <p className="text-xs text-gray-500">
            {new Date(meeting.scheduled_at).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
            {meeting.venue ? `  ·  ${meeting.venue}` : ''}
          </p>
        </div>

        {/* Role Players */}
        <h2 className="text-sm font-bold text-gray-900 mb-2.5">Role Players</h2>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-5">
          {SINGLETON_ROLES.map((role, i) => {
            const assignment = roster.find((r) => r.role === role);
            const isMe = assignment?.member_id === myMemberId;
            return (
              <div key={role}>
                {i > 0 && <div className="h-px bg-gray-100 mx-4" />}
                <RoleRow
                  roleKey={role}
                  label={ROLE_LABELS[role]}
                  assignment={assignment}
                  isMe={isMe}
                  canApply={canEnroll && !assignment}
                  isOpen={isOpen}
                  isPast={isPast}
                  acting={acting}
                  onApply={() => startEnroll(role)}
                  onWithdraw={handleWithdraw}
                />
              </div>
            );
          })}
        </div>

        {/* Speakers */}
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-bold text-gray-900">Speakers</h2>
          <span className="text-xs font-bold text-gray-500 bg-gray-100 rounded-full px-2.5 py-0.5">{speakers.length} / {meeting.max_speakers}</span>
        </div>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-5">
          {speakers.map((sp, i) => (
            <div key={sp.id}>
              {i > 0 && <div className="h-px bg-gray-100 mx-4" />}
              <RoleRow roleKey="speaker" label="Speaker" assignment={sp} isMe={sp.member_id === myMemberId} canApply={false} isOpen={isOpen} isPast={isPast} acting={acting} onApply={() => {}} onWithdraw={handleWithdraw} />
            </div>
          ))}
          {Array.from({ length: openSpeakerSlots }).map((_, i) => (
            <div key={`open-${i}`}>
              {(speakers.length > 0 || i > 0) && <div className="h-px bg-gray-100 mx-4" />}
              <RoleRow roleKey="speaker" label="Speaker" isMe={false} canApply={canEnroll} isOpen={isOpen} isPast={isPast} acting={acting} onApply={() => startEnroll('speaker')} onWithdraw={() => {}} />
            </div>
          ))}
        </div>

        {/* Evaluators */}
        {speakers.length > 0 && (
          <>
            <h2 className="text-sm font-bold text-gray-900 mb-2.5">Evaluators</h2>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-5">
              {speakers.map((sp, i) => {
                const evaluator = evaluators.find((e) => e.evaluates_member_id === sp.member_id);
                const isMe = evaluator?.member_id === myMemberId;
                return (
                  <div key={`eval-${sp.id}`}>
                    {i > 0 && <div className="h-px bg-gray-100 mx-4" />}
                    <RoleRow
                      roleKey="evaluator"
                      label={`For ${sp.member_name ?? '—'}`}
                      assignment={evaluator}
                      isMe={isMe}
                      canApply={canEnroll && !evaluator}
                      isOpen={isOpen}
                      isPast={isPast}
                      acting={acting}
                      onApply={() => handleApplyEvaluator(sp.member_id, sp.member_name)}
                      onWithdraw={handleWithdraw}
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}

        {isPast ? (
          <div className="flex items-start gap-2.5 bg-gray-100 border border-gray-200 rounded-xl p-3.5">
            <Info size={15} className="text-gray-400 shrink-0 mt-0.5" />
            <p className="text-[13px] text-gray-500 font-medium leading-5">This meeting date has passed. Applications are closed.</p>
          </div>
        ) : isOpen && (
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
            <Info size={15} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[13px] text-amber-800 font-medium leading-5">You can apply for only one role per meeting.</p>
          </div>
        )}
      </div>

      {/* TMOD theme modal */}
      {showTMOD && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/35" onClick={() => setShowTMOD(false)}>
          <div className="w-full bg-white rounded-t-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <button onClick={() => setShowTMOD(false)} className="text-gray-500 text-base w-[60px] text-left">Cancel</button>
              <h3 className="text-base font-semibold text-gray-900">Enroll as TMOD</h3>
              <button onClick={() => { if (theme.trim()) { setShowTMOD(false); confirmEnroll('tmod', theme.trim()); } }} className={`text-base font-bold text-brand w-[70px] text-right ${!theme.trim() ? 'opacity-40' : ''}`}>Confirm</button>
            </div>
            <div className="p-5">
              <p className="text-[13px] font-medium text-gray-700 mb-2">Meeting Theme (required)</p>
              <input autoFocus value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="e.g. Leadership & Growth" className="w-full border border-gray-300 rounded-[10px] px-3.5 py-3 text-base text-gray-900 outline-none focus:border-brand mb-2" />
              <p className="text-xs text-gray-400">As TMOD you set the theme for this meeting.</p>
            </div>
            <div className="h-8" />
          </div>
        </div>
      )}

      {/* Duration modal */}
      {showDuration && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/35" onClick={() => setShowDuration(false)}>
          <div className="w-full bg-white rounded-t-3xl pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <button onClick={() => setShowDuration(false)} className="text-gray-500 text-base w-[60px] text-left">Cancel</button>
              <h3 className="text-base font-semibold text-gray-900">Select Speech Duration</h3>
              <div className="w-[60px]" />
            </div>
            {SPEECH_DURATIONS.map((d) => (
              <button key={d} onClick={() => handleDuration(d)} className="w-full flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                <Clock size={16} className="text-brand" />
                <span className="text-base text-gray-900 font-medium">{d}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-20">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        <button onClick={onBack} className="flex items-center text-brand font-semibold text-base w-[60px]">
          <ChevronLeft size={20} /> Back
        </button>
        <h1 className="text-[17px] font-bold text-gray-900">Apply for Role</h1>
        <div className="w-[60px]" />
      </div>
    </div>
  );
}
