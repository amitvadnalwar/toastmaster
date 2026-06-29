import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import { useAuthStore } from '@/store';
import { getAllMeetings } from '@/services/meetingService';
import type { Meeting, MeetingStatus } from '@/types';

const STATUS_BADGE: Record<MeetingStatus, { label: string; bg: string; color: string }> = {
  draft:     { label: 'Scheduled', bg: '#f3f4f6',  color: '#6b7280' },
  published: { label: 'Published', bg: '#dcfce7',  color: '#16a34a' },
  completed: { label: 'Completed', bg: '#f3f4f6',  color: '#6b7280' },
};

function getAppStatus(meeting: Meeting): { text: string; color: string } {
  if (meeting.status === 'published') return { text: 'Application window open', color: '#16a34a' };
  if (meeting.status === 'draft')     return { text: 'Application not opened yet', color: '#9ca3af' };
  if (meeting.status === 'completed') return { text: 'Meeting completed', color: '#9ca3af' };
  return { text: '', color: '#9ca3af' };
}

function formatDateLong(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export default function MemberMeetingsScreen() {
  const { session } = useAuthStore();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      const all = await getAllMeetings(session.access_token);
      const visible = all.filter(m => m.status === 'published' || m.status === 'completed' || m.status === 'draft');
      const now = new Date();
      const upcoming = visible
        .filter(m => m.status !== 'completed')
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
      const past = visible
        .filter(m => m.status === 'completed')
        .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
      setMeetings([...upcoming, ...past]);
    } catch {
      // silently show empty
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Meetings</Text>
      </View>

      {loading ? (
        <View style={s.loadingBox}><ActivityIndicator color="#8B1A1A" size="large" /></View>
      ) : meetings.length === 0 ? (
        <View style={s.emptyBox}>
          <Feather name="calendar" size={36} color="#d1d5db" />
          <Text style={s.emptyText}>No meetings available.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {meetings.map(m => <MeetingCard key={m.id} meeting={m} />)}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function MeetingCard({ meeting }: { meeting: Meeting }) {
  const badge = STATUS_BADGE[meeting.status];
  const appStatus = getAppStatus(meeting);
  const isCompleted = meeting.status === 'completed';

  return (
    <TouchableOpacity
      style={[s.card, isCompleted && s.cardDim]}
      onPress={() => router.push(`/(member)/meeting/${meeting.id}` as any)}
      activeOpacity={0.75}
    >
      {/* Title + status badge */}
      <View style={s.cardHeader}>
        <Text style={s.cardTitle} numberOfLines={1}>{meeting.title}</Text>
        <View style={[s.badge, { backgroundColor: badge.bg }]}>
          <Text style={[s.badgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>

      {/* Date · Time */}
      <View style={s.metaRow}>
        <Text style={s.dateText}>{formatDateLong(meeting.scheduled_at)}</Text>
        <View style={s.timeChip}>
          <Feather name="clock" size={11} color="#9ca3af" />
          <Text style={s.timeText}>{formatTime(meeting.scheduled_at)}</Text>
        </View>
      </View>

      {/* Venue */}
      {meeting.venue ? (
        <View style={s.venueRow}>
          <Feather name="map-pin" size={12} color="#9ca3af" />
          <Text style={s.venueText}>{meeting.venue}</Text>
        </View>
      ) : null}

      {/* Application status + inline Apply button */}
      {appStatus.text ? (
        <View style={s.appRow}>
          <Text style={[s.appStatus, { color: appStatus.color }]}>{appStatus.text}</Text>
          {meeting.status === 'published' && (
            <TouchableOpacity
              style={s.applyBtn}
              onPress={() => router.push(`/(member)/apply-role/${meeting.id}` as any)}
              activeOpacity={0.8}
            >
              <Text style={s.applyBtnText}>Apply</Text>
              <Feather name="arrow-right" size={11} color="#8B1A1A" />
            </TouchableOpacity>
          )}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f4f8' },
  header: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 14, color: '#9ca3af' },
  scroll: { padding: 16, gap: 12 },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardDim: { opacity: 0.75 },

  cardHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', gap: 10, marginBottom: 8,
  },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: '#111827' },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 5 },
  dateText: { fontSize: 12, color: '#374151', fontWeight: '500' },
  timeChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 12, color: '#6b7280' },

  venueRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  venueText: { fontSize: 12, color: '#6b7280' },

  appRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  appStatus: { fontSize: 12, fontWeight: '600' },
  applyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fff5f5', borderRadius: 6, paddingVertical: 5, paddingHorizontal: 10,
    borderWidth: 1, borderColor: '#fca5a5',
  },
  applyBtnText: { fontSize: 12, fontWeight: '700', color: '#8B1A1A' },
});
