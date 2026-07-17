import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Calendar, Clock, MapPin, ChevronRight, PlusCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getAllMeetings, getMeetingRoster } from '@/services/meetingService';
import { getAllMembers, getMe } from '@/services/memberService';
import { getClub } from '@/services/clubService';
import { AdminBottomNav } from '@/components/layout/BottomNav';
import { HomeSkeleton } from '@/components/ui/Skeleton';
import type { Meeting, MeetingRoleAssignment, Club } from '@/types';
import { CLUB_ROLE_LABELS, ROLE_LABELS, STATUS_COLOR, SINGLETON_ROLES } from '@/types';
import { dateparts, formatDateShort } from '@/lib/utils';

interface HomeData {
  club: Club | null;
  nextMeeting: Meeting | null;
  roster: MeetingRoleAssignment[];
  upcoming: Meeting[];
  activeMembers: number;
  totalMeetings: number;
  rolesFilled: number;
  engagementPct: number;
  memberMap: Map<string, string>;
  clubRole: string;
}

export default function AdminHomePage() {
  const navigate = useNavigate();
  const { session, appRole } = useAuthStore();
  const isSuperAdmin = appRole === 'super_admin';

  const [data, setData] = useState<HomeData>({
    club: null, nextMeeting: null, roster: [], upcoming: [],
    activeMembers: 0, totalMeetings: 0, rolesFilled: 0, engagementPct: 0,
    memberMap: new Map(), clubRole: 'member',
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    const token = session.access_token;
    const [clubRes, allRes, membersRes, meRes] = await Promise.allSettled([
      getClub(token),
      getAllMeetings(token),
      getAllMembers(token),
      getMe(token),
    ]);

    const club = clubRes.status === 'fulfilled' ? clubRes.value : null;
    const allMeetings = allRes.status === 'fulfilled' ? allRes.value : [];
    const members = membersRes.status === 'fulfilled' ? membersRes.value : [];
    const clubRole = meRes.status === 'fulfilled' ? meRes.value.club_role : 'member';

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
    const rolesFilled = roster.length;
    const engagementPct = activeMembers === 0 ? 0 : Math.round((rolesFilled / Math.max(activeMembers, 1)) * 100);
    const memberMap = new Map(members.map((m) => [m.id, m.name]));

    setData({
      club, nextMeeting, roster, upcoming: future.slice(0, 5),
      activeMembers, totalMeetings: future.length, rolesFilled, engagementPct, memberMap, clubRole,
    });
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const { club, nextMeeting, roster, upcoming, memberMap, clubRole } = data;

  return (
    <div className="flex flex-col min-h-full bg-[#f4f4f8]">
      {/* Club Banner */}
      <div className="bg-[#fdf2f2] border-b border-[#f5e0e0] px-5 pt-4 pb-5">
        <div className="max-w-lg mx-auto flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-[22px] font-extrabold text-[#1a1a2e] tracking-tight">
              {club?.name ?? 'Toastmasters'}
            </h1>
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
          {/* Stats Row */}
          <div className="mx-4 mt-4 bg-white rounded-2xl py-4 shadow-md flex">
            <StatBox value={data.totalMeetings.toString()} label="Upcoming" sub="Meetings" />
            <StatBox value={data.activeMembers.toString()} label="Active" sub="Members" />
            <StatBox value={data.rolesFilled.toString()} label="Roles" sub="Filled" />
            <StatBox value={`${data.engagementPct}%`} label="Engagement" sub="Rate" />
          </div>

          {/* Manage banner */}
          <div className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex-1 mr-3">
              <p className="text-[15px] font-bold text-gray-900">Manage your club</p>
              <p className="text-xs text-gray-500 mt-0.5">Create meetings, assign roles, track progress.</p>
            </div>
            <button
              onClick={() => navigate('/admin/meetings/new')}
              className="bg-brand text-white text-[13px] font-bold rounded-[10px] px-3.5 py-2 active:scale-95 transition-transform"
            >
              + New
            </button>
          </div>

          {/* Next Meeting */}
          {nextMeeting ? (
            <NextMeetingCard
              meeting={nextMeeting}
              presidentName={nextMeeting.president_id ? memberMap.get(nextMeeting.president_id) : undefined}
              saaName={nextMeeting.saa_id ? memberMap.get(nextMeeting.saa_id) : undefined}
              onClick={() => navigate(`/admin/meetings/${nextMeeting.id}`)}
            />
          ) : (
            <button
              onClick={() => navigate('/admin/meetings/new')}
              className="mx-4 mt-4 w-[calc(100%-2rem)] bg-white rounded-2xl py-8 shadow-sm flex flex-col items-center gap-2.5 active:scale-[0.99] transition-transform"
            >
              <PlusCircle size={28} className="text-brand" />
              <span className="text-sm text-gray-500">No upcoming meeting — tap to create one</span>
            </button>
          )}

          {/* Roster Status */}
          {nextMeeting && (
            <>
              <div className="mx-4 mt-5 mb-2.5 flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900">Roster Status</h2>
                <button onClick={() => navigate(`/admin/meetings/${nextMeeting.id}`)} className="text-[13px] text-brand font-semibold">
                  Manage
                </button>
              </div>
              <RosterStatusCard roster={roster} />
            </>
          )}

          {/* Upcoming Schedule */}
          <div className="mx-4 mt-5 mb-2.5 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Upcoming Schedule</h2>
            <button onClick={() => navigate('/admin/meetings')} className="text-[13px] text-brand font-semibold">
              See All
            </button>
          </div>
          {upcoming.length === 0 ? (
            <div className="mx-4 bg-white rounded-2xl py-6 shadow-sm text-center">
              <p className="text-sm text-gray-400 px-5">No upcoming meetings. Create one to get started.</p>
            </div>
          ) : (
            <div className="mx-4 bg-white rounded-2xl shadow-sm overflow-hidden">
              {upcoming.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => navigate(`/admin/meetings/${m.id}`)}
                  className={`w-full flex items-center gap-3 p-3.5 text-left ${i > 0 ? 'border-t border-gray-100' : ''}`}
                >
                  <div className="w-11 h-11 rounded-xl bg-[#fef2f2] flex flex-col items-center justify-center shrink-0">
                    <span className="text-base font-extrabold text-brand leading-none">{new Date(m.scheduled_at).getDate()}</span>
                    <span className="text-[9px] font-semibold text-brand tracking-wide">
                      {new Date(m.scheduled_at).toLocaleDateString('en-IN', { month: 'short' })}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{m.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatDateShort(m.scheduled_at)}</p>
                  </div>
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: STATUS_COLOR[m.status] + '22', color: STATUS_COLOR[m.status] }}
                  >
                    {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <AdminBottomNav isSuperAdmin={isSuperAdmin} />
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

function NextMeetingCard({
  meeting, presidentName, saaName, onClick,
}: {
  meeting: Meeting;
  presidentName?: string;
  saaName?: string;
  onClick: () => void;
}) {
  const p = dateparts(meeting.scheduled_at);
  return (
    <button
      onClick={onClick}
      className="mx-4 mt-4 w-[calc(100%-2rem)] bg-white rounded-2xl p-4 shadow-md flex items-center gap-3.5 text-left active:scale-[0.99] transition-transform"
    >
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
          {meeting.venue && (
            <>
              <span className="text-gray-300">·</span>
              <MapPin size={12} />
              <span className="truncate">{meeting.venue}</span>
            </>
          )}
        </div>
        {presidentName && (
          <div className="flex items-center gap-1 text-xs">
            <span>👑</span>
            <span className="text-gray-500">President: </span>
            <span className="font-semibold text-gray-700">{presidentName}</span>
          </div>
        )}
        {saaName && (
          <div className="flex items-center gap-1 text-xs mt-0.5">
            <span>🛡️</span>
            <span className="text-gray-500">SAA: </span>
            <span className="font-semibold text-gray-700">{saaName}</span>
          </div>
        )}
      </div>
      <ChevronRight size={18} className="text-gray-400 shrink-0" />
    </button>
  );
}

function RosterStatusCard({ roster }: { roster: MeetingRoleAssignment[] }) {
  const filledRoles = new Set(roster.map((r) => r.role));
  const total = SINGLETON_ROLES.length;
  const filled = SINGLETON_ROLES.filter((r) => filledRoles.has(r)).length;
  const pct = Math.round((filled / total) * 100);

  return (
    <div className="mx-4 bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex justify-between mb-2.5">
        <span className="text-sm font-semibold text-gray-700">{filled}/{total} key roles filled</span>
        <span className="text-sm font-bold text-brand">{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex flex-wrap gap-2">
        {SINGLETON_ROLES.map((role) => {
          const isFilled = filledRoles.has(role);
          const abbr = (ROLE_LABELS[role] ?? role).split(' ').map((w) => w[0]).join('');
          return (
            <span
              key={role}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                isFilled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
              }`}
            >
              {abbr}
            </span>
          );
        })}
      </div>
    </div>
  );
}
