import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getAllMeetings } from '@/services/meetingService';
import { MemberBottomNav } from '@/components/layout/BottomNav';
import Badge from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import type { Meeting } from '@/types';
import { formatDate, formatTime } from '@/lib/utils';

export default function MemberMeetingsPage() {
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    getAllMeetings(session.access_token)
      .then(setMeetings)
      .finally(() => setLoading(false));
  }, [session]);

  const upcoming = meetings.filter((m) => m.status !== 'completed');
  const past = meetings.filter((m) => m.status === 'completed');

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 pt-5 pb-4 sticky top-0 z-20">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-black text-gray-900">Meetings</h1>
        </div>
      </div>

      {loading ? (
        <PageSpinner />
      ) : (
        <div className="flex-1 overflow-y-auto pb-28 max-w-lg mx-auto w-full px-4 pt-5">
          {upcoming.length === 0 && past.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <Calendar size={40} className="text-gray-300" />
              <p className="text-gray-500 font-medium">No meetings found</p>
            </div>
          )}

          {upcoming.length > 0 && (
            <>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Upcoming</p>
              <div className="flex flex-col gap-3 mb-6">
                {upcoming.map((m) => (
                  <MeetingCard key={m.id} meeting={m} onPress={() => navigate(`/meetings/${m.id}`)} />
                ))}
              </div>
            </>
          )}

          {past.length > 0 && (
            <>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Past</p>
              <div className="flex flex-col gap-3">
                {past.map((m) => (
                  <MeetingCard key={m.id} meeting={m} onPress={() => navigate(`/meetings/${m.id}`)} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <MemberBottomNav />
    </div>
  );
}

function MeetingCard({ meeting, onPress }: { meeting: Meeting; onPress: () => void }) {
  return (
    <button
      onClick={onPress}
      className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-bold text-gray-900 text-base leading-tight flex-1 min-w-0">
          {meeting.title}
        </h3>
        <Badge variant={meeting.status === 'published' ? 'published' : meeting.status === 'draft' ? 'draft' : 'completed'}>
          {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
        </Badge>
      </div>
      <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
        <Calendar size={12} />
        <span>{formatDate(meeting.scheduled_at)}</span>
        <span className="text-gray-300">·</span>
        <Clock size={12} />
        <span>{formatTime(meeting.scheduled_at)}</span>
      </div>
      {meeting.venue && (
        <div className="flex items-center gap-2 text-gray-500 text-xs">
          <MapPin size={12} />
          <span className="truncate">{meeting.venue}</span>
        </div>
      )}
    </button>
  );
}
