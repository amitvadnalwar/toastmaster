import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronRight, Scan, MapPin, Clock } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getUpcomingMeetings } from '@/services/meetingService';
import { getMe } from '@/services/memberService';
import { MemberBottomNav } from '@/components/layout/BottomNav';
import { PageSpinner } from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import type { Meeting, Member } from '@/types';
import { formatDate, formatTime, initials } from '@/lib/utils';

export default function MemberHomePage() {
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [me, setMe] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    Promise.all([
      getUpcomingMeetings(session.access_token),
      getMe(session.access_token),
    ])
      .then(([mtgs, member]) => {
        setMeetings(mtgs);
        setMe(member);
      })
      .finally(() => setLoading(false));
  }, [session]);

  const nextMeeting = meetings[0] ?? null;

  if (loading) return <div className="flex flex-col min-h-full bg-gray-50"><PageSpinner /></div>;

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-brand px-5 pt-6 pb-8">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <p className="text-brand-100 text-sm font-medium">Welcome back,</p>
            <h1 className="text-white text-2xl font-black mt-0.5">
              {me?.name.split(' ')[0] ?? 'Member'}
            </h1>
          </div>
          <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold">{me ? initials(me.name) : '?'}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-28 -mt-4 max-w-lg mx-auto w-full px-4">
        {/* Next Meeting Card */}
        {nextMeeting ? (
          <button
            onClick={() => navigate(`/meetings/${nextMeeting.id}`)}
            className="w-full text-left bg-white rounded-2xl p-5 shadow-md border border-gray-100 mb-5 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-brand uppercase tracking-wider">
                Next Meeting
              </span>
              <Badge variant={nextMeeting.status === 'published' ? 'published' : 'draft'}>
                {nextMeeting.status.charAt(0).toUpperCase() + nextMeeting.status.slice(1)}
              </Badge>
            </div>
            <h2 className="text-lg font-black text-gray-900 mb-3 leading-tight">
              {nextMeeting.title}
            </h2>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Calendar size={14} />
                <span>{formatDate(nextMeeting.scheduled_at)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Clock size={14} />
                <span>{formatTime(nextMeeting.scheduled_at)}</span>
              </div>
              {nextMeeting.venue && (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <MapPin size={14} />
                  <span>{nextMeeting.venue}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 mt-4 text-brand text-sm font-bold">
              <span>View Details</span>
              <ChevronRight size={16} />
            </div>
          </button>
        ) : (
          <div className="bg-white rounded-2xl p-6 shadow-sm text-center mb-5">
            <Calendar size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 font-medium">No upcoming meetings</p>
          </div>
        )}

        {/* Quick Actions */}
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
          Quick Actions
        </p>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            onClick={() => navigate('/scan')}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center gap-2 active:scale-95 transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
              <Scan size={20} className="text-brand" />
            </div>
            <span className="text-sm font-bold text-gray-800">Check In</span>
            <span className="text-xs text-gray-400 text-center">Scan meeting QR</span>
          </button>
          <button
            onClick={() => navigate('/meetings')}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center gap-2 active:scale-95 transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
              <Calendar size={20} className="text-brand" />
            </div>
            <span className="text-sm font-bold text-gray-800">Meetings</span>
            <span className="text-xs text-gray-400 text-center">View all meetings</span>
          </button>
        </div>

        {/* Other upcoming */}
        {meetings.length > 1 && (
          <>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              More Upcoming
            </p>
            <div className="flex flex-col gap-2">
              {meetings.slice(1).map((m) => (
                <button
                  key={m.id}
                  onClick={() => navigate(`/meetings/${m.id}`)}
                  className="w-full text-left flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                    <Calendar size={18} className="text-brand" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">{m.title}</p>
                    <p className="text-xs text-gray-500">{formatDate(m.scheduled_at)}</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 shrink-0" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <MemberBottomNav />
    </div>
  );
}
