import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Calendar, Clock, MapPin, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getAllMeetings, getMeetingRoster } from '@/services/meetingService';
import { getClubMembers, getMe } from '@/services/memberService';
import { getClub } from '@/services/clubService';
import { MemberBottomNav } from '@/components/layout/BottomNav';
import { HomeSkeleton } from '@/components/ui/Skeleton';
import type { Meeting, MeetingRoleAssignment, Club } from '@/types';
import { CLUB_ROLE_LABELS, STATUS_COLOR } from '@/types';
import { dateparts, formatDateShort } from '@/lib/utils';

interface HomeData {
  club: Club | null;
  nextMeeting: Meeting | null;
  upcoming: Meeting[];
  stats: { speeches: number; feedbacks: number };
  activeMembers: number;
  rolesFilled: number;
  memberMap: Map<string, string>;
  clubRole: string;
}

export default function MemberHomePage() {
  const navigate = useNavigate();
  const { session } = useAuthStore();

  const [data, setData] = useState<HomeData>({
    club: null, nextMeeting: null, upcoming: [],
    stats: { speeches: 12, feedbacks: 8 }, activeMembers: 0, rolesFilled: 0,
    memberMap: new Map(), clubRole: 'member',
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    const token = session.access_token;
    const [clubRes, allRes, membersRes, meRes] = await Promise.allSettled([
      getClub(token),
      getAllMeetings(token),
      getClubMembers(token),
      getMe(token),
    ]);

    const club = clubRes.status === 'fulfilled' ? clubRes.value : null;
    const allMeetings = allRes.status === 'fulfilled' ? allRes.value : [];
    const members = membersRes.status === 'fulfilled' ? membersRes.value : [];
    const clubRole = meRes.status === 'fulfilled' ? meRes.value.club_role : 'member';
    const stats = { speeches: 12, feedbacks: 8 };

    const now = new Date();
    const future = allMeetings
      .filter((m) => m.status === 'published' && new Date(m.scheduled_at) >= now)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    const nextMeeting = future[0] ?? null;

    let roster: MeetingRoleAssignment[] = [];
    if (nextMeeting) {
      try {
        const result = await getMeetingRoster(nextMeeting.id, token);
        roster = result.roster;
      } catch { /* empty */ }
    }

    const activeMembers = members.filter((m) => m.is_active).length;
    const memberMap = new Map(members.map((m) => [m.id, m.name]));

    setData({ club, nextMeeting, upcoming: future.slice(0, 5), stats, activeMembers, rolesFilled: roster.length, memberMap, clubRole });
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const { club, nextMeeting, upcoming, stats, activeMembers, rolesFilled, memberMap, clubRole } = data;
  const engagementPct = activeMembers === 0 ? 0 : Math.round((rolesFilled / Math.max(activeMembers, 1)) * 100);
  const totalActivity = stats.speeches + stats.feedbacks;
  const progressPct = totalActivity === 0 ? 0 : Math.round((stats.speeches / totalActivity) * 100);

  return (
    <div className="flex flex-col min-h-full bg-[#f4f4f8]">
      {/* Banner */}
      <div className="bg-[#fdf2f2] border-b border-[#f5e0e0] px-5 pt-4 pb-5">
        <div className="max-w-lg mx-auto flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-[22px] font-extrabold text-[#1a1a2e] tracking-tight">{club?.name ?? 'Toastmasters'}</h1>
            <p className="text-[13px] text-gray-500 mt-0.5">Excellence in Communication</p>
            <div className="inline-flex mt-2.5 rounded-full px-3 py-1 bg-brand/[0.08] border border-brand/20">
              <span className="text-[10px] font-bold text-brand tracking-[1px]">
                {(CLUB_ROLE_LABELS[clubRole as keyof typeof CLUB_ROLE_LABELS] ?? 'Member').toUpperCase()}
              </span>
            </div>
          </div>
          <button className="w-9 h-9 rounded-full bg-brand/[0.08] flex items-center justify-center">
            <Bell size={20} className="text-brand" />
          </button>
        </div>
      </div>

      {loading ? (
        <HomeSkeleton />
      ) : (
        <div className="flex-1 overflow-y-auto pb-28 max-w-lg mx-auto w-full">
          {/* Stats */}
          <div className="mx-4 mt-4 bg-white rounded-2xl py-4 shadow-md flex">
            <StatBox value={upcoming.length.toString()} label="Upcoming" sub="Meetings" />
            <StatBox value={activeMembers.toString()} label="Active" sub="Members" />
            <StatBox value={rolesFilled.toString()} label="Roles" sub="Filled" />
            <StatBox value={`${engagementPct}%`} label="Engagement" sub="Rate" />
          </div>

          {/* Motive banner */}
          <div className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex-1 mr-3">
              <p className="text-[15px] font-bold text-gray-900">Keep Growing!</p>
              <p className="text-xs text-gray-500 mt-0.5">You're on track with your speaking goals.</p>
            </div>
            <button onClick={() => navigate('/meetings')} className="rounded-[10px] px-3.5 py-2 border-[1.5px] border-brand text-brand text-[13px] font-bold">
              View All
            </button>
          </div>

          {/* Next Meeting */}
          {nextMeeting ? (
            <NextMeetingCard
              meeting={nextMeeting}
              presidentName={nextMeeting.president_id ? memberMap.get(nextMeeting.president_id) : undefined}
              saaName={nextMeeting.saa_id ? memberMap.get(nextMeeting.saa_id) : undefined}
              onClick={() => navigate(`/meetings/${nextMeeting.id}`)}
            />
          ) : (
            <div className="mx-4 mt-4 bg-white rounded-2xl py-8 shadow-sm flex flex-col items-center gap-2.5">
              <Calendar size={28} className="text-gray-300" />
              <span className="text-sm text-gray-400">No upcoming meeting scheduled</span>
            </div>
          )}

          {/* My Progress */}
          <div className="mx-4 mt-5 mb-2.5">
            <h2 className="text-base font-bold text-gray-900">My Progress</h2>
          </div>
          <div className="mx-4 bg-white rounded-2xl shadow-sm flex items-center py-5 px-2">
            <ProgressStat label="Speeches" num={stats.speeches} />
            <div className="w-px h-13 bg-gray-100" style={{ height: 52 }} />
            <ProgressStat label="Feedbacks" num={stats.feedbacks} />
            <div className="w-px bg-gray-100" style={{ height: 52 }} />
            <div className="flex-1 flex items-center justify-center relative">
              <ProgressRing percent={progressPct} />
              <span className="absolute text-sm font-extrabold text-gray-900">{progressPct}%</span>
            </div>
          </div>

          {/* Upcoming Schedule */}
          <div className="mx-4 mt-5 mb-2.5 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Upcoming Schedule</h2>
            <button onClick={() => navigate('/meetings')} className="text-[13px] text-brand font-semibold">See All</button>
          </div>
          {upcoming.length === 0 ? (
            <div className="mx-4 bg-white rounded-2xl py-6 shadow-sm text-center">
              <p className="text-sm text-gray-400">No upcoming meetings.</p>
            </div>
          ) : (
            <div className="mx-4 bg-white rounded-2xl shadow-sm overflow-hidden">
              {upcoming.map((m, i) => (
                <button key={m.id} onClick={() => navigate(`/meetings/${m.id}`)} className={`w-full flex items-center gap-3 p-3.5 text-left ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                  <div className="w-11 h-11 rounded-xl bg-[#fef2f2] flex flex-col items-center justify-center shrink-0">
                    <span className="text-base font-extrabold text-brand leading-none">{new Date(m.scheduled_at).getDate()}</span>
                    <span className="text-[9px] font-semibold text-brand tracking-wide">{new Date(m.scheduled_at).toLocaleDateString('en-IN', { month: 'short' })}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{m.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatDateShort(m.scheduled_at)}</p>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[m.status] + '22', color: STATUS_COLOR[m.status] }}>
                    {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <MemberBottomNav />
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

function ProgressStat({ label, num }: { label: string; num: number }) {
  return (
    <div className="flex-1 flex flex-col items-center">
      <span className="text-xs font-semibold text-gray-500 mb-1">{label}</span>
      <span className="text-[28px] font-extrabold text-gray-900 leading-none">{num}</span>
      <span className="text-[11px] text-gray-400 mt-0.5">This Month</span>
    </div>
  );
}

function ProgressRing({ percent, size = 68 }: { percent: number; size?: number }) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(percent, 100) / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#f3f4f6" strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#8B1A1A" strokeWidth={stroke} fill="none" strokeDasharray={`${circ}`} strokeDashoffset={offset} strokeLinecap="round" />
    </svg>
  );
}

function NextMeetingCard({ meeting, presidentName, saaName, onClick }: { meeting: Meeting; presidentName?: string; saaName?: string; onClick: () => void }) {
  const p = dateparts(meeting.scheduled_at);
  return (
    <button onClick={onClick} className="mx-4 mt-4 w-[calc(100%-2rem)] bg-white rounded-2xl p-4 shadow-md flex items-center gap-3.5 text-left active:scale-[0.99] transition-transform">
      <div className="w-[52px] flex flex-col items-center shrink-0">
        <div className="w-10 h-10 rounded-xl bg-[#fef2f2] flex items-center justify-center mb-1.5">
          <Calendar size={20} className="text-brand" />
        </div>
        <span className="text-[10px] font-semibold text-gray-500">{p.day}</span>
        <span className="text-[22px] font-extrabold text-gray-900 leading-6">{p.date}</span>
        <span className="text-[10px] font-bold text-gray-500 tracking-wide">{p.month}</span>
      </div>
      <div className="w-px self-stretch bg-gray-100" />
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-bold text-gray-900 mb-1.5 truncate">{meeting.title}</p>
        <div className="flex items-center gap-1 flex-wrap text-xs text-gray-500 mb-1.5">
          <Clock size={12} />
          <span>{p.time}</span>
          {meeting.venue && (<><span className="text-gray-300">·</span><MapPin size={12} /><span className="truncate">{meeting.venue}</span></>)}
        </div>
        {presidentName && (<div className="flex items-center gap-1 text-xs"><span>👑</span><span className="text-gray-500">President: </span><span className="font-semibold text-gray-700">{presidentName}</span></div>)}
        {saaName && (<div className="flex items-center gap-1 text-xs mt-0.5"><span>🛡️</span><span className="text-gray-500">SAA: </span><span className="font-semibold text-gray-700">{saaName}</span></div>)}
      </div>
      <ChevronRight size={18} className="text-gray-400 shrink-0" />
    </button>
  );
}
