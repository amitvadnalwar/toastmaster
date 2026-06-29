import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import { useAuthStore } from '@/store';
import { getAllMeetings, getMeetingRoster } from '@/services/meetingService';
import { getMyStats, getClubMembers, getMe } from '@/services/memberService';
import { getClub } from '@/services/clubService';
import type { Meeting, MeetingRoleAssignment, Club } from '@/types';
import { ROLE_LABELS } from '@/types/meeting';

const CLUB_ROLE_LABELS: Record<string, string> = {
  member: 'Member', president: 'President', vp_education: 'VP Education',
  vp_membership: 'VP Membership', vp_pr: 'VP PR', secretary: 'Secretary',
  treasurer: 'Treasurer', saa: 'SAA',
};

const STATUS_COLOR: Record<string, string> = {
  draft: '#f59e0b', published: '#10b981', completed: '#6b7280',
};

function initials(name: string | null | undefined) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function dateparts(iso: string) {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString('en-IN', { weekday: 'short' }),
    date: d.getDate().toString().padStart(2, '0'),
    month: d.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase(),
    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
  };
}

function formatDateShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface HomeData {
  club: Club | null;
  nextMeeting: Meeting | null;
  roster: MeetingRoleAssignment[];
  upcoming: Meeting[];
  stats: { speeches: number; feedbacks: number };
  activeMembers: number;
  rolesFilled: number;
  memberMap: Map<string, string>;
  clubRole: string;
}

export default function MemberHomeScreen() {
  const { session } = useAuthStore();
  const userName = session?.user?.user_metadata?.full_name
    ?? session?.user?.email?.split('@')[0]
    ?? 'Member';
  const userEmail = session?.user?.email ?? '';

  const [data, setData] = useState<HomeData>({
    club: null, nextMeeting: null, roster: [], upcoming: [],
    stats: { speeches: 12, feedbacks: 8 }, activeMembers: 0, rolesFilled: 0,
    memberMap: new Map(), clubRole: 'member',
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    const token = session.access_token;
    const [clubRes, allRes, membersRes, statsRes, meRes] = await Promise.allSettled([
      getClub(token),
      getAllMeetings(token),
      getClubMembers(token),
      getMyStats(token),
      getMe(token),
    ]);

    const club = clubRes.status === 'fulfilled' ? clubRes.value : null;
    const allMeetings = allRes.status === 'fulfilled' ? allRes.value : [];
    const members = membersRes.status === 'fulfilled' ? membersRes.value : [];
    const clubRole = meRes.status === 'fulfilled' ? meRes.value.club_role : 'member';
    // TODO: revert to real stats — const stats = statsRes.status === 'fulfilled' ? statsRes.value : { speeches: 0, feedbacks: 0 };
    const stats = { speeches: 12, feedbacks: 8 };

    const now = new Date();
    const future = allMeetings
      .filter(m => m.status === 'published' && new Date(m.scheduled_at) >= now)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    const nextMeeting = future[0] ?? null;

    let roster: MeetingRoleAssignment[] = [];
    let rolesFilled = 0;
    if (nextMeeting) {
      try {
        const result = await getMeetingRoster(nextMeeting.id, token);
        roster = result.roster;
        rolesFilled = roster.length;
      } catch { /* roster stays empty */ }
    }

    const activeMembers = members.filter(m => m.is_active).length;
    const memberMap = new Map(members.map(m => [m.id, m.name]));

    setData({
      club, nextMeeting, roster, upcoming: future.slice(0, 5),
      stats, activeMembers, rolesFilled, memberMap, clubRole,
    });
    setLoading(false);
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const { club, nextMeeting, roster, upcoming, stats, activeMembers, rolesFilled, memberMap, clubRole } = data;
  const myRoles = roster.filter(r => r.member_email === userEmail);
  const engagementPct = data.activeMembers === 0 ? 0
    : Math.round((roster.length / Math.max(data.activeMembers, 1)) * 100);
  const totalActivity = stats.speeches + stats.feedbacks;
  const progressPct = totalActivity === 0 ? 0
    : Math.round((stats.speeches / totalActivity) * 100);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Club Banner */}
        <View style={s.banner}>
          <View style={s.bannerTop}>
            <View style={s.bannerLeft}>
              <Text style={s.clubName}>{club?.name ?? 'Toastmasters'}</Text>
              <Text style={s.clubTagline}>Excellence in Communication</Text>
              <View style={s.rolePill}>
                <Text style={s.rolePillText}>{CLUB_ROLE_LABELS[clubRole]?.toUpperCase() ?? 'MEMBER'}</Text>
              </View>
            </View>
            <TouchableOpacity style={s.bellBtn} onPress={() => {}}>
              <Feather name="bell" size={20} color="#8B1A1A" />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={s.loadingBox}><ActivityIndicator color="#8B1A1A" size="large" /></View>
        ) : (
          <>
            {/* Stats Row */}
            <View style={s.statsRow}>
              <StatBox label="Upcoming" value={upcoming.length.toString()} sub="Meetings" />
              <StatBox label="Active" value={activeMembers.toString()} sub="Members" />
              <StatBox label="Roles" value={rolesFilled.toString()} sub="Filled" />
              <StatBox label="Engagement" value={`${engagementPct}%`} sub="Rate" />
            </View>

            {/* Motivational Banner */}
            <View style={s.motiveBanner}>
              <View style={s.motiveLeft}>
                <Text style={s.motiveTitle}>Keep Growing!</Text>
                <Text style={s.motiveSub}>You're on track with your speaking goals.</Text>
              </View>
              <TouchableOpacity style={s.motiveBtn} onPress={() => router.push('/(member)/meetings')}>
                <Text style={s.motiveBtnText}>View All</Text>
              </TouchableOpacity>
            </View>

            {/* Next Meeting Card */}
            {nextMeeting ? (() => {
              const p = dateparts(nextMeeting.scheduled_at);
              const presidentName = nextMeeting.president_id ? memberMap.get(nextMeeting.president_id) : undefined;
              const saaName = nextMeeting.saa_id ? memberMap.get(nextMeeting.saa_id) : undefined;
              return (
                <TouchableOpacity
                  style={s.nextCard}
                  onPress={() => router.push(`/(member)/meeting/${nextMeeting.id}` as any)}
                  activeOpacity={0.85}
                >
                  {/* Left: date column */}
                  <View style={s.nmLeft}>
                    <View style={s.nmCalIcon}>
                      <Feather name="calendar" size={20} color="#8B1A1A" />
                    </View>
                    <Text style={s.nmDay}>{p.day}</Text>
                    <Text style={s.nmDateNum}>{p.date}</Text>
                    <Text style={s.nmMonth}>{p.month}</Text>
                  </View>

                  <View style={s.nmDivider} />

                  {/* Right: details */}
                  <View style={s.nmRight}>
                    <Text style={s.nmTitle} numberOfLines={1}>{nextMeeting.title}</Text>
                    <View style={s.nmMetaRow}>
                      <Feather name="clock" size={12} color="#6b7280" />
                      <Text style={s.nmMetaText}>{p.time}</Text>
                      {nextMeeting.venue ? (
                        <>
                          <Text style={s.nmMetaDot}>·</Text>
                          <Feather name="map-pin" size={12} color="#6b7280" />
                          <Text style={s.nmMetaText} numberOfLines={1}>{nextMeeting.venue}</Text>
                        </>
                      ) : null}
                    </View>
                    {presidentName ? (
                      <View style={s.nmRoleRow}>
                        <Text style={s.nmRoleEmoji}>👑</Text>
                        <Text style={s.nmRoleLabel}>President: </Text>
                        <Text style={s.nmRoleName}>{presidentName}</Text>
                      </View>
                    ) : null}
                    {saaName ? (
                      <View style={s.nmRoleRow}>
                        <Text style={s.nmRoleEmoji}>🛡️</Text>
                        <Text style={s.nmRoleLabel}>SAA: </Text>
                        <Text style={s.nmRoleName}>{saaName}</Text>
                      </View>
                    ) : null}
                  </View>

                  <Feather name="chevron-right" size={18} color="#9ca3af" />
                </TouchableOpacity>
              );
            })() : (
              <View style={s.noMeetingCard}>
                <Feather name="calendar" size={28} color="#d1d5db" />
                <Text style={s.noMeetingText}>No upcoming meeting scheduled</Text>
              </View>
            )}

            {/* My Roles & Applications — commented out for now
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>My Roles & Applications</Text>
              <TouchableOpacity onPress={() => nextMeeting && router.push(`/(member)/meeting/${nextMeeting.id}` as any)}>
                <Text style={s.sectionLink}>View All</Text>
              </TouchableOpacity>
            </View>

            <RoleScrollRow myRoles={myRoles} nextMeeting={nextMeeting} roster={roster} userEmail={userEmail} />
            */}

            {/* My Progress */}
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>My Progress</Text>
            </View>
            <View style={s.progressCard}>
              <View style={s.progressStat}>
                <Text style={s.progressLabel}>Speeches</Text>
                <Text style={s.progressNum}>{stats.speeches}</Text>
                <Text style={s.progressSub}>This Month</Text>
              </View>
              <View style={s.progressDivider} />
              <View style={s.progressStat}>
                <Text style={s.progressLabel}>Feedbacks</Text>
                <Text style={s.progressNum}>{stats.feedbacks}</Text>
                <Text style={s.progressSub}>This Month</Text>
              </View>
              <View style={s.progressDivider} />
              <View style={s.ringBox}>
                <ProgressRing percent={progressPct} />
                <Text style={s.ringPct}>{progressPct}%</Text>
              </View>
            </View>

            {/* Upcoming Schedule */}
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Upcoming Schedule</Text>
              <TouchableOpacity onPress={() => router.push('/(member)/meetings')}>
                <Text style={s.sectionLink}>See All</Text>
              </TouchableOpacity>
            </View>
            {upcoming.length === 0 ? (
              <View style={s.emptyCard}>
                <Text style={s.emptyText}>No upcoming meetings.</Text>
              </View>
            ) : (
              <View style={s.scheduleCard}>
                {upcoming.map((m, i) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[s.scheduleRow, i > 0 && s.scheduleRowBorder]}
                    onPress={() => router.push(`/(member)/meeting/${m.id}` as any)}
                    activeOpacity={0.7}
                  >
                    <View style={s.scheduleDateBox}>
                      <Text style={s.scheduleDateNum}>{new Date(m.scheduled_at).getDate()}</Text>
                      <Text style={s.scheduleDateMon}>
                        {new Date(m.scheduled_at).toLocaleDateString('en-IN', { month: 'short' })}
                      </Text>
                    </View>
                    <View style={s.scheduleInfo}>
                      <Text style={s.scheduleTitle} numberOfLines={1}>{m.title}</Text>
                      <Text style={s.scheduleDate}>{formatDateShort(m.scheduled_at)}</Text>
                    </View>
                    <View style={[s.statusBadge, { backgroundColor: STATUS_COLOR[m.status] + '22' }]}>
                      <Text style={[s.statusText, { color: STATUS_COLOR[m.status] }]}>
                        {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <View style={s.statBox}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statSub}>{sub}</Text>
    </View>
  );
}

function ProgressRing({ percent, size = 68 }: { percent: number; size?: number }) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(percent, 100) / 100) * circ;
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke="#f3f4f6" strokeWidth={stroke} fill="none" />
      <Circle
        cx={size / 2} cy={size / 2} r={r}
        stroke="#8B1A1A" strokeWidth={stroke} fill="none"
        strokeDasharray={`${circ}`} strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </Svg>
  );
}


type RoleCardState = 'assigned' | 'available' | 'taken';

const ROLE_DISPLAY = [
  { role: 'tmod',                label: 'TMOD',           icon: 'mic',          cardBg: '#f3f0ff', iconBg: '#ede9fe', iconColor: '#7c3aed' },
  { role: 'general_evaluator',   label: 'Gen. Evaluator', icon: 'check-circle', cardBg: '#e0f2fe', iconBg: '#bae6fd', iconColor: '#0284c7' },
  { role: 'ah_counter',          label: 'Ah Counter',     icon: 'hash',         cardBg: '#fff7ed', iconBg: '#fed7aa', iconColor: '#ea580c' },
  { role: 'timer',               label: 'Timer',          icon: 'clock',        cardBg: '#fffbeb', iconBg: '#fde68a', iconColor: '#d97706' },
  { role: 'grammarian',          label: 'Grammarian',     icon: 'book-open',    cardBg: '#f0fdf4', iconBg: '#bbf7d0', iconColor: '#16a34a' },
  { role: 'table_topics_master', label: 'Table Topics',   icon: 'list',         cardBg: '#f0fdfa', iconBg: '#99f6e4', iconColor: '#0d9488' },
  { role: 'speaker',             label: 'Speaker',        icon: 'volume-2',     cardBg: '#fff1f2', iconBg: '#fecdd3', iconColor: '#e11d48' },
  { role: 'evaluator',           label: 'Evaluator',      icon: 'user-check',   cardBg: '#eef2ff', iconBg: '#c7d2fe', iconColor: '#4338ca' },
] as const;

const ROLE_STATE_CFG: Record<RoleCardState, {
  cardBg: string; iconBg: string; iconColor: string;
  statusText: string; statusColor: string;
  cornerBg: string; cornerIcon: 'check' | 'plus';
}> = {
  assigned: {
    cardBg: '#f0fdf4', iconBg: '#dcfce7', iconColor: '#16a34a',
    statusText: 'You are assigned', statusColor: '#16a34a',
    cornerBg: '#16a34a', cornerIcon: 'check',
  },
  available: {
    cardBg: '#f5f3ff', iconBg: '#ede9fe', iconColor: '#7c3aed',
    statusText: 'Apply Now', statusColor: '#8B1A1A',
    cornerBg: '#8B1A1A', cornerIcon: 'plus',
  },
  taken: {
    cardBg: '#f9fafb', iconBg: '#f3f4f6', iconColor: '#9ca3af',
    statusText: 'Filled', statusColor: '#9ca3af',
    cornerBg: '#9ca3af', cornerIcon: 'check',
  },
};

// Non-singleton roles can always accept more applications
const NON_SINGLETON = new Set(['speaker', 'evaluator', 'table_topics_speaker', 'supporting_role']);

function RoleScrollRow({
  myRoles, nextMeeting, roster, userEmail,
}: {
  myRoles: MeetingRoleAssignment[];
  nextMeeting: Meeting | null;
  roster: MeetingRoleAssignment[];
  userEmail: string;
}) {
  if (!nextMeeting) {
    return (
      <View style={s.emptyCard}>
        <Text style={s.emptyText}>No upcoming meeting.</Text>
      </View>
    );
  }

  const myRoleKeys = new Set(myRoles.map(r => r.role));
  const takenByOthers = new Set(
    roster.filter(r => r.member_email && r.member_email !== userEmail).map(r => r.role)
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.roleScroll}
    >
      {ROLE_DISPLAY.map(({ role, label, icon, cardBg, iconBg, iconColor }) => {
        let state: RoleCardState = 'available';
        if (myRoleKeys.has(role as any)) {
          state = 'assigned';
        } else if (!NON_SINGLETON.has(role) && takenByOthers.has(role as any)) {
          state = 'taken';
        }

        const cfg = ROLE_STATE_CFG[state];

        return (
          <TouchableOpacity
            key={role}
            style={[s.roleCard, { backgroundColor: cardBg }]}
            onPress={() => state !== 'taken' && router.push(`/(member)/meeting/${nextMeeting.id}` as any)}
            activeOpacity={state === 'taken' ? 1 : 0.8}
          >
            {/* Role icon circle */}
            <View style={[s.roleIconCircle, { backgroundColor: iconBg }]}>
              <Feather name={icon as any} size={26} color={iconColor} />
            </View>

            <Text style={s.roleCardLabel} numberOfLines={1}>{label}</Text>
            <Text style={[s.roleCardStatus, { color: cfg.statusColor }]} numberOfLines={2}>
              {cfg.statusText}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f4f8' },
  scroll: { paddingBottom: 32 },
  loadingBox: { paddingVertical: 80, alignItems: 'center' },

  // Banner
  banner: {
    backgroundColor: '#fdf2f2', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20,
    borderBottomWidth: 1, borderBottomColor: '#f5e0e0',
  },
  bannerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bannerLeft: { flex: 1 },
  clubName: { fontSize: 22, fontWeight: '800', color: '#1a1a2e', letterSpacing: 0.3 },
  clubTagline: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  rolePill: {
    alignSelf: 'flex-start', marginTop: 10,
    backgroundColor: 'rgba(139,26,26,0.08)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(139,26,26,0.2)',
  },
  rolePillText: { fontSize: 10, fontWeight: '700', color: '#8B1A1A', letterSpacing: 1 },
  bellBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(139,26,26,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Stats
  statsRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    marginHorizontal: 16, marginTop: 16,
    borderRadius: 16, paddingVertical: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 11, fontWeight: '600', color: '#374151', marginTop: 2 },
  statSub: { fontSize: 10, color: '#9ca3af' },

  // Motive Banner
  motiveBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 16, marginTop: 16,
    padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  motiveLeft: { flex: 1, marginRight: 12 },
  motiveTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  motiveSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  motiveBtn: {
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1.5, borderColor: '#8B1A1A',
  },
  motiveBtnText: { color: '#8B1A1A', fontWeight: '700', fontSize: 13 },

  // Next Meeting Card
  nextCard: {
    backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16, marginTop: 16,
    padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  nmLeft: { alignItems: 'center', width: 52 },
  nmCalIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  nmDay: { fontSize: 10, fontWeight: '600', color: '#6b7280', letterSpacing: 0.5 },
  nmDateNum: { fontSize: 22, fontWeight: '800', color: '#111827', lineHeight: 26 },
  nmMonth: { fontSize: 10, fontWeight: '700', color: '#6b7280', letterSpacing: 0.8 },
  nmDivider: { width: 1, alignSelf: 'stretch', backgroundColor: '#f3f4f6', marginVertical: 2 },
  nmRight: { flex: 1 },
  nmTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 6 },
  nmMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 6 },
  nmMetaDot: { fontSize: 12, color: '#d1d5db' },
  nmMetaText: { fontSize: 12, color: '#6b7280' },
  nmRoleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  nmRoleEmoji: { fontSize: 13 },
  nmRoleLabel: { fontSize: 12, color: '#6b7280' },
  nmRoleName: { fontSize: 12, fontWeight: '600', color: '#374151' },
  noMeetingCard: {
    backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16, marginTop: 16,
    paddingVertical: 32, alignItems: 'center', gap: 10,
  },
  noMeetingText: { fontSize: 14, color: '#9ca3af' },

  // Section
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 16, marginTop: 20, marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  sectionLink: { fontSize: 13, color: '#8B1A1A', fontWeight: '600' },

  // Role Scroll
  roleScroll: { paddingHorizontal: 16, paddingBottom: 4 },
  roleCard: {
    width: 112, borderRadius: 16, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 14,
    marginRight: 10, alignItems: 'center', position: 'relative',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  roleIconCircle: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 8, marginBottom: 10,
  },
  roleCardLabel: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 4, textAlign: 'center' },
  roleCardStatus: { fontSize: 11, fontWeight: '600', textAlign: 'center', lineHeight: 14 },

  // Progress
  progressCard: {
    backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', paddingVertical: 20, paddingHorizontal: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  progressStat: { flex: 1, alignItems: 'center' },
  progressLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 4 },
  progressNum: { fontSize: 28, fontWeight: '800', color: '#111827' },
  progressSub: { fontSize: 11, color: '#9ca3af', marginTop: 3 },
  progressDivider: { width: 1, height: 52, backgroundColor: '#f3f4f6' },
  ringBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ringPct: { position: 'absolute', fontSize: 14, fontWeight: '800', color: '#111827' },

  // Schedule
  scheduleCard: {
    backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  scheduleRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12,
  },
  scheduleRowBorder: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  scheduleDateBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center',
  },
  scheduleDateNum: { fontSize: 16, fontWeight: '800', color: '#8B1A1A' },
  scheduleDateMon: { fontSize: 9, fontWeight: '600', color: '#8B1A1A', letterSpacing: 0.5 },
  scheduleInfo: { flex: 1 },
  scheduleTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  scheduleDate: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '600' },

  emptyCard: {
    backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16,
    paddingVertical: 24, alignItems: 'center',
  },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
});
