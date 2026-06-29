import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Link, router, useFocusEffect } from 'expo-router';
import { useAuthStore } from '@/store';
import { getAllMeetings } from '@/services/meetingService';
import type { Meeting, MeetingStatus } from '@/types';

const STATUS_COLOR: Record<MeetingStatus, string> = {
  draft: '#f59e0b',
  published: '#10b981',
  completed: '#6b7280',
};
const STATUS_LABEL: Record<MeetingStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  completed: 'Completed',
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' · '
    + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function AdminDashboardScreen() {
  const { appRole, session } = useAuthStore();
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <Text style={styles.headerSub}>{appRole === 'super_admin' ? 'Super Admin' : 'Admin'}</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/(admin)/profile')}>
            <Feather name="user" size={22} color="#8B1A1A" />
          </TouchableOpacity>
        </View>

        {/* Create meeting button */}
        <Link href="/(admin)/meeting/new" asChild>
          <TouchableOpacity style={styles.createBtn}>
            <Text style={styles.createBtnText}>+ New Meeting</Text>
          </TouchableOpacity>
        </Link>

        {/* Meetings list */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#8B1A1A" />
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>UPCOMING</Text>
            {upcomingMeetings.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No upcoming meetings. Tap "+ New Meeting" to create one.</Text>
              </View>
            ) : (
              upcomingMeetings.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={styles.meetingRow}
                  onPress={() => router.push(`/(admin)/meeting/${m.id}`)}
                >
                  <View style={styles.meetingRowLeft}>
                    <Text style={styles.meetingTitle} numberOfLines={1}>{m.title}</Text>
                    <Text style={styles.meetingDate}>{formatDateTime(m.scheduled_at)}</Text>
                  </View>
                  <View style={styles.meetingRowRight}>
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[m.status] + '22' }]}>
                      <Text style={[styles.statusText, { color: STATUS_COLOR[m.status] }]}>
                        {STATUS_LABEL[m.status]}
                      </Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}

            {pastMeetings.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>PAST</Text>
                {pastMeetings.map(m => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.meetingRow, styles.meetingRowPast]}
                    onPress={() => router.push(`/(admin)/meeting/${m.id}`)}
                  >
                    <View style={styles.meetingRowLeft}>
                      <Text style={[styles.meetingTitle, { color: '#6b7280' }]} numberOfLines={1}>{m.title}</Text>
                      <Text style={styles.meetingDate}>{formatDateTime(m.scheduled_at)}</Text>
                    </View>
                    <View style={styles.meetingRowRight}>
                      <View style={[styles.statusBadge, { backgroundColor: '#f3f4f6' }]}>
                        <Text style={[styles.statusText, { color: '#6b7280' }]}>Completed</Text>
                      </View>
                      <Text style={styles.chevron}>›</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </>
        )}

        {/* Management */}
        {appRole === 'super_admin' && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>MANAGEMENT</Text>
            <Link href="/(admin)/members" asChild>
              <TouchableOpacity style={styles.navRow}>
                <Text style={styles.navRowText}>Members &amp; Roles</Text>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            </Link>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  profileBtn: {
    padding: 8,
    borderRadius: 20,
  },
  createBtn: {
    backgroundColor: '#8B1A1A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  createBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  loadingBox: { paddingVertical: 40, alignItems: 'center' },
  emptyBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 20 },
  meetingRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  meetingRowPast: { opacity: 0.7 },
  meetingRowLeft: { flex: 1, marginRight: 12 },
  meetingRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meetingTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  meetingDate: { fontSize: 12, color: '#6b7280' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '600' },
  chevron: { fontSize: 20, color: '#9ca3af' },
  navRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  navRowText: { fontSize: 16, color: '#111827', fontWeight: '500' },
});