import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getAllMeetings } from '@/services/meetingService';
import { AdminBottomNav } from '@/components/layout/BottomNav';
import { MeetingListSkeleton } from '@/components/ui/Skeleton';
import type { Meeting } from '@/types';
import { STATUS_COLOR, STATUS_LABEL } from '@/types';
import { formatDateTime } from '@/lib/utils';

export default function AdminMeetingsPage() {
  const navigate = useNavigate();
  const { session, appRole } = useAuthStore();
  const isSuperAdmin = appRole === 'super_admin';
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    getAllMeetings(session.access_token)
      .then(setMeetings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  const upcoming = meetings.filter((m) => m.status !== 'completed');
  const past = meetings.filter((m) => m.status === 'completed');

  return (
    <div className="flex flex-col min-h-full bg-[#f4f4f8]">
      <div className="bg-white border-b border-gray-100 px-5 py-4 sticky top-0 z-20">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Meetings</h1>
          <button
            onClick={() => navigate('/admin/meetings/new')}
            className="flex items-center gap-1 bg-brand text-white text-sm font-semibold rounded-[10px] px-3.5 py-2 active:scale-95 transition-transform"
          >
            <Plus size={16} /> New
          </button>
        </div>
      </div>

      {loading ? (
        <MeetingListSkeleton />
      ) : (
        <div className="flex-1 overflow-y-auto px-5 pt-5 pb-28 max-w-lg mx-auto w-full">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Upcoming</p>
          {upcoming.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-2.5">
              <Calendar size={28} className="text-gray-300" />
              <p className="text-sm text-gray-400 text-center whitespace-pre-line">No upcoming meetings.{'\n'}Tap "+ New" to create one.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {upcoming.map((m) => (
                <MeetingRow key={m.id} meeting={m} onClick={() => navigate(`/admin/meetings/${m.id}`)} />
              ))}
            </div>
          )}

          {past.length > 0 && (
            <>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5 mt-6">Past</p>
              <div className="flex flex-col gap-2.5">
                {past.map((m) => (
                  <MeetingRow key={m.id} meeting={m} past onClick={() => navigate(`/admin/meetings/${m.id}`)} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <AdminBottomNav isSuperAdmin={isSuperAdmin} />
    </div>
  );
}

function MeetingRow({ meeting, past, onClick }: { meeting: Meeting; past?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full bg-white rounded-2xl px-4 py-3.5 flex items-center justify-between shadow-sm text-left ${past ? 'opacity-70' : ''}`}
    >
      <div className="flex-1 min-w-0 mr-3">
        <p className={`text-[15px] font-semibold truncate ${past ? 'text-gray-500' : 'text-gray-900'}`}>{meeting.title}</p>
        <p className="text-xs text-gray-500 mt-1">{formatDateTime(meeting.scheduled_at)}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={
            past
              ? { backgroundColor: '#f3f4f6', color: '#6b7280' }
              : { backgroundColor: STATUS_COLOR[meeting.status] + '22', color: STATUS_COLOR[meeting.status] }
          }
        >
          {past ? 'Completed' : STATUS_LABEL[meeting.status]}
        </span>
        <ChevronRight size={18} className="text-gray-400" />
      </div>
    </button>
  );
}
