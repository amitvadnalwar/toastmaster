import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Maximize, Calendar, MapPin, Star, MessageSquare, ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getMeetingRoster } from '@/services/meetingService';
import Spinner from '@/components/ui/Spinner';
import type { MeetingWithRoster, MeetingRole } from '@/types';
import { SINGLETON_ROLES, ROLE_LABELS } from '@/types';
import { formatDate, formatTime } from '@/lib/utils';

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  draft: { label: 'Draft', bg: '#f3f4f6', color: '#6b7280' },
  published: { label: 'Published', bg: '#dcfce7', color: '#16a34a' },
  completed: { label: 'Completed', bg: '#f3f4f6', color: '#374151' },
};

function RosterRow({ role, name, isMe, sub }: { role: MeetingRole | string; name?: string | null; isMe?: boolean; sub?: string }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-700">{ROLE_LABELS[role as MeetingRole] ?? role}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {name ? (
        <span className={`text-[13px] font-semibold truncate max-w-[130px] ${isMe ? 'text-green-600' : 'text-gray-900'}`}>{isMe ? 'You' : name}</span>
      ) : (
        <span className="text-xs font-medium text-gray-300">Open</span>
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
  const [fetching, setFetching] = useState(true);

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

  if (fetching) {
    return (
      <div className="flex flex-col min-h-full bg-[#f5f5f5]">
        <Header onBack={() => navigate('/meetings')} canScan={false} onScan={() => {}} />
        <div className="flex-1 flex items-center justify-center"><Spinner size="lg" /></div>
      </div>
    );
  }
  if (!data) return null;

  const { meeting, roster } = data;
  const status = STATUS_CFG[meeting.status];
  const isPublished = meeting.status === 'published';
  const speakers = roster.filter((r) => r.role === 'speaker');
  const evaluators = roster.filter((r) => r.role === 'evaluator');
  const myAssignment = roster.find((r) => r.member_email === myEmail);

  return (
    <div className="flex flex-col min-h-full bg-[#f5f5f5]">
      <Header onBack={() => navigate('/meetings')} canScan={isPublished} onScan={() => navigate('/scan')} />

      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-28 max-w-lg mx-auto w-full">
        {/* Info card */}
        <div className="bg-white rounded-2xl p-[18px] mb-4 shadow-sm">
          <div className="flex items-start justify-between gap-2.5 mb-3">
            <h2 className="flex-1 text-lg font-extrabold text-gray-900">{meeting.title}</h2>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: status.bg, color: status.color }}>{status.label}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-gray-500 mb-1.5">
            <Calendar size={13} />
            <span>{formatDate(meeting.scheduled_at)}</span>
            <span className="text-gray-300">·</span>
            <span>{formatTime(meeting.scheduled_at)}</span>
          </div>
          {meeting.venue && (
            <div className="flex items-center gap-1.5 text-[13px] text-gray-500 mb-1.5">
              <MapPin size={13} /><span>{meeting.venue}</span>
            </div>
          )}
          {meeting.theme && (
            <div className="flex items-center gap-1.5 text-[13px] text-gray-500">
              <Star size={13} /><span>Theme: {meeting.theme}</span>
            </div>
          )}
        </div>

        {/* My role */}
        {myAssignment && (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-2xl p-4 mb-5">
            <div>
              <p className="text-[11px] font-semibold text-green-600 tracking-wide mb-0.5">YOUR ROLE</p>
              <p className="text-base font-bold text-gray-900">{ROLE_LABELS[myAssignment.role] ?? myAssignment.role}</p>
              {myAssignment.speech_duration && <p className="text-xs text-gray-500 mt-0.5">{myAssignment.speech_duration}</p>}
            </div>
            <span className="text-xs font-bold text-green-600 bg-green-100 rounded-full px-3 py-1.5">Assigned</span>
          </div>
        )}

        {/* Role Players */}
        <h3 className="text-sm font-bold text-gray-700 mb-2.5">Role Players</h3>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-5">
          {SINGLETON_ROLES.map((role, i) => {
            const a = roster.find((r) => r.role === role);
            return (
              <div key={role}>
                {i > 0 && <div className="h-px bg-gray-100 mx-3.5" />}
                <RosterRow role={role} name={a?.member_name} isMe={a?.member_email === myEmail} />
              </div>
            );
          })}
        </div>

        {/* Speakers */}
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-sm font-bold text-gray-700">Speakers</h3>
          <span className="text-xs font-semibold text-gray-400">{speakers.length} / {meeting.max_speakers}</span>
        </div>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-5">
          {speakers.length === 0 ? (
            <div className="py-5 text-center text-[13px] text-gray-400">No speakers enrolled yet</div>
          ) : (
            speakers.map((sp, i) => (
              <div key={sp.id}>
                {i > 0 && <div className="h-px bg-gray-100 mx-3.5" />}
                <RosterRow role="speaker" name={sp.member_name} isMe={sp.member_email === myEmail} sub={sp.speech_duration ?? undefined} />
              </div>
            ))
          )}
        </div>

        {/* Evaluators */}
        {speakers.length > 0 && (
          <>
            <h3 className="text-sm font-bold text-gray-700 mb-2.5">Evaluators</h3>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-5">
              {speakers.map((sp, i) => {
                const ev = evaluators.find((e) => e.evaluates_member_id === sp.member_id);
                return (
                  <div key={`ev-${sp.id}`}>
                    {i > 0 && <div className="h-px bg-gray-100 mx-3.5" />}
                    <div className="flex items-center gap-2.5 px-4 py-3.5">
                      <MessageSquare size={14} className={ev ? 'text-violet-500' : 'text-gray-300'} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-700">Evaluator</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">For {sp.member_name ?? '—'}</p>
                      </div>
                      {ev ? (
                        <span className={`text-[13px] font-semibold truncate max-w-[130px] ${ev.member_email === myEmail ? 'text-green-600' : 'text-gray-900'}`}>
                          {ev.member_email === myEmail ? 'You' : ev.member_name ?? '—'}
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

      {/* Apply CTA */}
      {isPublished && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4">
          <div className="max-w-lg mx-auto">
            <button onClick={() => navigate(`/meetings/${id}/apply`)} className="w-full bg-brand text-white rounded-xl py-[15px] flex items-center justify-center gap-2 text-base font-bold">
              Apply for a Role <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Header({ onBack, canScan, onScan }: { onBack: () => void; canScan: boolean; onScan: () => void }) {
  return (
    <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-20">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        <button onClick={onBack} className="flex items-center text-brand font-semibold text-base w-[60px]">
          <ChevronLeft size={20} /> Back
        </button>
        <h1 className="text-[17px] font-bold text-gray-900">Meeting Details</h1>
        <button onClick={onScan} disabled={!canScan} className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: canScan ? '#fff5f5' : '#f9fafb' }}>
          <Maximize size={20} className={canScan ? 'text-brand' : 'text-gray-300'} />
        </button>
      </div>
    </div>
  );
}
