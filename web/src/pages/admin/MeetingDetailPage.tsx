import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Edit2, Trash2, Check, Search, Minus, Plus, Lock, ClipboardList, ArrowRight, QrCode, Users, UserX, BarChart3, ScrollText,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getMeetingRoster, getMeetingStats, updateMeeting, deleteMeeting, updateMeetingStatus, updateVotingStatus } from '@/services/meetingService';
import { getAllMembers } from '@/services/memberService';
import Spinner from '@/components/ui/Spinner';
// TEMP DIAGNOSTIC: pull-to-refresh disabled to isolate an Android scroll bug report.
// import PullToRefresh from '@/components/PullToRefresh';
import { MeetingDetailSkeleton } from '@/components/ui/Skeleton';
import type { VotingStatus, MemberInitials, MeetingStats } from '@/types';
import { STATUS_COLOR, STATUS_LABEL } from '@/types';
import { initials, formatMemberName, formatDateTime, formatDateShort, isPastMeeting } from '@/lib/utils';

const VOTING_LABEL: Record<VotingStatus, string> = { not_started: 'Not started', open: 'Open', closed: 'Closed' };
const VOTING_COLOR: Record<VotingStatus, string> = { not_started: '#9ca3af', open: '#10b981', closed: '#6b7280' };

interface MemberOption { id: string; name: string; initials: MemberInitials }
type ActingAction = 'publish' | 'voting' | 'complete' | 'reopen' | 'save' | 'delete' | null;

export default function AdminMeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuthStore();

  const queryClient = useQueryClient();
  const queryKey = ['meeting-roster', id];
  const { data, isLoading: fetching, refetch: refetchRoster } = useQuery({
    queryKey,
    queryFn: () => getMeetingRoster(id!, session!.access_token),
    enabled: !!session && !!id,
  });
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['meeting-stats', id],
    queryFn: () => getMeetingStats(id!, session!.access_token),
    enabled: !!session && !!id,
  });

  async function handlePullRefresh() {
    await Promise.all([refetchRoster(), refetchStats()]);
  }
  const [actingAction, setActingAction] = useState<ActingAction>(null);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [memberMap, setMemberMap] = useState<Map<string, MemberOption>>(new Map());

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editVenue, setEditVenue] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editPresident, setEditPresident] = useState<MemberOption | null>(null);
  const [editSaa, setEditSaa] = useState<MemberOption | null>(null);
  const [editMaxSpeakers, setEditMaxSpeakers] = useState(3);
  const [pickerMode, setPickerMode] = useState<'president' | 'saa' | null>(null);
  const [memberSearch, setMemberSearch] = useState('');

  useEffect(() => {
    if (!session) return;
    getAllMembers(session.access_token).then((list) => {
      const opts = list.map((m) => ({ id: m.id, name: m.name, initials: m.initials }));
      setMembers(opts);
      setMemberMap(new Map(opts.map((m) => [m.id, m])));
    }).catch(() => {});
  }, [session]);

  function startEdit() {
    if (!data || isPastMeeting(data.meeting.scheduled_at)) return;
    const m = data.meeting;
    const d = new Date(m.scheduled_at);
    setEditTitle(m.title);
    setEditVenue(m.venue ?? '');
    setEditDate(d.toISOString().slice(0, 10));
    setEditTime(d.toTimeString().slice(0, 5));
    setEditMaxSpeakers(m.max_speakers);
    setEditPresident(m.president_id ? memberMap.get(m.president_id) ?? { id: m.president_id, name: '…', initials: 'TM' } : null);
    setEditSaa(m.saa_id ? memberMap.get(m.saa_id) ?? { id: m.saa_id, name: '…', initials: 'TM' } : null);
    setEditing(true);
  }

  function onMemberSelected(m: MemberOption) {
    if (pickerMode === 'president') setEditPresident(m);
    else if (pickerMode === 'saa') setEditSaa(m);
    setPickerMode(null);
  }

  async function handleSave() {
    if (!session || !data || !editTitle.trim()) return;
    setActingAction('save');
    try {
      const scheduled_at = new Date(`${editDate}T${editTime}:00`).toISOString();
      const updated = await updateMeeting(data.meeting.id, {
        title: editTitle.trim(),
        scheduled_at,
        venue: editVenue.trim() || null,
        president_id: editPresident?.id ?? null,
        saa_id: editSaa?.id ?? null,
        max_speakers: editMaxSpeakers,
      }, session.access_token);
      queryClient.setQueryData(queryKey, { ...data, meeting: updated });
      setEditing(false);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setActingAction(null);
    }
  }

  async function handleDelete() {
    if (!session || !data || isPastMeeting(data.meeting.scheduled_at)) return;
    if (!window.confirm('This will permanently delete the meeting and all data.')) return;
    setActingAction('delete');
    try {
      await deleteMeeting(data.meeting.id, session.access_token);
      navigate('/admin/meetings');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
      setActingAction(null);
    }
  }

  async function handlePublish() {
    if (!session || !data || isPastMeeting(data.meeting.scheduled_at)) return;
    if (!window.confirm('Publish this meeting so members can see it?')) return;
    setActingAction('publish');
    try {
      const updated = await updateMeetingStatus(data.meeting.id, 'published', session.access_token);
      queryClient.setQueryData(queryKey, { ...data, meeting: updated });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to publish');
    } finally {
      setActingAction(null);
    }
  }

  async function handleComplete() {
    if (!session || !data || isPastMeeting(data.meeting.scheduled_at)) return;
    if (!window.confirm('Mark this meeting as completed? This closes it out for good.')) return;
    setActingAction('complete');
    try {
      const updated = await updateMeetingStatus(data.meeting.id, 'completed', session.access_token);
      queryClient.setQueryData(queryKey, { ...data, meeting: updated });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to complete meeting');
    } finally {
      setActingAction(null);
    }
  }

  async function handleReopen() {
    if (!session || !data) return;
    if (!window.confirm('Reopen this meeting? It will be marked as Published again.')) return;
    setActingAction('reopen');
    try {
      const updated = await updateMeetingStatus(data.meeting.id, 'published', session.access_token);
      queryClient.setQueryData(queryKey, { ...data, meeting: updated });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to reopen meeting');
    } finally {
      setActingAction(null);
    }
  }

  async function handleVotingToggle() {
    if (!session || !data || isPastMeeting(data.meeting.scheduled_at)) return;
    const next: VotingStatus = data.meeting.voting_status === 'open' ? 'closed' : 'open';
    setActingAction('voting');
    try {
      const updated = await updateVotingStatus(data.meeting.id, next, session.access_token);
      queryClient.setQueryData(queryKey, { ...data, meeting: updated });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to update voting');
    } finally {
      setActingAction(null);
    }
  }

  if (fetching) {
    return (
      <div className="flex flex-col min-h-full bg-gray-50">
        <Header title="Meeting" onBack={() => navigate('/admin/meetings')} />
        <MeetingDetailSkeleton />
      </div>
    );
  }
  if (!data) return null;

  const { meeting, roster } = data;
  const votingIsOpen = meeting.voting_status === 'open';
  const isPast = isPastMeeting(meeting.scheduled_at);
  const canEdit = meeting.status === 'draft' && !isPast;
  const canEditRoles = !isPast;
  const canManage = !isPast;
  const speakers = roster.filter((r) => r.role === 'speaker');
  const acting = actingAction !== null;

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          {editing ? (
            <button onClick={() => setEditing(false)} className="text-brand font-semibold text-base w-[70px] text-left">Cancel</button>
          ) : (
            <button onClick={() => navigate('/admin/meetings')} className="flex items-center text-brand font-semibold text-base w-[70px]">
              <ChevronLeft size={20} /> Back
            </button>
          )}
          <h1 className="text-lg font-bold text-gray-900 truncate">{editing ? 'Edit Meeting' : 'Meeting Details'}</h1>
          <div className="w-[70px] flex justify-end gap-1">
            {editing ? (
              <button onClick={handleSave} disabled={acting || !editTitle.trim()} className="p-2">
                {actingAction === 'save' ? <Spinner size="sm" /> : <Check size={20} className="text-green-500" />}
              </button>
            ) : canEditRoles ? (
              <>
                <button onClick={startEdit} className="p-2"><Edit2 size={18} className="text-gray-700" /></button>
                {canEdit && <button onClick={handleDelete} disabled={acting} className="p-2"><Trash2 size={18} className="text-red-500" /></button>}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* TEMP DIAGNOSTIC: was <PullToRefresh onRefresh={handlePullRefresh} className="..."> — swapped for a plain div to isolate an Android scroll bug report. */}
      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-12 max-w-lg mx-auto w-full">
        {editing ? (
          <>
            {canEdit && (
              <>
                <FieldLabel>Meeting title</FieldLabel>
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className={inputCls} />
                <FieldLabel>Date &amp; Time</FieldLabel>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className={inputClsNoMb} />
                  <input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} className={inputClsNoMb} />
                </div>
                <FieldLabel>Venue</FieldLabel>
                <input value={editVenue} onChange={(e) => setEditVenue(e.target.value)} placeholder="Venue location" className={inputCls} />
                <FieldLabel>Max Speakers</FieldLabel>
                <div className="inline-flex items-center border border-gray-300 rounded-[10px] overflow-hidden bg-white mb-5">
                  <button onClick={() => setEditMaxSpeakers((v) => Math.max(1, v - 1))} className="px-5 py-3.5"><Minus size={18} className="text-gray-700" /></button>
                  <span className="text-lg font-bold text-gray-900 min-w-[40px] text-center">{editMaxSpeakers}</span>
                  <button onClick={() => setEditMaxSpeakers((v) => Math.min(8, v + 1))} className="px-5 py-3.5"><Plus size={18} className="text-gray-700" /></button>
                </div>
              </>
            )}
            <FieldLabel>President</FieldLabel>
            <button onClick={() => { setMemberSearch(''); setPickerMode('president'); }} className={pickerRowCls}>
              <span className={`flex-1 text-left ${editPresident ? 'text-gray-900' : 'text-gray-400'}`}>{editPresident ? editPresident.name : 'Select president…'}</span>
              <ChevronLeft size={16} className="text-gray-400 rotate-180" />
            </button>
            <FieldLabel>SAA</FieldLabel>
            <button onClick={() => { setMemberSearch(''); setPickerMode('saa'); }} className={pickerRowCls}>
              <span className={`flex-1 text-left ${editSaa ? 'text-gray-900' : 'text-gray-400'}`}>{editSaa ? editSaa.name : 'Select SAA…'}</span>
              <ChevronLeft size={16} className="text-gray-400 rotate-180" />
            </button>
          </>
        ) : (
          <>
            <h2 className="text-[22px] font-bold text-gray-900 mb-3">{meeting.title}</h2>

            {/* Badges */}
            <div className="flex gap-2 flex-wrap mb-5">
              <Badge color={STATUS_COLOR[meeting.status]} label={STATUS_LABEL[meeting.status]} />
              <Badge color={VOTING_COLOR[meeting.voting_status]} label={`Voting ${VOTING_LABEL[meeting.voting_status]}`} />
            </div>

            {meeting.status !== 'draft' && stats && <MeetingStatsRow stats={stats} />}

            {/* Read-only banner */}
            {isPast && (
              <div className="flex items-center gap-2.5 bg-gray-100 border border-gray-200 rounded-xl px-3.5 py-3 mb-4">
                <Lock size={15} className="text-gray-400 shrink-0" />
                <p className="text-[13px] text-gray-500 font-medium leading-5">
                  This meeting's date has passed — details are read-only.
                </p>
              </div>
            )}

            {/* Action buttons — compact, side by side */}
            {canManage && meeting.status === 'draft' && (
              <button onClick={handlePublish} disabled={acting} className="w-full rounded-xl py-2.5 mb-5 bg-green-500 text-white text-[13px] font-semibold disabled:opacity-50">
                {actingAction === 'publish' ? 'Working…' : 'Publish Meeting'}
              </button>
            )}
            {canManage && meeting.status === 'published' && (
              <div className="flex gap-2 mb-5">
                <button
                  onClick={handleVotingToggle}
                  disabled={acting}
                  className={`flex-1 rounded-xl py-2.5 text-white text-[13px] font-semibold disabled:opacity-50 ${votingIsOpen ? 'bg-gray-700' : 'bg-brand'}`}
                >
                  {actingAction === 'voting' ? 'Working…' : votingIsOpen ? 'Close Voting' : 'Open Voting'}
                </button>
                <button
                  onClick={handleComplete}
                  disabled={acting}
                  className="flex-1 rounded-xl py-2.5 bg-gray-900 text-white text-[13px] font-semibold disabled:opacity-50"
                >
                  {actingAction === 'complete' ? 'Working…' : 'Complete Meeting'}
                </button>
              </div>
            )}
            {meeting.status === 'completed' && (
              <button
                onClick={handleReopen}
                disabled={acting}
                className="w-full rounded-xl py-2.5 mb-5 border-[1.5px] border-gray-300 text-gray-700 text-[13px] font-semibold disabled:opacity-50"
              >
                {actingAction === 'reopen' ? 'Working…' : 'Reopen Meeting'}
              </button>
            )}

            {/* Details */}
            <SectionLabel>Details</SectionLabel>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
              <DetailRow label="Date & Time" value={formatDateTime(meeting.scheduled_at)} />
              {meeting.venue && (<><Divider /><DetailRow label="Venue" value={meeting.venue} /></>)}
              {meeting.theme && (<><Divider /><DetailRow label="Theme" value={meeting.theme} /></>)}
              {meeting.president_id && (<><Divider /><DetailRow label="President" value={formatMemberName(memberMap.get(meeting.president_id)?.name, memberMap.get(meeting.president_id)?.initials)} /></>)}
              {meeting.saa_id && (<><Divider /><DetailRow label="SAA" value={formatMemberName(memberMap.get(meeting.saa_id)?.name, memberMap.get(meeting.saa_id)?.initials)} /></>)}
              <Divider /><DetailRow label="Max Speakers" value={String(meeting.max_speakers)} />
              <Divider /><DetailRow label="Created" value={formatDateShort(meeting.created_at)} />
            </div>

            {/* Navigation to sub-pages */}
            <NavButton
              icon={<Users size={20} className="text-brand" />}
              label="Roster"
              sub={`${speakers.length}/${meeting.max_speakers} speakers`}
              onClick={() => navigate(`/meetings/${id}/roster`)}
            />
            <NavButton
              icon={<ScrollText size={20} className="text-brand" />}
              label="Agenda"
              onClick={() => navigate(`/meetings/${id}/agenda`)}
            />
            {data.already_checked_in && (
              <NavButton
                icon={<UserX size={20} className="text-brand" />}
                label="Disqualify"
                onClick={() => navigate(`/meetings/${id}/disqualify`)}
              />
            )}
            {meeting.status !== 'draft' && (
              <NavButton
                icon={<ClipboardList size={20} className="text-brand" />}
                label="Feedback Details"
                onClick={() => navigate(`/meetings/${id}/feedback-details`)}
              />
            )}
            {meeting.status !== 'draft' && (
              <NavButton
                icon={<BarChart3 size={20} className="text-brand" />}
                label="Voting Results"
                onClick={() => navigate(`/meetings/${id}/voting-results`)}
              />
            )}
            {canManage && (
              <NavButton
                icon={<QrCode size={20} className="text-brand" />}
                label="QR Codes"
                onClick={() => navigate(`/meetings/${id}/qr-codes`)}
              />
            )}
          </>
        )}
      </div>

      {/* Member picker bottom sheet (edit mode) */}
      {pickerMode && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setPickerMode(null)}>
          <div className="w-full bg-white rounded-t-3xl max-h-[75%] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <button onClick={() => setPickerMode(null)} className="text-gray-500 text-base w-[60px] text-left">Cancel</button>
              <h3 className="text-base font-semibold text-gray-900">{pickerMode === 'president' ? 'Select President' : 'Select SAA'}</h3>
              <div className="w-[60px]" />
            </div>
            <div className="mx-4 my-3 flex items-center gap-2 bg-gray-100 rounded-[10px] px-3 py-2.5">
              <Search size={15} className="text-gray-400" />
              <input autoFocus value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Search members…" className="flex-1 bg-transparent outline-none text-[15px] text-gray-900" />
            </div>
            <div className="overflow-y-auto pb-8">
              {members.filter((m) => m.name.toLowerCase().includes(memberSearch.toLowerCase())).length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400">No members found</div>
              ) : members.filter((m) => m.name.toLowerCase().includes(memberSearch.toLowerCase())).map((m) => (
                <button key={m.id} onClick={() => onMemberSelected(m)} className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50">
                  <div className="w-[38px] h-[38px] rounded-full bg-brand flex items-center justify-center shrink-0">
                    <span className="text-white text-[13px] font-bold">{initials(m.name)}</span>
                  </div>
                  <span className="flex-1 text-left text-[15px] text-gray-900 font-medium">
                    <span className="text-brand">{m.initials}</span> {m.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavButton({ icon, label, sub, onClick }: { icon: React.ReactNode; label: string; sub?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm mb-3">
      <div className="flex items-center gap-3">
        {icon}
        <div className="text-left">
          <span className="text-[15px] font-bold text-gray-900">{label}</span>
          {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
      <ArrowRight size={16} className="text-gray-400" />
    </button>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-20">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        <button onClick={onBack} className="flex items-center text-brand font-semibold text-base w-[70px]">
          <ChevronLeft size={20} /> Back
        </button>
        <h1 className="text-lg font-bold text-gray-900">{title}</h1>
        <div className="w-[70px]" />
      </div>
    </div>
  );
}

function MeetingStatsRow({ stats }: { stats: MeetingStats }) {
  return (
    <div className="bg-white rounded-2xl py-4 shadow-md flex mb-5">
      <StatBox value={String(stats.checked_in_members)} label="Checked In" sub={`of ${stats.total_active_members} members`} />
      <StatBox value={String(stats.guests_checked_in)} label="Guests" sub="registered" />
      <StatBox value={String(stats.voted_count)} label="Voted" sub={`of ${stats.checked_in_members} checked in`} />
      <StatBox value={String(stats.feedback_given_count)} label="Feedback" sub={`of ${stats.checked_in_members} checked in`} />
    </div>
  );
}
function StatBox({ value, label, sub }: { value: string; label: string; sub: string }) {
  return (
    <div className="flex-1 flex flex-col items-center">
      <span className="text-xl font-extrabold text-gray-900">{value}</span>
      <span className="text-[11px] font-semibold text-gray-700 mt-0.5">{label}</span>
      <span className="text-[10px] text-gray-400">{sub}</span>
    </div>
  );
}

function Badge({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: color + '22', color }}>
      <span className="w-[7px] h-[7px] rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5">{children}</p>;
}
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] font-medium text-gray-500 uppercase tracking-wide mb-2">{children}</p>;
}
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3.5 flex items-start justify-between gap-4">
      <span className="text-[13px] text-gray-500 font-medium min-w-[80px]">{label}</span>
      <span className="text-sm text-gray-900 font-medium flex-1 text-right">{value}</span>
    </div>
  );
}
function Divider() {
  return <div className="h-px bg-gray-100 mx-4" />;
}

const inputCls = 'w-full bg-white border border-gray-300 rounded-[10px] px-4 py-3.5 text-base text-gray-900 outline-none focus:border-brand mb-5';
const inputClsNoMb = 'w-full bg-white border border-gray-300 rounded-[10px] px-4 py-3.5 text-base text-gray-900 outline-none focus:border-brand';
const pickerRowCls = 'w-full flex items-center gap-2.5 bg-white border border-gray-300 rounded-[10px] px-4 py-3.5 mb-5 text-[15px] font-medium';
