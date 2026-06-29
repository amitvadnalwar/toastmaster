import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import { useAuthStore } from '@/store';
import { getAllMeetings, getMeetingRoster } from '@/services/meetingService';
import { getAllMembers, getMe } from '@/services/memberService';
import { getClub } from '@/services/clubService';
import type { Meeting, MeetingRoleAssignment, Club } from '@/types';
import { ROLE_LABELS } from '@/types/meeting';

const STATUS_COLOR: Record<string, string> = {
  draft: '#f59e0b', published: '#10b981', completed: '#6b7280',
};

const CLUB_ROLE_LABELS: Record<string, string> = {
  member: 'Member', president: 'President', vp_education: 'VP Education',
  vp_membership: 'VP Membership', vp_pr: 'VP PR', secretary: 'Secretary',
  treasurer: 'Treasurer', saa: 'SAA', admin: 'Admin', super_admin: 'Super Admin',
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
  activeMembers: number;
  totalMeetings: number;
  rolesFilled: number;
  engagementPct: number;
  memberMap: Map<string, string>;
  clubRole: string;
}

export default function AdminHomeScreen() {
  const { session, appRole } = useAuthStore();
  const userName = session?.user?.user_metadata?.full_name
    ?? session?.user?.email?.split('@')[0]
    ?? 'Admin';
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
      .filter(m => m.status === 'published' && new Date(m.scheduled_at) >= now)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    const nextMeeting = future[0] ?? null;

    let roster: MeetingRoleAssignment[] = [];
    if (nextMeeting) {
      try {
        const result = await getMeetingRoster(nextMeeting.id, token);
        roster = result.roster;
      } catch { /* stays empty */ }
    }

    const activeMembers = members.filter(m => m.is_active).length;
    const rolesFilled = roster.length;
    const engagementPct = activeMembers === 0 ? 0
      : Math.round((rolesFilled / Math.max(activeMembers, 1)) * 100);

    const memberMap = new Map(members.map(m => [m.id, m.name]));

    setData({
      club, nextMeeting, roster, upcoming: future.slice(0, 5),
      activeMembers, totalMeetings: future.length, rolesFilled, engagementPct, memberMap, clubRole,
    });
    setLoading(false);
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const { club, nextMeeting, roster, upcoming, memberMap, clubRole } = data;

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
              <StatBox label="Upcoming" value={data.totalMeetings.toString()} sub="Meetings" />
              <StatBox label="Active" value={data.activeMembers.toString()} sub="Members" />
              <StatBox label="Roles" value={data.rolesFilled.toString()} sub="Filled" />
              <StatBox label="Engagement" value={`${data.engagementPct}%`} sub="Rate" />
            </View>

            {/* Quick Action Banner */}
            <View style={s.motiveBanner}>
              <View style={s.motiveLeft}>
                <Text style={s.motiveTitle}>Manage your club</Text>
                <Text style={s.motiveSub}>Create meetings, assign roles, track progress.</Text>
              </View>
              <TouchableOpacity style={s.motiveBtn} onPress={() => router.push('/(admin)/meeting/new' as any)}>
                <Text style={s.motiveBtnText}>+ New</Text>
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
                  onPress={() => router.push(`/(admin)/meeting/${nextMeeting.id}` as any)}
                  activeOpacity={0.85}
                >
                  <View style={s.nmLeft}>
                    <View style={s.nmCalIcon}>
                      <Feather name="calendar" size={20} color="#8B1A1A" />
                    </View>
                    <Text style={s.nmDay}>{p.day}</Text>
                    <Text style={s.nmDateNum}>{p.date}</Text>
                    <Text style={s.nmMonth}>{p.month}</Text>
                  </View>

                  <View style={s.nmDivider} />

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
              <TouchableOpacity
                style={s.noMeetingCard}
                onPress={() => router.push('/(admin)/meeting/new' as any)}
                activeOpacity={0.8}
              >
                <Feather name="plus-circle" size={28} color="#8B1A1A" />
                <Text style={s.noMeetingText}>No upcoming meeting — tap to create one</Text>
              </TouchableOpacity>
            )}

            {/* Roster Fill Status */}
            {nextMeeting && (
              <>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>Roster Status</Text>
                  <TouchableOpacity onPress={() => router.push(`/(admin)/meeting/${nextMeeting.id}` as any)}>
                    <Text style={s.sectionLink}>Manage</Text>
                  </TouchableOpacity>
                </View>
                <RosterStatusCard roster={roster} nextMeeting={nextMeeting} />
              </>
            )}

            {/* Upcoming Schedule */}
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Upcoming Schedule</Text>
              <TouchableOpacity onPress={() => router.push('/(admin)/meetings' as any)}>
                <Text style={s.sectionLink}>See All</Text>
              </TouchableOpacity>
            </View>
            {upcoming.length === 0 ? (
              <View style={s.emptyCard}>
                <Text style={s.emptyText}>No upcoming meetings. Create one to get started.</Text>
              </View>
            ) : (
              <View style={s.scheduleCard}>
                {upcoming.map((m, i) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[s.scheduleRow, i > 0 && s.scheduleRowBorder]}
                    onPress={() => router.push(`/(admin)/meeting/${m.id}` as any)}
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

function RosterPreviewRow({ roster }: { roster: MeetingRoleAssignment[] }) {
  const filled = roster.slice(0, 4);
  if (filled.length === 0) return null;
  return (
    <View style={s.presRow}>
      {filled.map(r => (
        <View key={r.id} style={s.presItem}>
          <View style={s.presAvatar}>
            <Text style={s.presAvatarText}>{initials(r.member_name)}</Text>
          </View>
          <View>
            <Text style={s.presRole}>{(ROLE_LABELS[r.role] ?? r.role).slice(0, 8).toUpperCase()}</Text>
            <Text style={s.presName}>{r.member_name?.split(' ')[0] ?? '—'}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const SINGLETON_ROLE_NAMES = ['tmod', 'general_evaluator', 'ah_counter', 'timer', 'grammarian', 'table_topics_master'];

function RosterStatusCard({ roster, nextMeeting }: { roster: MeetingRoleAssignment[]; nextMeeting: Meeting }) {
  const filledRoles = new Set(roster.map(r => r.role));
  const total = SINGLETON_ROLE_NAMES.length;
  const filled = SINGLETON_ROLE_NAMES.filter(r => filledRoles.has(r as any)).length;
  const pct = Math.round((filled / total) * 100);

  return (
    <View style={s.rosterCard}>
      <View style={s.rosterHeader}>
        <Text style={s.rosterFillText}>{filled}/{total} key roles filled</Text>
        <Text style={s.rosterPct}>{pct}%</Text>
      </View>
      <View style={s.rosterBar}>
        <View style={[s.rosterBarFill, { width: `${pct}%` as any }]} />
      </View>
      <View style={s.rosterPills}>
        {SINGLETON_ROLE_NAMES.map(role => (
          <View
            key={role}
            style={[s.rosterPill, filledRoles.has(role as any) ? s.rosterPillFilled : s.rosterPillEmpty]}
          >
            <Text style={[s.rosterPillText, filledRoles.has(role as any) ? s.rosterPillTextFilled : s.rosterPillTextEmpty]}>
              {(ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role).split(' ').map(w => w[0]).join('')}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f4f8' },
  scroll: { paddingBottom: 32 },
  loadingBox: { paddingVertical: 80, alignItems: 'center' },

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
    backgroundColor: '#8B1A1A', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
  },
  motiveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

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
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  noMeetingText: { fontSize: 14, color: '#6b7280' },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 16, marginTop: 20, marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  sectionLink: { fontSize: 13, color: '#8B1A1A', fontWeight: '600' },

  // Roster Status
  rosterCard: {
    backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  rosterHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  rosterFillText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  rosterPct: { fontSize: 14, fontWeight: '700', color: '#8B1A1A' },
  rosterBar: {
    height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden', marginBottom: 12,
  },
  rosterBarFill: { height: 6, backgroundColor: '#8B1A1A', borderRadius: 3 },
  rosterPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rosterPill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  rosterPillFilled: { backgroundColor: '#dcfce7' },
  rosterPillEmpty: { backgroundColor: '#f3f4f6' },
  rosterPillText: { fontSize: 11, fontWeight: '700' },
  rosterPillTextFilled: { color: '#16a34a' },
  rosterPillTextEmpty: { color: '#9ca3af' },

  // Schedule
  scheduleCard: {
    backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
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
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 20 },
});
