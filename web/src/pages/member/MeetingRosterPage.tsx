import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, X, Plus, Minus, Check, Edit2, Search, MessageSquare, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getMeetingRoster, updateMeeting, adminAssignRole, withdrawFromRole } from '@/services/meetingService';
import { getClubMembers } from '@/services/memberService';
import { MeetingDetailSkeleton } from '@/components/ui/Skeleton';
import type { MeetingRole, MeetingWithRoster, MemberInitials } from '@/types';
import { SINGLETON_ROLES, ROLE_LABELS } from '@/types';
import { initials, formatMemberName, isPastMeeting, isMeetingLocked } from '@/lib/utils';

interface MemberOption { id: string; name: string; initials: MemberInitials }

// TODO: re-enable once the role_title backend/DB support is deployed
const SHOW_ADDITIONAL_ROLE_PLAYERS = false;

export default function MeetingRosterPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session, appRole } = useAuthStore();
  const myEmail = session?.user?.email ?? '';
  const isAdmin = appRole === 'admin' || appRole === 'super_admin';

  const [data, setData] = useState<MeetingWithRoster | null>(null);
  const [fetching, setFetching] = useState(true);
  const [acting, setActing] = useState(false);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [memberMap, setMemberMap] = useState<Map<string, MemberOption>>(new Map());

  const [assignRole, setAssignRole] = useState<MeetingRole | null>(null);
  const [assignSpeakerId, setAssignSpeakerId] = useState<string | null>(null);
  const [pendingMember, setPendingMember] = useState<MemberOption | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showDuration, setShowDuration] = useState(false);
  const [durationMin, setDurationMin] = useState('');
  const [durationMax, setDurationMax] = useState('');
  const [durationError, setDurationError] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [showRoleTitleModal, setShowRoleTitleModal] = useState(false);
  const [roleTitleInput, setRoleTitleInput] = useState('');
  const [pendingRoleTitle, setPendingRoleTitle] = useState<string | null>(null);
  const [editingMaxSpeakers, setEditingMaxSpeakers] = useState(false);
  const [maxSpeakersValue, setMaxSpeakersValue] = useState(3);
  const [savingMaxSpeakers, setSavingMaxSpeakers] = useState(false);

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
    if (!session || !isAdmin) return;
    getClubMembers(session.access_token).then((list) => {
      const opts = list.map((m) => ({ id: m.id, name: m.name, initials: m.initials }));
      setMembers(opts);
      setMemberMap(new Map(opts.map((m) => [m.id, m])));
    }).catch(() => {});
  }, [session, isAdmin]);

  function startAssign(role: MeetingRole, speakerMemberId?: string) {
    if (!data || isMeetingLocked(data.meeting)) return;
    setAssignRole(role);
    setAssignSpeakerId(speakerMemberId ?? null);
    setPendingMember(null);
    setMemberSearch('');
    setPickerOpen(true);
  }

  function startAddSupportingRole() {
    if (!data || isMeetingLocked(data.meeting)) return;
    setRoleTitleInput('');
    setShowRoleTitleModal(true);
  }

  function submitRoleTitle() {
    const title = roleTitleInput.trim();
    if (!title) return;
    setPendingRoleTitle(title);
    setShowRoleTitleModal(false);
    startAssign('supporting_role');
  }

  function onMemberSelected(m: MemberOption) {
    setPendingMember(m);
    setPickerOpen(false);
    if (assignRole === 'speaker') {
      setDurationMin('');
      setDurationMax('');
      setDurationError('');
      setShowDuration(true);
    } else {
      commitAssign(m, null);
    }
  }

  function confirmDuration() {
    if (!durationMin.trim() || !durationMax.trim()) {
      setDurationError('Enter both minimum and maximum minutes.');
      return;
    }
    const min = Number(durationMin);
    const max = Number(durationMax);
    if (!Number.isInteger(min) || !Number.isInteger(max)) {
      setDurationError('Minutes must be whole numbers.');
      return;
    }
    if (min < 1 || max > 60) {
      setDurationError('Minutes must be between 1 and 60.');
      return;
    }
    if (max < min) {
      setDurationError('Max must be greater than or equal to min.');
      return;
    }
    if (!pendingMember) return;
    commitAssign(pendingMember, `${min}-${max} mins`);
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
        role_title: assignRole === 'supporting_role' ? pendingRoleTitle : null,
      }, session.access_token);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to assign role');
    } finally {
      setActing(false);
      setAssignRole(null);
      setPendingMember(null);
      setPendingRoleTitle(null);
    }
  }

  function startEditMaxSpeakers() {
    if (!data || isMeetingLocked(data.meeting)) return;
    setMaxSpeakersValue(data.meeting.max_speakers);
    setEditingMaxSpeakers(true);
  }

  async function handleSaveMaxSpeakers() {
    if (!session || !data) return;
    setSavingMaxSpeakers(true);
    try {
      const m = data.meeting;
      await updateMeeting(m.id, {
        title: m.title,
        scheduled_at: m.scheduled_at,
        venue: m.venue ?? null,
        president_id: m.president_id ?? null,
        saa_id: m.saa_id ?? null,
        max_speakers: maxSpeakersValue,
      }, session.access_token);
      setEditingMaxSpeakers(false);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to update max speakers');
    } finally {
      setSavingMaxSpeakers(false);
    }
  }

  async function handleRemove(roleId: string, label: string) {
    if (!session || !data || isMeetingLocked(data.meeting)) return;
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
        <Header onBack={() => navigate(-1)} />
        <MeetingDetailSkeleton />
      </div>
    );
  }
  if (!data) return null;

  const { meeting, roster } = data;
  // Admin management stays available all day (or until the meeting is
  // completed) — self-enrollment still cuts off at the exact start time.
  const canManage = isAdmin && !isMeetingLocked(meeting);
  const canApply = !isAdmin && meeting.status === 'published' && !isPastMeeting(meeting.scheduled_at);
  const speakers = roster.filter((r) => r.role === 'speaker');
  const evaluators = roster.filter((r) => r.role === 'evaluator');
  const tableTopicsSpeakers = roster.filter((r) => r.role === 'table_topics_speaker');
  const supportingRoles = roster.filter((r) => r.role === 'supporting_role');
  const filteredMembers = members.filter((m) => m.name.toLowerCase().includes(memberSearch.toLowerCase()));

  function nameFor(memberId: string, name?: string | null, memberInitials?: string | null): string {
    const fallback = memberMap.get(memberId);
    return formatMemberName(name ?? fallback?.name, memberInitials ?? fallback?.initials);
  }

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <Header onBack={() => navigate(-1)} />

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-28 max-w-lg mx-auto w-full">
        <h2 className="text-lg font-bold text-gray-900 mb-5">{meeting.title}</h2>

        {/* Role Players */}
        <SectionLabel>Role Players</SectionLabel>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-5">
          {SINGLETON_ROLES.map((role, i) => {
            const a = roster.find((r) => r.role === role);
            return (
              <div key={role}>
                {i > 0 && <Divider />}
                {isAdmin ? (
                  <div className="flex items-center gap-2 px-4 py-3">
                    <span className="text-[13px] text-gray-500 font-medium flex-1">{ROLE_LABELS[role]}</span>
                    {a ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-900 font-semibold truncate max-w-[140px]">{nameFor(a.member_id, a.member_name, a.member_initials)}</span>
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
                ) : (
                  <RosterRow role={role} name={a?.member_name} memberInitials={a?.member_initials} isMe={a?.member_email === myEmail} />
                )}
              </div>
            );
          })}
        </div>

        {/* Additional Role Players */}
        {SHOW_ADDITIONAL_ROLE_PLAYERS && (isAdmin || supportingRoles.length > 0) && (
          <>
            <SectionLabel>Additional Role Players</SectionLabel>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-5">
              {supportingRoles.length === 0 && !isAdmin && (
                <div className="py-5 text-center text-[13px] text-gray-400">No additional role players yet</div>
              )}
              {supportingRoles.map((s, i) => (
                <div key={s.id}>
                  {i > 0 && <Divider />}
                  {isAdmin ? (
                    <div className="flex items-center gap-2 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-gray-500 font-medium">{s.role_title ?? 'Role Player'}</p>
                        <p className="text-sm text-gray-900 font-semibold">{nameFor(s.member_id, s.member_name, s.member_initials)}</p>
                      </div>
                      {canManage && (
                        <button onClick={() => handleRemove(s.id, s.role_title ?? 'Role Player')} disabled={acting} className="w-7 h-7 rounded-full bg-[#fef2f2] flex items-center justify-center"><X size={14} className="text-red-500" /></button>
                      )}
                    </div>
                  ) : (
                    <RosterRow role={s.role_title ?? 'Role Player'} name={s.member_name} memberInitials={s.member_initials} isMe={s.member_email === myEmail} />
                  )}
                </div>
              ))}
              {isAdmin && canManage && (
                <div>
                  {supportingRoles.length > 0 && <Divider />}
                  <button onClick={startAddSupportingRole} disabled={acting} className="w-full flex items-center justify-center gap-1 px-4 py-3 text-brand text-[13px] font-semibold">
                    <Plus size={13} /> Add Role Player
                  </button>
                </div>
              )}
              {isAdmin && !canManage && supportingRoles.length === 0 && (
                <div className="px-4 py-3 text-center text-[13px] text-gray-400">No additional role players were assigned</div>
              )}
            </div>
          </>
        )}

        {/* Speakers */}
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Speakers ({speakers.length}/{meeting.max_speakers})</p>
          {canManage && !editingMaxSpeakers && (
            <button onClick={startEditMaxSpeakers} className="p-1 -m-1 text-gray-400">
              <Edit2 size={14} />
            </button>
          )}
        </div>
        {editingMaxSpeakers && (
          <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm px-4 py-3 mb-3">
            <span className="text-[13px] font-semibold text-gray-700">Max Speakers</span>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center border border-gray-300 rounded-[10px] overflow-hidden bg-white">
                <button onClick={() => setMaxSpeakersValue((v) => Math.max(speakers.length, v - 1))} className="px-3 py-2"><Minus size={16} className="text-gray-700" /></button>
                <span className="text-base font-bold text-gray-900 min-w-[28px] text-center">{maxSpeakersValue}</span>
                <button onClick={() => setMaxSpeakersValue((v) => Math.min(8, v + 1))} className="px-3 py-2"><Plus size={16} className="text-gray-700" /></button>
              </div>
              <button onClick={() => setEditingMaxSpeakers(false)} disabled={savingMaxSpeakers} className="p-1.5"><X size={16} className="text-gray-400" /></button>
              <button onClick={handleSaveMaxSpeakers} disabled={savingMaxSpeakers} className="p-1.5"><Check size={18} className="text-green-500" /></button>
            </div>
          </div>
        )}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-5">
          {speakers.length === 0 && !isAdmin && (
            <div className="py-5 text-center text-[13px] text-gray-400">No speakers enrolled yet</div>
          )}
          {speakers.map((s, i) => (
            <div key={s.id}>
              {i > 0 && <Divider />}
              {isAdmin ? (
                <div className="flex items-center gap-2 px-4 py-3">
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 font-semibold">{nameFor(s.member_id, s.member_name, s.member_initials)}</p>
                    {s.speech_duration && <p className="text-[11px] text-gray-400 mt-0.5">{s.speech_duration}</p>}
                  </div>
                  {canManage && (
                    <button onClick={() => handleRemove(s.id, 'Speaker')} disabled={acting} className="w-7 h-7 rounded-full bg-[#fef2f2] flex items-center justify-center"><X size={14} className="text-red-500" /></button>
                  )}
                </div>
              ) : (
                <RosterRow role="speaker" name={s.member_name} memberInitials={s.member_initials} isMe={s.member_email === myEmail} sub={s.speech_duration ?? undefined} />
              )}
            </div>
          ))}
          {isAdmin && canManage && speakers.length < meeting.max_speakers && (
            <div>
              {speakers.length > 0 && <Divider />}
              <button onClick={() => startAssign('speaker')} disabled={acting} className="w-full flex items-center justify-center gap-1 px-4 py-3 text-brand text-[13px] font-semibold">
                <Plus size={13} /> Add Speaker
              </button>
            </div>
          )}
          {isAdmin && !canManage && speakers.length === 0 && (
            <div className="px-4 py-3 text-center text-[13px] text-gray-400">No speakers were assigned</div>
          )}
        </div>

        {/* Table Topics Speakers */}
        {(isAdmin || tableTopicsSpeakers.length > 0) && (
          <>
            <SectionLabel>Table Topics Speakers</SectionLabel>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-5">
              {tableTopicsSpeakers.length === 0 && !isAdmin && (
                <div className="py-5 text-center text-[13px] text-gray-400">No table topics speakers yet</div>
              )}
              {tableTopicsSpeakers.map((s, i) => (
                <div key={s.id}>
                  {i > 0 && <Divider />}
                  {isAdmin ? (
                    <div className="flex items-center gap-2 px-4 py-3">
                      <p className="flex-1 text-sm text-gray-900 font-semibold">{nameFor(s.member_id, s.member_name, s.member_initials)}</p>
                      {canManage && (
                        <button onClick={() => handleRemove(s.id, 'Table Topics Speaker')} disabled={acting} className="w-7 h-7 rounded-full bg-[#fef2f2] flex items-center justify-center"><X size={14} className="text-red-500" /></button>
                      )}
                    </div>
                  ) : (
                    <RosterRow role="table_topics_speaker" name={s.member_name} memberInitials={s.member_initials} isMe={s.member_email === myEmail} />
                  )}
                </div>
              ))}
              {isAdmin && canManage && (
                <div>
                  {tableTopicsSpeakers.length > 0 && <Divider />}
                  <button onClick={() => startAssign('table_topics_speaker')} disabled={acting} className="w-full flex items-center justify-center gap-1 px-4 py-3 text-brand text-[13px] font-semibold">
                    <Plus size={13} /> Add Table Topics Speaker
                  </button>
                </div>
              )}
              {isAdmin && !canManage && tableTopicsSpeakers.length === 0 && (
                <div className="px-4 py-3 text-center text-[13px] text-gray-400">No table topics speakers were assigned</div>
              )}
            </div>
          </>
        )}

        {/* Evaluators */}
        {speakers.length > 0 && (
          <>
            <SectionLabel>Evaluators</SectionLabel>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-5">
              {speakers.map((s, i) => {
                const ev = evaluators.find((e) => e.evaluates_member_id === s.member_id);
                const speakerName = nameFor(s.member_id, s.member_name, s.member_initials);
                if (isAdmin) {
                  return (
                    <div key={s.id}>
                      {i > 0 && <Divider />}
                      <div className="flex items-center gap-2 px-4 py-3">
                        <div className="flex-1">
                          <p className="text-[11px] text-gray-400 mb-0.5">Evaluator for {speakerName}</p>
                          <p className={`text-sm font-semibold ${ev ? 'text-gray-900' : 'text-gray-400'}`}>{ev ? nameFor(ev.member_id, ev.member_name, ev.member_initials) : 'Unassigned'}</p>
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
                }
                return (
                  <div key={`ev-${s.id}`}>
                    {i > 0 && <Divider />}
                    <div className="flex items-center gap-2.5 px-4 py-3.5">
                      <MessageSquare size={14} className={ev ? 'text-violet-500' : 'text-gray-300'} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-700">Evaluator</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">For {speakerName}</p>
                      </div>
                      {ev ? (
                        <span className={`text-[13px] font-semibold truncate max-w-[130px] ${ev.member_email === myEmail ? 'text-green-600' : 'text-gray-900'}`}>
                          {ev.member_email === myEmail ? 'You' : nameFor(ev.member_id, ev.member_name, ev.member_initials)}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-gray-300">Open</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Apply CTA (non-admin members only) */}
      {canApply && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4">
          <div className="max-w-lg mx-auto">
            <button onClick={() => navigate(`/meetings/${id}/apply`)} className="w-full bg-brand text-white rounded-xl py-[15px] flex items-center justify-center gap-2 text-base font-bold">
              Apply for a Role <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Role title input bottom sheet (admin only, supporting roles) */}
      {SHOW_ADDITIONAL_ROLE_PLAYERS && showRoleTitleModal && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setShowRoleTitleModal(false)}>
          <div className="w-full bg-white rounded-t-3xl pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <button onClick={() => setShowRoleTitleModal(false)} className="text-gray-500 text-base w-[60px] text-left">Cancel</button>
              <h3 className="text-base font-semibold text-gray-900">Role Name</h3>
              <div className="w-[60px] flex justify-end">
                <button onClick={submitRoleTitle} disabled={!roleTitleInput.trim()} className="text-brand font-semibold text-base disabled:opacity-30">Next</button>
              </div>
            </div>
            <div className="px-5 pt-4">
              <p className="text-[13px] text-gray-500 font-medium mb-2">e.g. Guest Lecture, Photographer, Video Recorder</p>
              <input
                autoFocus
                value={roleTitleInput}
                onChange={(e) => setRoleTitleInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitRoleTitle(); }}
                placeholder="Role name…"
                className="w-full bg-white border border-gray-300 rounded-[10px] px-4 py-3.5 text-base text-gray-900 outline-none focus:border-brand"
              />
            </div>
          </div>
        </div>
      )}

      {/* Member picker bottom sheet (admin only) */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setPickerOpen(false)}>
          <div className="w-full bg-white rounded-t-3xl max-h-[75%] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <button onClick={() => setPickerOpen(false)} className="text-gray-500 text-base w-[60px] text-left">Cancel</button>
              <h3 className="text-base font-semibold text-gray-900">
                {assignRole === 'supporting_role' && pendingRoleTitle
                  ? `Assign ${pendingRoleTitle}`
                  : assignRole ? `Assign ${ROLE_LABELS[assignRole]}` : 'Select Member'}
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
                  <span className="flex-1 text-left text-[15px] text-gray-900 font-medium">
                    <span className="text-brand">{m.initials}</span> {m.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Duration picker (admin only) — min/max minutes, entered freely instead of a fixed list */}
      {showDuration && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => { setShowDuration(false); setAssignRole(null); }}>
          <div className="w-full bg-white rounded-t-3xl pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <button onClick={() => { setShowDuration(false); setAssignRole(null); }} className="text-gray-500 text-base w-[60px] text-left">Cancel</button>
              <h3 className="text-base font-semibold text-gray-900">Speech Duration</h3>
              <div className="w-[60px] flex justify-end">
                <button
                  onClick={confirmDuration}
                  disabled={!durationMin.trim() || !durationMax.trim()}
                  className="text-brand font-semibold text-base disabled:opacity-30"
                >
                  Confirm
                </button>
              </div>
            </div>
            <div className="px-5 pt-5">
              <p className="text-[13px] text-gray-500 mb-4">Enter the minimum and maximum speech time, in minutes.</p>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-[13px] font-medium text-gray-700 mb-1.5 block">Min</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={60}
                    value={durationMin}
                    onChange={(e) => { setDurationMin(e.target.value); setDurationError(''); }}
                    placeholder="5"
                    className="w-full bg-white border border-gray-300 rounded-[10px] px-4 py-3.5 text-base text-gray-900 outline-none focus:border-brand text-center"
                  />
                </div>
                <span className="text-gray-400 font-semibold mt-6">–</span>
                <div className="flex-1">
                  <label className="text-[13px] font-medium text-gray-700 mb-1.5 block">Max</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={60}
                    value={durationMax}
                    onChange={(e) => { setDurationMax(e.target.value); setDurationError(''); }}
                    placeholder="7"
                    className="w-full bg-white border border-gray-300 rounded-[10px] px-4 py-3.5 text-base text-gray-900 outline-none focus:border-brand text-center"
                  />
                </div>
                <span className="text-sm text-gray-400 mt-6">mins</span>
              </div>
              {durationError && <p className="text-xs text-red-500 mt-3">{durationError}</p>}
            </div>
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
        <button onClick={onBack} className="flex items-center text-brand font-semibold text-base w-[70px]">
          <ChevronLeft size={20} /> Back
        </button>
        <h1 className="text-lg font-bold text-gray-900 truncate">Roster</h1>
        <div className="w-[70px]" />
      </div>
    </div>
  );
}

function RosterRow({ role, name, memberInitials, isMe, sub }: { role: MeetingRole | string; name?: string | null; memberInitials?: string | null; isMe?: boolean; sub?: string }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-700">{ROLE_LABELS[role as MeetingRole] ?? role}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {name ? (
        <span className={`text-[13px] font-semibold truncate max-w-[130px] ${isMe ? 'text-green-600' : 'text-gray-900'}`}>{isMe ? 'You' : formatMemberName(name, memberInitials)}</span>
      ) : (
        <span className="text-xs font-medium text-gray-300">Open</span>
      )}
    </div>
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
function Divider() {
  return <div className="h-px bg-gray-100 mx-4" />;
}
