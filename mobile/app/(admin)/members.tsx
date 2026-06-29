import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router, Redirect, useFocusEffect } from 'expo-router';
import { useAuthStore } from '@/store';
import { getAllMembers } from '@/services/memberService';
import type { Member, ClubRole } from '@/types';

const ROLE_LABEL: Partial<Record<ClubRole, string>> = {
  president: 'President',
  vp_education: 'VP Education',
  vp_membership: 'VP Membership',
  vp_pr: 'VP PR',
  secretary: 'Secretary',
  treasurer: 'Treasurer',
  saa: 'SAA',
};

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function statusDotColor(m: Member): string {
  if (!m.is_active) return '#9ca3af';       // grey  — inactive
  if (!m.is_confirmed) return '#f59e0b';    // yellow — invite pending
  return '#10b981';                          // green  — active
}

export default function MembersScreen() {
  const { appRole, session } = useAuthStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  if (appRole !== 'super_admin') {
    return <Redirect href="/access-denied" />;
  }

  const loadMembers = useCallback(async () => {
    if (!session) return;
    try {
      const data = await getAllMembers(session.access_token);
      setMembers(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(useCallback(() => { loadMembers(); }, [loadMembers]));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Members</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(admin)/member/new')}>
          <Feather name="user-plus" size={20} color="#8B1A1A" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#8B1A1A" />
          </View>
        ) : members.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No members yet</Text>
            <Text style={styles.emptyText}>Tap the icon above to add the first member.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.count}>{members.length} member{members.length !== 1 ? 's' : ''}</Text>
            {members.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[styles.memberRow, !m.is_active && styles.memberRowInactive]}
                onPress={() => router.push(`/(admin)/member/${m.id}`)}
                activeOpacity={0.7}
              >
                <View style={[styles.avatar, !m.is_active && styles.avatarInactive]}>
                  <Text style={styles.avatarText}>{initials(m.name)}</Text>
                </View>

                <View style={styles.memberInfo}>
                  <Text style={[styles.memberName, !m.is_active && styles.textMuted]}>
                    {m.name}
                  </Text>
                  <Text style={styles.memberEmail} numberOfLines={1}>{m.email}</Text>
                  {m.club_role !== 'member' && m.club_role !== 'guest' && (
                    <Text style={styles.roleLabel}>{ROLE_LABEL[m.club_role] ?? m.club_role}</Text>
                  )}
                </View>

                <View style={styles.rightCol}>
                  <View style={[styles.dot, { backgroundColor: statusDotColor(m) }]} />
                  <Feather name="chevron-right" size={16} color="#d1d5db" style={{ marginTop: 2 }} />
                </View>
              </TouchableOpacity>
            ))}

            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
                <Text style={styles.legendText}>Active</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: '#f59e0b' }]} />
                <Text style={styles.legendText}>Invite pending</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: '#9ca3af' }]} />
                <Text style={styles.legendText}>Inactive</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  backBtn: { width: 50 },
  backBtnText: { fontSize: 16, color: '#8B1A1A', fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827', flex: 1, textAlign: 'center' },
  addBtn: { width: 50, alignItems: 'flex-end' },
  loadingBox: { paddingTop: 60, alignItems: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 },
  count: { fontSize: 12, color: '#6b7280', marginBottom: 12, fontWeight: '500' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 14, padding: 32, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  memberRow: {
    backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  memberRowInactive: { opacity: 0.55 },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#8B1A1A', alignItems: 'center',
    justifyContent: 'center', marginRight: 12, flexShrink: 0,
  },
  avatarInactive: { backgroundColor: '#9ca3af' },
  avatarText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  memberInfo: { flex: 1, minWidth: 0 },
  memberName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 },
  textMuted: { color: '#6b7280' },
  memberEmail: { fontSize: 12, color: '#6b7280' },
  roleLabel: { fontSize: 11, color: '#8B1A1A', fontWeight: '600', marginTop: 3 },
  rightCol: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { fontSize: 11, color: '#9ca3af' },
});
