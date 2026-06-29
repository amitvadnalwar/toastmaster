import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAuthStore } from '@/store';
import { getMeetingRoster } from '@/services/meetingService';
import type { MeetingWithRoster, MeetingRole } from '@/types';
import { SINGLETON_ROLES, ROLE_LABELS } from '@/types';

const STATUS_CFG = {
  draft:     { label: 'Draft',     bg: '#f3f4f6', color: '#6b7280' },
  published: { label: 'Published', bg: '#dcfce7', color: '#16a34a' },
  completed: { label: 'Completed', bg: '#f3f4f6', color: '#374151' },
};

const ROLE_ICON: Record<string, string> = {
  tmod: 'mic', timer: 'clock', general_evaluator: 'star',
  grammarian: 'book-open', ah_counter: 'volume-2',
  table_topics_master: 'users', speaker: 'mic', evaluator: 'message-square',
};
const ROLE_ICON_COLOR: Record<string, string> = {
  tmod: '#16a34a', timer: '#f97316', general_evaluator: '#ca8a04',
  grammarian: '#db2777', ah_counter: '#22c55e',
  table_topics_master: '#3b82f6', speaker: '#3b82f6', evaluator: '#8b5cf6',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ── Roster row (read-only) ─────────────────────────────────────────────────

function RosterRow({ role, name, isMe }: { role: MeetingRole | string; name: string | null | undefined; isMe: boolean }) {
  const icon = (ROLE_ICON[role] ?? 'user') as any;
  const iconColor = ROLE_ICON_COLOR[role] ?? '#6b7280';
  const filled = !!name;

  return (
    <View style={s.rosterRow}>
      <Feather name={icon} size={14} color={filled ? iconColor : '#d1d5db'} style={{ width: 18 }} />
      <Text style={s.rosterRole}>{ROLE_LABELS[role as MeetingRole] ?? role}</Text>
      {filled ? (
        <Text style={[s.rosterName, isMe && s.rosterNameMe]} numberOfLines={1}>
          {isMe ? 'You' : name}
        </Text>
      ) : (
        <Text style={s.rosterOpen}>Open</Text>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────

function isMeetingDay(scheduledAt: string): boolean {
  const now = new Date();
  const meeting = new Date(scheduledAt);
  return (
    now.getFullYear() === meeting.getFullYear() &&
    now.getMonth() === meeting.getMonth() &&
    now.getDate() === meeting.getDate()
  );
}

export default function MeetingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
    } catch { } finally { setFetching(false); }
  }, [session, id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (fetching) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}><Text style={s.backText}>‹ Back</Text></TouchableOpacity>
          <Text style={s.headerTitle}>Meeting Details</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={s.loadingBox}><ActivityIndicator color="#8B1A1A" size="large" /></View>
      </SafeAreaView>
    );
  }

  if (!data) return null;

  const { meeting, roster } = data;
  const status = STATUS_CFG[meeting.status];
  const isPublished = meeting.status === 'published';
  const canScan = isPublished;
  const speakers = roster.filter(r => r.role === 'speaker');
  const evaluators = roster.filter(r => r.role === 'evaluator');
  const myAssignment = roster.find(r => r.member_email === myEmail);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>Meeting Details</Text>
        <TouchableOpacity
          style={[s.qrBtn, !canScan && s.qrBtnDisabled]}
          onPress={() => canScan && router.push('/(member)/scan' as any)}
          disabled={!canScan}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="maximize" size={20} color={canScan ? '#8B1A1A' : '#d1d5db'} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Meeting info */}
        <View style={s.infoCard}>
          <View style={s.infoCardTop}>
            <Text style={s.meetingTitle} numberOfLines={2}>{meeting.title}</Text>
            <View style={[s.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[s.statusBadgeText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
          <View style={s.metaRow}>
            <Feather name="calendar" size={13} color="#6b7280" />
            <Text style={s.metaText}>{formatDate(meeting.scheduled_at)}</Text>
            <Text style={s.metaDot}>·</Text>
            <Text style={s.metaText}>{formatTime(meeting.scheduled_at)}</Text>
          </View>
          {meeting.venue ? (
            <View style={s.metaRow}>
              <Feather name="map-pin" size={13} color="#6b7280" />
              <Text style={s.metaText}>{meeting.venue}</Text>
            </View>
          ) : null}
          {meeting.theme ? (
            <View style={s.metaRow}>
              <Feather name="star" size={13} color="#6b7280" />
              <Text style={s.metaText}>Theme: {meeting.theme}</Text>
            </View>
          ) : null}
        </View>

        {/* My role (if enrolled) */}
        {myAssignment && (
          <View style={s.myRoleCard}>
            <View style={s.myRoleLeft}>
              <Text style={s.myRoleLabel}>Your Role</Text>
              <Text style={s.myRoleName}>{ROLE_LABELS[myAssignment.role] ?? myAssignment.role}</Text>
              {myAssignment.speech_duration ? (
                <Text style={s.myRoleMeta}>{myAssignment.speech_duration}</Text>
              ) : null}
            </View>
            <View style={s.assignedPill}>
              <Text style={s.assignedPillText}>Assigned</Text>
            </View>
          </View>
        )}

        {/* Role players roster */}
        <Text style={s.sectionTitle}>Role Players</Text>
        <View style={s.rosterCard}>
          {SINGLETON_ROLES.map((role, i) => {
            const a = roster.find(r => r.role === role);
            return (
              <View key={role}>
                {i > 0 && <View style={s.divider} />}
                <RosterRow role={role} name={a?.member_name} isMe={a?.member_email === myEmail} />
              </View>
            );
          })}
        </View>

        {/* Speakers */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Speakers</Text>
          <Text style={s.sectionCount}>{speakers.length} / {meeting.max_speakers}</Text>
        </View>
        <View style={s.rosterCard}>
          {speakers.length === 0 ? (
            <View style={s.emptyRow}><Text style={s.emptyRowText}>No speakers enrolled yet</Text></View>
          ) : (
            speakers.map((sp, i) => (
              <View key={sp.id}>
                {i > 0 && <View style={s.divider} />}
                <RosterRow role="speaker" name={sp.member_name} isMe={sp.member_email === myEmail} />
              </View>
            ))
          )}
        </View>

        {/* Evaluators */}
        {speakers.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Evaluators</Text>
            <View style={s.rosterCard}>
              {speakers.map((sp, i) => {
                const ev = evaluators.find(e => e.evaluates_member_id === sp.member_id);
                return (
                  <View key={`ev-${sp.id}`}>
                    {i > 0 && <View style={s.divider} />}
                    <View style={s.rosterRow}>
                      <Feather name="message-square" size={14} color={ev ? '#8b5cf6' : '#d1d5db'} style={{ width: 18 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.rosterRole}>Evaluator</Text>
                        <Text style={s.rosterSub}>For {sp.member_name ?? '—'}</Text>
                      </View>
                      {ev ? (
                        <Text style={[s.rosterName, ev.member_email === myEmail && s.rosterNameMe]} numberOfLines={1}>
                          {ev.member_email === myEmail ? 'You' : ev.member_name ?? '—'}
                        </Text>
                      ) : (
                        <Text style={s.rosterOpen}>Open</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

      </ScrollView>

      {/* Apply for Role CTA */}
      {isPublished && (
        <View style={s.ctaBar}>
          <TouchableOpacity
            style={s.ctaBtn}
            onPress={() => router.push(`/(member)/apply-role/${id}` as any)}
          >
            <Text style={s.ctaBtnText}>Apply for a Role</Text>
            <Feather name="arrow-right" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  backText: { fontSize: 16, color: '#8B1A1A', fontWeight: '600', width: 60 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827', flex: 1, textAlign: 'center' },
  qrBtn: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff5f5' },
  qrBtnDisabled: { backgroundColor: '#f9fafb' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 32 },

  // Info card
  infoCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  infoCardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 },
  meetingTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#111827' },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  metaText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  metaDot: { fontSize: 13, color: '#d1d5db' },

  // My role card
  myRoleCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f0fdf4', borderRadius: 14, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  myRoleLeft: { flex: 1 },
  myRoleLabel: { fontSize: 11, fontWeight: '600', color: '#16a34a', letterSpacing: 0.6, marginBottom: 2 },
  myRoleName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  myRoleMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  assignedPill: { backgroundColor: '#dcfce7', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  assignedPillText: { fontSize: 12, fontWeight: '700', color: '#16a34a' },

  // Section headers
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 10 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionCount: { fontSize: 12, fontWeight: '600', color: '#9ca3af' },

  // Roster card
  rosterCard: {
    backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    marginBottom: 20,
  },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 14 },
  rosterRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 10 },
  rosterRole: { flex: 1, fontSize: 14, fontWeight: '600', color: '#374151' },
  rosterSub: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  rosterName: { fontSize: 13, color: '#111827', fontWeight: '600', maxWidth: 130 },
  rosterNameMe: { color: '#16a34a' },
  rosterOpen: { fontSize: 12, color: '#d1d5db', fontWeight: '500' },
  emptyRow: { paddingVertical: 20, alignItems: 'center' },
  emptyRowText: { fontSize: 13, color: '#9ca3af' },

  // CTA bar
  ctaBar: {
    padding: 16, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#f3f4f6',
  },
  ctaBtn: {
    backgroundColor: '#8B1A1A', borderRadius: 12, paddingVertical: 15,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  ctaBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
