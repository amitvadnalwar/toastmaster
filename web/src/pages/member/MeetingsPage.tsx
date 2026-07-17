import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getAllMeetings } from '@/services/meetingService';
import { MemberBottomNav } from '@/components/layout/BottomNav';
import Spinner from '@/components/ui/Spinner';
import type { Meeting, MeetingStatus } from '@/types';
import { formatDate, formatTime } from '@/lib/utils';

const STATUS_BADGE: Record<MeetingStatus, { label: string; bg: string; color: string }> = {
  draft: { label: 'Scheduled', bg: '#f3f4f6', color: '#6b7280' },
  published: { label: 'Published', bg: '#dcfce7', color: '#16a34a' },
  completed: { label: 'Completed', bg: '#f3f4f6', color: '#6b7280' },
};

function appStatus(m: Meeting): { text: string; color: string } {
  if (m.status === 'published') return { text: 'Application window open', color: '#16a34a' };
  if (m.status === 'draft') return { text: 'Application not opened yet', color: '#9ca3af' };
  return { text: 'Meeting completed', color: '#9ca3af' };
}

export default function MemberMeetingsPage() {
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    getAllMeetings(session.access_token)
      .then((all) => {
        const now = new Date();
        const upcoming = all
          .filter((m) => m.status !== 'completed')
          .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
        const past = all
          .filter((m) => m.status === 'completed')
          .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
        void now;
        setMeetings([...upcoming, ...past]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  return (
    <div className="flex flex-col min-h-full bg-[#f4f4f8]">
      <div className="bg-white border-b border-gray-100 px-5 py-4 sticky top-0 z-20">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-bold text-gray-900">Meetings</h1>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-16"><Spinner size="lg" /></div>
      ) : meetings.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20">
          <Calendar size={36} className="text-gray-300" />
          <p className="text-sm text-gray-400">No meetings available.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 pb-28 max-w-lg mx-auto w-full flex flex-col gap-3">
          {meetings.map((m) => {
            const badge = STATUS_BADGE[m.status];
            const app = appStatus(m);
            const isCompleted = m.status === 'completed';
            return (
              <button
                key={m.id}
                onClick={() => navigate(`/meetings/${m.id}`)}
                className={`bg-white rounded-2xl p-4 shadow-sm text-left ${isCompleted ? 'opacity-75' : ''}`}
              >
                <div className="flex items-start justify-between gap-2.5 mb-2">
                  <p className="flex-1 text-[15px] font-bold text-gray-900 truncate">{m.title}</p>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: badge.bg, color: badge.color }}>{badge.label}</span>
                </div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <span className="text-xs text-gray-700 font-medium">{formatDate(m.scheduled_at)}</span>
                  <span className="flex items-center gap-1 text-xs text-gray-500"><Clock size={11} />{formatTime(m.scheduled_at)}</span>
                </div>
                {m.venue && (
                  <div className="flex items-center gap-1.5 mb-2 text-xs text-gray-500">
                    <MapPin size={12} className="text-gray-400" />{m.venue}
                  </div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs font-semibold" style={{ color: app.color }}>{app.text}</span>
                  {m.status === 'published' && (
                    <span
                      onClick={(e) => { e.stopPropagation(); navigate(`/meetings/${m.id}/apply`); }}
                      className="flex items-center gap-1 bg-[#fff5f5] border border-red-300 rounded-md py-1.5 px-2.5 text-brand text-xs font-bold"
                    >
                      Apply <ArrowRight size={11} />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <MemberBottomNav />
    </div>
  );
}
