import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, Mic, MessageSquare, Scan } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getMeetingRoster, applyForRole } from '@/services/meetingService';
import { MemberBottomNav } from '@/components/layout/BottomNav';
import PageHeader from '@/components/layout/PageHeader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { PageSpinner } from '@/components/ui/Spinner';
import { SINGLETON_ROLES, ROLE_LABELS } from '@/types';
import type { MeetingWithRoster } from '@/types';
import { formatDate, formatTime } from '@/lib/utils';

const AVAILABLE_ROLES = [
  'tmod', 'timer', 'general_evaluator', 'grammarian', 'ah_counter',
  'table_topics_master', 'speaker', 'evaluator', 'table_topics_speaker', 'supporting_role',
];

function RosterRow({ role, name, sub, isMe }: { role: string; name?: string | null; sub?: string; isMe?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800">{ROLE_LABELS[role] ?? role}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {name ? (
        <span className={`text-sm font-semibold truncate max-w-[130px] ${isMe ? 'text-green-600' : 'text-gray-900'}`}>
          {isMe ? 'You' : name}
        </span>
      ) : (
        <span className="text-xs font-semibold text-gray-300">Open</span>
      )}
    </div>
  );
}

export default function MemberMeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const myEmail = session?.user?.email ?? '';

  const [data, setData] = useState<MeetingWithRoster | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [selectedRole, setSelectedRole] = useState('speaker');
  const [speechTitle, setSpeechTitle] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState('');

  const load = useCallback(async () => {
    if (!session || !id) return;
    setLoading(true);
    try {
      const result = await getMeetingRoster(id, session.access_token);
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [session, id]);

  useEffect(() => { load(); }, [load]);

  async function handleApply() {
    if (!session || !id) return;
    setApplyError('');
    setApplying(true);
    try {
      await applyForRole(
        id,
        {
          role: selectedRole,
          speech_title: selectedRole === 'speaker' ? speechTitle.trim() || undefined : undefined,
        },
        session.access_token,
      );
      setShowApply(false);
      await load();
    } catch (e: unknown) {
      setApplyError(e instanceof Error ? e.message : 'Failed to apply');
    } finally {
      setApplying(false);
    }
  }

  if (loading) return <div className="flex flex-col min-h-full bg-gray-50"><PageHeader title="Meeting Details" back /><PageSpinner /></div>;
  if (!data) return <div className="flex flex-col min-h-full bg-gray-50"><PageHeader title="Meeting Details" back /><p className="text-center mt-20 text-gray-500">Not found</p></div>;

  const { meeting, roster } = data;
  const speakers = roster.filter((r) => r.role === 'speaker');
  const evaluators = roster.filter((r) => r.role === 'evaluator');
  const tableTopicsSpeakers = roster.filter((r) => r.role === 'table_topics_speaker');
  const myAssignment = roster.find((r) => r.member_email === myEmail);
  const isPublished = meeting.status === 'published';

  const isToday = (() => {
    const now = new Date();
    const d = new Date(meeting.scheduled_at);
    return now.toDateString() === d.toDateString();
  })();

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <PageHeader
        title="Meeting Details"
        back
        backPath="/meetings"
        right={
          isPublished ? (
            <button
              onClick={() => navigate('/scan')}
              className="p-2 rounded-xl bg-brand-50 text-brand"
            >
              <Scan size={20} />
            </button>
          ) : undefined
        }
      />

      <div className="flex-1 overflow-y-auto pb-28 max-w-lg mx-auto w-full">
        {/* Info card */}
        <div className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm mb-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h2 className="text-lg font-black text-gray-900 flex-1 leading-tight">{meeting.title}</h2>
            <Badge variant={meeting.status === 'published' ? 'published' : meeting.status === 'draft' ? 'draft' : 'completed'}>
              {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
            </Badge>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <Calendar size={12} /><span>{formatDate(meeting.scheduled_at)}</span>
              <span className="text-gray-300">·</span>
              <Clock size={12} /><span>{formatTime(meeting.scheduled_at)}</span>
            </div>
            {meeting.venue && (
              <div className="flex items-center gap-2 text-gray-500 text-xs">
                <MapPin size={12} /><span>{meeting.venue}</span>
              </div>
            )}
            {meeting.theme && (
              <p className="text-xs text-gray-500 italic mt-0.5">"{meeting.theme}"</p>
            )}
          </div>
        </div>

        {/* My role */}
        {myAssignment && (
          <div className="mx-4 bg-green-50 border border-green-200 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Your Role</p>
                <p className="text-base font-black text-gray-900">
                  {ROLE_LABELS[myAssignment.role] ?? myAssignment.role}
                </p>
                {myAssignment.speech_title && (
                  <p className="text-xs text-gray-500 mt-1">"{myAssignment.speech_title}"</p>
                )}
              </div>
              <span className="text-xs font-bold text-green-700 bg-green-100 px-3 py-1.5 rounded-full">
                Assigned
              </span>
            </div>
          </div>
        )}

        {/* Singleton roles */}
        <p className="mx-4 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Role Players</p>
        <div className="mx-4 bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50 mb-4">
          {SINGLETON_ROLES.map((role) => {
            const entry = roster.find((r) => r.role === role);
            return (
              <RosterRow
                key={role}
                role={role}
                name={entry?.member_name}
                isMe={entry?.member_email === myEmail}
              />
            );
          })}
        </div>

        {/* Speakers */}
        <div className="mx-4 flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Speakers</p>
          <span className="text-xs font-bold text-gray-400">{speakers.length} / {meeting.max_speakers}</span>
        </div>
        <div className="mx-4 bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50 mb-4">
          {speakers.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-400">No speakers enrolled</div>
          ) : (
            speakers.map((sp) => (
              <RosterRow key={sp.id} role="speaker" name={sp.member_name} sub={sp.speech_title ?? undefined} isMe={sp.member_email === myEmail} />
            ))
          )}
        </div>

        {/* Evaluators */}
        {speakers.length > 0 && (
          <>
            <p className="mx-4 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Evaluators</p>
            <div className="mx-4 bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50 mb-4">
              {speakers.map((sp) => {
                const ev = evaluators.find((e) => e.evaluates_member_id === sp.member_id);
                return (
                  <RosterRow
                    key={`ev-${sp.id}`}
                    role="evaluator"
                    name={ev?.member_name}
                    sub={`For ${sp.member_name ?? '—'}`}
                    isMe={ev?.member_email === myEmail}
                  />
                );
              })}
            </div>
          </>
        )}

        {/* Table Topics Speakers */}
        {tableTopicsSpeakers.length > 0 && (
          <>
            <p className="mx-4 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Table Topics Speakers</p>
            <div className="mx-4 bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50 mb-4">
              {tableTopicsSpeakers.map((sp) => (
                <RosterRow key={sp.id} role="table_topics_speaker" name={sp.member_name} isMe={sp.member_email === myEmail} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Apply for role / Feedback CTAs */}
      {isPublished && (
        <div className="fixed bottom-[64px] left-0 right-0 z-20 bg-white border-t border-gray-100 px-4 py-3 max-w-lg mx-auto">
          {!showApply ? (
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowApply(true)}>
                Apply for Role
              </Button>
              {isToday && (
                <Button variant="primary" className="flex-1" onClick={() => navigate(`/meetings/${id}/feedback`)}>
                  Give Feedback
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Select
                label="Role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                {AVAILABLE_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                ))}
              </Select>
              {selectedRole === 'speaker' && (
                <input
                  type="text"
                  placeholder="Speech title (optional)"
                  value={speechTitle}
                  onChange={(e) => setSpeechTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
                />
              )}
              {applyError && <p className="text-xs text-red-500">{applyError}</p>}
              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={() => setShowApply(false)}>
                  Cancel
                </Button>
                <Button variant="primary" className="flex-1" onClick={handleApply} loading={applying}>
                  Apply
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <MemberBottomNav />
    </div>
  );
}
