import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Link, router, useFocusEffect } from 'expo-router';
import { useAuthStore } from '@/store';
import { getAllMeetings } from '@/services/meetingService';
import type { Meeting, MeetingStatus } from '@/types';

const STATUS_COLOR: Record<MeetingStatus, string> = {
  draft: '#f59e0b', published: '#10b981', completed: '#6b7280',
};
const STATUS_LABEL: Record<MeetingStatus, string> = {
  draft: 'Draft', published: 'Published', completed: 'Completed',
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' · '
    + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function AdminMeetingsScreen() {
  const { session } = useAuthStore();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMeetings = useCallback(async () => {
    if (!session) return;
    try {
      const data = await getAllMeetings(session.access_token);
      setMeetings(data);
    } catch {
      // silently fail — empty state shown
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(useCallback(() => { loadMeetings(); }, [loadMeetings]));

  const upcomingMeetings = meetings.filter(m => m.status !== 'completed');
  const pastMeetings = meetings.filter(m => m.status === 'completed');

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Meetings</Text>
        <Link href="/(admin)/meeting/new" asChild>
          <TouchableOpacity style={s.createBtn}>
            <Feather name="plus" size={16} color="#fff" />
            <Text style={s.createBtnText}>New</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {loading ? (
        <View style={s.loadingBox}><ActivityIndicator color="#8B1A1A" size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll}>
          <Text style={s.sectionTitle}>UPCOMING</Text>
          {upcomingMeetings.length === 0 ? (
            <View style={s.emptyBox}>
              <Feather name="calendar" size={28} color="#d1d5db" />
              <Text style={s.emptyText}>No upcoming meetings.{'\n'}Tap "+ New" to create one.</Text>
            </View>
          ) : (
            upcomingMeetings.map(m => (
              <TouchableOpacity
                key={m.id}
                style={s.meetingRow}
                onPress={() => router.push(`/(admin)/meeting/${m.id}` as any)}
              >
                <View style={s.meetingLeft}>
                  <Text style={s.meetingTitle} numberOfLines={1}>{m.title}</Text>
                  <Text style={s.meetingDate}>{formatDateTime(m.scheduled_at)}</Text>
                </View>
                <View style={s.meetingRight}>
                  <View style={[s.statusBadge, { backgroundColor: STATUS_COLOR[m.status] + '22' }]}>
                    <Text style={[s.statusText, { color: STATUS_COLOR[m.status] }]}>
                      {STATUS_LABEL[m.status]}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color="#9ca3af" />
                </View>
              </TouchableOpacity>
            ))
          )}

          {pastMeetings.length > 0 && (
            <>
              <Text style={[s.sectionTitle, { marginTop: 24 }]}>PAST</Text>
              {pastMeetings.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[s.meetingRow, s.meetingRowPast]}
                  onPress={() => router.push(`/(admin)/meeting/${m.id}` as any)}
                >
                  <View style={s.meetingLeft}>
                    <Text style={[s.meetingTitle, { color: '#6b7280' }]} numberOfLines={1}>{m.title}</Text>
                    <Text style={s.meetingDate}>{formatDateTime(m.scheduled_at)}</Text>
                  </View>
                  <View style={s.meetingRight}>
                    <View style={[s.statusBadge, { backgroundColor: '#f3f4f6' }]}>
                      <Text style={[s.statusText, { color: '#6b7280' }]}>Completed</Text>
                    </View>
                    <Feather name="chevron-right" size={18} color="#9ca3af" />
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f4f8' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#8B1A1A', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  createBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },
  sectionTitle: {
    fontSize: 11, fontWeight: '600', color: '#6b7280',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10,
  },
  emptyBox: {
    backgroundColor: '#fff', borderRadius: 16, padding: 32,
    alignItems: 'center', gap: 10, marginBottom: 8,
  },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 20 },
  meetingRow: {
    backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  meetingRowPast: { opacity: 0.7 },
  meetingLeft: { flex: 1, marginRight: 12 },
  meetingRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meetingTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  meetingDate: { fontSize: 12, color: '#6b7280' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '600' },
});
