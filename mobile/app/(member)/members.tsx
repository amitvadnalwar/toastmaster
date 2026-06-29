import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAuthStore } from '@/store';
import { getClubMembers } from '@/services/memberService';

const CLUB_ROLE_LABELS: Record<string, string> = {
  member: 'Member', president: 'President', vp_education: 'VP Education',
  vp_membership: 'VP Membership', vp_pr: 'VP PR', secretary: 'Secretary',
  treasurer: 'Treasurer', saa: 'SAA',
};

type ClubMember = { id: string; name: string; club_role: string; app_role: string | null; is_active: boolean };

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function MemberMembersScreen() {
  const { session } = useAuthStore();
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      const data = await getClubMembers(session.access_token);
      setMembers(data);
    } catch {
      // silently show empty
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Members</Text>
        <Text style={styles.headerCount}>{members.length} members</Text>
      </View>

      {loading ? (
        <View style={styles.loadingBox}><ActivityIndicator color="#8B1A1A" size="large" /></View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={m => m.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item: m }) => (
            <View style={styles.row}>
              <View style={[styles.avatar, !m.is_active && styles.avatarInactive]}>
                <Text style={styles.avatarText}>{initials(m.name)}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{m.name}</Text>
                <Text style={styles.role}>{CLUB_ROLE_LABELS[m.club_role] ?? m.club_role}</Text>
              </View>
              {m.app_role === 'admin' || m.app_role === 'super_admin' ? (
                <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>Admin</Text>
                </View>
              ) : null}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No members found.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  headerCount: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },
  separator: { height: 1, backgroundColor: '#f3f4f6' },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    paddingVertical: 14, paddingHorizontal: 16, gap: 12,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#8B1A1A', alignItems: 'center', justifyContent: 'center',
  },
  avatarInactive: { backgroundColor: '#9ca3af' },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#111827' },
  role: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  adminBadge: {
    backgroundColor: '#fef2f2', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: '#fecaca',
  },
  adminBadgeText: { fontSize: 11, fontWeight: '600', color: '#8B1A1A' },
  emptyBox: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9ca3af' },
});
