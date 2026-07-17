import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import {
  ChevronLeft, Edit2, Trash2, Check, X, Plus, Search, Share2, Minus, Lock,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import {
  getMeetingRoster, updateMeeting, deleteMeeting,
  updateMeetingStatus, updateVotingStatus, adminAssignRole, withdrawFromRole,
} from '@/services/meetingService';
import { getAllMembers } from '@/services/memberService';
import Spinner from '@/components/ui/Spinner';
import { MeetingDetailSkeleton } from '@/components/ui/Skeleton';
import type {
  Meeting, MeetingRole, MeetingRoleAssignment, MeetingWithRoster, VotingStatus,
} from '@/types';
import { SINGLETON_ROLES, ROLE_LABELS, SPEECH_DURATIONS, STATUS_COLOR, STATUS_LABEL } from '@/types';
import { initials, formatDateTime, formatDateShort, isPastMeeting } from '@/lib/utils';

const VOTING_LABEL: Record<VotingStatus, string> = { not_started: 'Not started', open: 'Open', closed: 'Closed' };
const VOTING_COLOR: Record<VotingStatus, string> = { not_started: '#9ca3af', open: '#10b981', closed: '#6b7280' };
const GUEST_URL = 'https://amitvadnalwar.github.io/toastmaster/guest-web/';

interface MemberOption { id: string; name: string }

function downloadCanvas(id: string, filename: string) {
  const canvas = document.getElementById(id) as HTMLCanvasElement | null;
  if (!canvas) return;
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = filename;
  a.click();
}
async function shareCanvas(id: string, label: string) {
  const canvas = document.getElementById(id) as HTMLCanvasElement | null;
  if (!canvas) return;
  canvas.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], `${label}.png`, { type: 'image/png' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: `${label} QR Code` }); } catch { /* cancelled */ }
    } else {
      downloadCanvas(id, `${label}.png`);
    }
  });
}

export default function AdminMeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuthStore();

  const [data, setData] = useState<MeetingWithRoster | null>(null);
  const [fetching, setFetching] = useState(true);
  const [acting, setActing] = useState(false);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [memberMap, setMemberMap] = useState<Map<string, string>>(new Map());

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editVenue, setEditVenue] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editPresident, setEditPresident] = useState<MemberOption | null>(null);
  const [editSaa, setEditSaa] = useState<MemberOption | null>(null);
  const [editMaxSpeakers, setEditMaxSpeakers] = useState(3);

  // Assign flow
  const [assignRole, setAssignRole] = useState<MeetingRole | null>(null);
  const [assignSpeakerId, setAssignSpeakerId] = useState<string | null>(null);
  const [pendingMember, setPendingMember] = useState<MemberOption | null>(null);
  const [pickerMode, setPickerMode] = useState<'assign' | 'president' | 'saa' | null>(null);
  const [showDuration, setShowDuration] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  const load = useCallback(async () => {
    if (!session || !id) return;
    setFetching(true);
    try {
      const result = await getMeetingRoster(id, session.access_token);
      setData(result);
    } catch { /* ignore */ } finally {
      setFetching(false);
    }
  }, [session, id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!session) return;
    getAllMembers(session.access_token).then((list) => {
      const opts = list.map((m) => ({ id: m.id, name: m.name }));
      setMembers(opts);
      setMemberMap(new Map(opts.map((m) => [m.id, m.name])));
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
    setEditPresident(m.president_id ? { id: m.president_id, name: memberMap.get(m.president_id) ?? '…' } : null);
    setEditSaa(m.saa_id ? { id: m.saa_id, name: memberMap.get(m.saa_id) ?? '…' } : null);
    setEditing(true);
  }

  async function handleSave() {
    if (!session || !data || !editTitle.trim()) return;
    setActing(true);
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
      setData({ meeting: updated, roster: data.roster });
      setEditing(false);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setActing(false);
    }
  }

  async function handleDelete() {
    if (!session || !data || isPastMeeting(data.meeting.scheduled_at)) return;
    if (!window.confirm('This will permanently delete the meeting and all data.')) return;
    setActing(true);
    try {
      await deleteMeeting(data.meeting.id, session.access_token);
      navigate('/admin/meetings');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
      setActing(false);
    }
  }

  async function handlePublish() {
    if (!session || !data || isPastMeeting(data.meeting.scheduled_at)) return;
    if (!window.confirm('Publish this meeting so members can see it?')) return;
    setActing(true);
    try {
      const updated = await updateMeetingStatus(data.meeting.id, 'published', session.access_token);
      setData({ meeting: updated, roster: data.roster });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to publish');
    } finally {
      setActing(false);
    }
  }

  async function handleVotingToggle() {
    if (!session || !data || isPastMeeting(data.meeting.scheduled_at)) return;
    const next: VotingStatus = data.meeting.voting_status === 'open' ? 'closed' : 'open';
    setActing(true);
    try {
      const updated = await updateVotingStatus(data.meeting.id, next, session.access_token);
      setData({ meeting: updated, roster: data.roster });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to update voting');
    } finally {
      setActing(false);
    }
  }

  function startAssign(role: MeetingRole, speakerMemberId?: string) {
    if (!data || isPastMeeting(data.meeting.scheduled_at)) return;
    setAssignRole(role);
    setAssignSpeakerId(speakerMemberId ?? null);
    setPendingMember(null);
    setMemberSearch('');
    setPickerMode('assign');
  }

  function onMemberSelected(m: MemberOption) {
    if (pickerMode === 'president') { setEditPresident(m); setPickerMode(null); return; }
    if (pickerMode === 'saa') { setEditSaa(m); setPickerMode(null); return; }
    // assign flow
    setPendingMember(m);
    setPickerMode(null);
    if (assignRole === 'speaker') setShowDuration(true);
    else commitAssign(m, null);
  }

  async function commitAssign(member: MemberOption, duration: string | null) {
    if (!session || !data || !assignRole) return;
    setShowDuration(false);
    setActing(true);
    try {
      await adminAssignRole(data.meeting.id, {
        member_id: member.id,
        role: assignRole,
        speech_duration: duration,
        evaluates_member_id: assignSpeakerId,
      }, session.access_token);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to assign role');
    } finally {
      setActing(false);
      setAssignRole(null);
      setPendingMember(null);
    }
  }

  async function handleRemove(roleId: string, label: string) {
    if (!session || !data || isPastMeeting(data.meeting.scheduled_at)) return;
    if (!window.confirm(`Remove ${label} assignment?`)) return;
    setActing(true);
    try {
      await withdrawFromRole(data.meeting.id, roleId, session.access_token);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to remove');
    } finally {
      setActing(false);
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
  const canManage = !isPast;
  const speakers = roster.filter((r) => r.role === 'speaker');
  const evaluators = roster.filter((r) => r.role === 'evaluator');

  const filteredMembers = members.filter((m) => m.name.toLowerCase().includes(memberSearch.toLowerCase()));

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
                {acting ? <Spinner size="sm" /> : <Check size={20} className="text-green-500" />}
              </button>
            ) : canEdit ? (
              <>
                <button onClick={startEdit} className="p-2"><Edit2 size={18} className="text-gray-700" /></button>
                <button onClick={handleDelete} disabled={acting} className="p-2"><Trash2 size={18} className="text-red-500" /></button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-12 max-w-lg mx-auto w-full">
        {editing ? (
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
            <FieldLabel>Max Speakers</FieldLabel>
            <div className="inline-flex items-center border border-gray-300 rounded-[10px] overflow-hidden bg-white">
              <button onClick={() => setEditMaxSpeakers((v) => Math.max(1, v - 1))} className="px-5 py-3.5"><Minus size={18} className="text-gray-700" /></button>
              <span className="text-lg font-bold text-gray-900 min-w-[40px] text-center">{editMaxSpeakers}</span>
              <button onClick={() => setEditMaxSpeakers((v) => Math.min(8, v + 1))} className="px-5 py-3.5"><Plus size={18} className="text-gray-700" /></button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-[22px] font-bold text-gray-900 mb-3">{meeting.title}</h2>

            {/* Badges */}
            <div className="flex gap-2 flex-wrap mb-5">
              <Badge color={STATUS_COLOR[meeting.status]} label={STATUS_LABEL[meeting.status]} />
              <Badge color={VOTING_COLOR[meeting.voting_status]} label={`Voting ${VOTING_LABEL[meeting.voting_status]}`} />
            </div>

            {/* Read-only banner */}
            {isPast && (
              <div className="flex items-center gap-2.5 bg-gray-100 border border-gray-200 rounded-xl px-3.5 py-3 mb-4">
                <Lock size={15} className="text-gray-400 shrink-0" />
                <p className="text-[13px] text-gray-500 font-medium leading-5">
                  This meeting's date has passed — details are read-only.
                </p>
              </div>
            )}

            {/* Action buttons */}
            {canManage && meeting.status === 'draft' && (
              <button onClick={handlePublish} disabled={acting} className="w-full rounded-xl py-3.5 mb-2.5 bg-green-500 text-white font-semibold disabled:opacity-50">
                {acting ? 'Working…' : 'Publish Meeting'}
              </button>
            )}
            {canManage && meeting.status === 'published' && (
              <button
                onClick={handleVotingToggle}
                disabled={acting}
                className={`w-full rounded-xl py-3.5 mb-2.5 text-white font-semibold disabled:opacity-50 ${votingIsOpen ? 'bg-gray-700' : 'bg-brand'}`}
              >
                {acting ? 'Working…' : votingIsOpen ? 'Close Voting' : 'Open Voting'}
              </button>
            )}

            {/* Details */}
            <SectionLabel>Details</SectionLabel>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
              <DetailRow label="Date & Time" value={formatDateTime(meeting.scheduled_at)} />
              {meeting.venue && (<><Divider /><DetailRow label="Venue" value={meeting.venue} /></>)}
              {meeting.theme && (<><Divider /><DetailRow label="Theme" value={meeting.theme} /></>)}
              {meeting.president_id && (<><Divider /><DetailRow label="President" value={memberMap.get(meeting.president_id) ?? '—'} /></>)}
              {meeting.saa_id && (<><Divider /><DetailRow label="SAA" value={memberMap.get(meeting.saa_id) ?? '—'} /></>)}
              <Divider /><DetailRow label="Max Speakers" value={String(meeting.max_speakers)} />
              <Divider /><DetailRow label="Created" value={formatDateShort(meeting.created_at)} />
            </div>

            {/* Roster: Role Players */}
            <SectionLabel>Role Players</SectionLabel>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
              {SINGLETON_ROLES.map((role, i) => {
                const a = roster.find((r) => r.role === role);
                return (
                  <div key={role}>
                    {i > 0 && <Divider />}
                    <div className="flex items-center gap-2 px-4 py-3">
                      <span className="text-[13px] text-gray-500 font-medium flex-1">{ROLE_LABELS[role]}</span>
                      {a ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-900 font-semibold truncate max-w-[140px]">{a.member_name ?? memberMap.get(a.member_id) ?? '—'}</span>
                          {canManage && (
                            <button onClick={() => handleRemove(a.id, ROLE_LABELS[role])} disabled={acting} className="w-7 h-7 rounded-full bg-[#fef2f2] flex items-center justify-center"><X size={14} className="text-red-500" /></button>
                          )}
                        </div>
                      ) : canManage ? (
                        <AssignButton onClick={() => startAssign(role)} disabled={acting} />
                      ) : (
                        <span className="text-xs font-medium text-gray-300">Open</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Speakers */}
            <SectionLabel>Speakers ({speakers.length}/{meeting.max_speakers})</SectionLabel>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
              {speakers.map((s, i) => (
                <div key={s.id}>
                  {i > 0 && <Divider />}
                  <div className="flex items-center gap-2 px-4 py-3">
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 font-semibold">{s.member_name ?? memberMap.get(s.member_id) ?? '—'}</p>
                      {s.speech_duration && <p className="text-[11px] text-gray-400 mt-0.5">{s.speech_duration}</p>}
                    </div>
                    {canManage && (
                      <button onClick={() => handleRemove(s.id, 'Speaker')} disabled={acting} className="w-7 h-7 rounded-full bg-[#fef2f2] flex items-center justify-center"><X size={14} className="text-red-500" /></button>
                    )}
                  </div>
                </div>
              ))}
              {canManage && speakers.length < meeting.max_speakers && (
                <div>
                  {speakers.length > 0 && <Divider />}
                  <button onClick={() => startAssign('speaker')} disabled={acting} className="w-full flex items-center justify-center gap-1 px-4 py-3 text-brand text-[13px] font-semibold">
                    <Plus size={13} /> Add Speaker
                  </button>
                </div>
              )}
              {!canManage && speakers.length === 0 && (
                <div className="px-4 py-3 text-center text-[13px] text-gray-400">No speakers were assigned</div>
              )}
            </div>

            {/* Evaluators */}
            {speakers.length > 0 && (
              <>
                <SectionLabel>Evaluators</SectionLabel>
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
                  {speakers.map((s, i) => {
                    const ev = evaluators.find((e) => e.evaluates_member_id === s.member_id);
                    const speakerName = s.member_name ?? memberMap.get(s.member_id) ?? '—';
                    return (
                      <div key={s.id}>
                        {i > 0 && <Divider />}
                        <div className="flex items-center gap-2 px-4 py-3">
                          <div className="flex-1">
                            <p className="text-[11px] text-gray-400 mb-0.5">Evaluator for {speakerName}</p>
                            <p className={`text-sm font-semibold ${ev ? 'text-gray-900' : 'text-gray-400'}`}>{ev ? (ev.member_name ?? memberMap.get(ev.member_id) ?? '—') : 'Unassigned'}</p>
                          </div>
                          {ev ? (
                            canManage && (
                              <button onClick={() => handleRemove(ev.id, 'Evaluator')} disabled={acting} className="w-7 h-7 rounded-full bg-[#fef2f2] flex items-center justify-center"><X size={14} className="text-red-500" /></button>
                            )
                          ) : canManage ? (
                            <AssignButton onClick={() => startAssign('evaluator', s.member_id)} disabled={acting} />
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* QR codes — meeting-day only */}
            {canManage && (
              <>
                <SectionLabel>Member QR Code</SectionLabel>
                <QrCard
                  hint="Members scan this to join the meeting (requires app)"
                  canvasId="member-qr"
                  value={`toastmasters://join?meeting_id=${meeting.id}`}
                  meetingId={meeting.id}
                  label="Member"
                />

                <div className="mt-6" />
                <SectionLabel>Guest QR Code</SectionLabel>
                <QrCard
                  hint="Guests scan this to register (no app needed)"
                  canvasId="guest-qr"
                  value={`${GUEST_URL}?meeting_id=${meeting.id}`}
                  meetingId={meeting.id}
                  label="Guest"
                />
              </>
            )}
          </>
        )}
      </div>

      {/* Member picker bottom sheet */}
      {pickerMode && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setPickerMode(null)}>
          <div className="w-full bg-white rounded-t-3xl max-h-[75%] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <button onClick={() => setPickerMode(null)} className="text-gray-500 text-base w-[60px] text-left">Cancel</button>
              <h3 className="text-base font-semibold text-gray-900">
                {pickerMode === 'president' ? 'Select President' : pickerMode === 'saa' ? 'Select SAA' : assignRole ? `Assign ${ROLE_LABELS[assignRole]}` : 'Select Member'}
              </h3>
              <div className="w-[60px]" />
            </div>
            <div className="mx-4 my-3 flex items-center gap-2 bg-gray-100 rounded-[10px] px-3 py-2.5">
              <Search size={15} className="text-gray-400" />
              <input autoFocus value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Search members…" className="flex-1 bg-transparent outline-none text-[15px] text-gray-900" />
            </div>
            <div className="overflow-y-auto pb-8">
              {filteredMembers.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400">No members found</div>
              ) : filteredMembers.map((m) => (
                <button key={m.id} onClick={() => onMemberSelected(m)} className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50">
                  <div className="w-[38px] h-[38px] rounded-full bg-brand flex items-center justify-center shrink-0">
                    <span className="text-white text-[13px] font-bold">{initials(m.name)}</span>
                  </div>
                  <span className="flex-1 text-left text-[15px] text-gray-900 font-medium">{m.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Duration picker */}
      {showDuration && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => { setShowDuration(false); setAssignRole(null); }}>
          <div className="w-full bg-white rounded-t-3xl pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <button onClick={() => { setShowDuration(false); setAssignRole(null); }} className="text-gray-500 text-base w-[60px] text-left">Cancel</button>
              <h3 className="text-base font-semibold text-gray-900">Speech Duration</h3>
              <div className="w-[60px]" />
            </div>
            {SPEECH_DURATIONS.map((d) => (
              <button key={d} onClick={() => pendingMember && commitAssign(pendingMember, d)} className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <span className="text-base text-gray-900 font-medium">{d}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
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

function QrCard({ hint, canvasId, value, meetingId, label }: { hint: string; canvasId: string; value: string; meetingId: string; label: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center">
      <p className="text-[13px] text-gray-500 mb-5 text-center">{hint}</p>
      <div className="p-4 bg-white rounded-xl border border-gray-200">
        <QRCodeCanvas id={canvasId} value={value} size={200} level="M" />
      </div>
      <p className="text-[10px] text-gray-300 mt-4 text-center break-all">{meetingId}</p>
      <div className="flex gap-2 mt-4 w-full">
        <button onClick={() => downloadCanvas(canvasId, `${label}-qr.png`)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] bg-gray-50 text-gray-600 text-sm font-semibold">
          Save
        </button>
        <button onClick={() => shareCanvas(canvasId, label)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] bg-[#fef2f2] border border-red-200 text-brand text-sm font-semibold">
          <Share2 size={16} /> Share
        </button>
      </div>
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

function AssignButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="flex items-center gap-1 bg-[#fef2f2] rounded-lg px-2.5 py-1.5 text-brand text-[13px] font-semibold">
      <Plus size={13} /> Assign
    </button>
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
