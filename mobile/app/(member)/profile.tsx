import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAuthStore } from '@/store';
import { supabase } from '@/lib/supabase';
import { getMe } from '@/services/memberService';
import type { Member } from '@/types';

const CLUB_ROLE_LABELS: Record<string, string> = {
  member: 'Member', president: 'President', vp_education: 'VP Education',
  vp_membership: 'VP Membership', vp_pr: 'VP PR', secretary: 'Secretary',
  treasurer: 'Treasurer', saa: 'SAA',
};

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || '—'}</Text>
    </View>
  );
}

export default function MemberProfileScreen() {
  const { session } = useAuthStore();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      const data = await getMe(session.access_token);
      setMember(data);
    } catch {
      // silently show empty
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {loading ? (
        <View style={styles.loadingBox}><ActivityIndicator color="#8B1A1A" size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>

          {/* Avatar */}
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{member ? initials(member.name) : '?'}</Text>
            </View>
            <Text style={styles.profileName}>{member?.name ?? '—'}</Text>
            <Text style={styles.profileRole}>
              {member ? CLUB_ROLE_LABELS[member.club_role] : ''}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>DETAILS</Text>
          <View style={styles.card}>
            <DetailRow label="Email" value={member?.email ?? ''} />
            <View style={styles.divider} />
            <DetailRow label="Phone" value={member?.phone ?? ''} />
            <View style={styles.divider} />
            <DetailRow label="Birthday" value={member?.birthday ?? ''} />
            <View style={styles.divider} />
            <DetailRow label="Club Role" value={member ? CLUB_ROLE_LABELS[member.club_role] : ''} />
            <View style={styles.divider} />
            <DetailRow label="Member Since" value={member ? formatDate(member.created_at) : ''} />
          </View>

          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>

        </ScrollView>
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
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 },

  profileCard: { alignItems: 'center', marginBottom: 28 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#8B1A1A', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  profileName: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  profileRole: { fontSize: 13, color: '#6b7280', fontWeight: '500' },

  sectionTitle: {
    fontSize: 11, fontWeight: '600', color: '#6b7280',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1, marginBottom: 32,
  },
  detailRow: {
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16,
  },
  detailLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  detailValue: { fontSize: 14, color: '#111827', fontWeight: '500', textAlign: 'right', flex: 1 },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 16 },
  signOutBtn: {
    borderWidth: 1, borderColor: '#fca5a5', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', backgroundColor: '#fff',
  },
  signOutText: { fontSize: 15, fontWeight: '600', color: '#ef4444' },
});
