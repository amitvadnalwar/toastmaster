import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useAuthStore } from '@/store';
import { supabase } from '@/lib/supabase';
import { getMe } from '@/services/memberService';
import type { Member } from '@/types';

const CLUB_ROLE_LABELS: Record<string, string> = {
  member: 'Member',
  guest: 'Guest',
  president: 'President',
  vp_education: 'VP Education',
  vp_membership: 'VP Membership',
  vp_pr: 'VP PR',
  secretary: 'Secretary',
  treasurer: 'Treasurer',
  saa: 'SAA',
};

const APP_ROLE_LABELS: Record<string, string> = {
  member: 'Member',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export default function ProfileScreen() {
  const { session } = useAuthStore();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      const data = await getMe(session.access_token);
      setMember(data);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => supabase.auth.signOut(),
      },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#8B1A1A" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Avatar */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {member
                ? member.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
                : '?'}
            </Text>
          </View>
          <Text style={styles.profileName}>{member?.name ?? '—'}</Text>
          <Text style={styles.profileRole}>
            {member?.app_role ? APP_ROLE_LABELS[member.app_role] : ''}
          </Text>
        </View>

        {/* Details */}
        <Text style={styles.sectionTitle}>DETAILS</Text>
        <View style={styles.card}>
          <DetailRow label="Email" value={member?.email ?? '—'} />
          <View style={styles.divider} />
          <DetailRow label="Phone" value={member?.phone ?? '—'} />
          <View style={styles.divider} />
          <DetailRow label="Birthday" value={member?.birthday ?? '—'} />
          <View style={styles.divider} />
          <DetailRow label="Club Role" value={member ? CLUB_ROLE_LABELS[member.club_role] : '—'} />
          <View style={styles.divider} />
          <DetailRow label="App Role" value={member?.app_role ? APP_ROLE_LABELS[member.app_role] : '—'} />
          <View style={styles.divider} />
          <DetailRow label="Member Since" value={member ? formatDate(member.created_at) : '—'} />
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

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
  backBtn: { width: 70 },
  backBtnText: { fontSize: 16, color: '#8B1A1A', fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827', flex: 1, textAlign: 'center' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 },

  profileCard: { alignItems: 'center', marginBottom: 28 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#8B1A1A', alignItems: 'center',
    justifyContent: 'center', marginBottom: 14,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  profileName: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  profileRole: { fontSize: 13, color: '#6b7280', fontWeight: '500' },

  sectionTitle: {
    fontSize: 11, fontWeight: '600', color: '#6b7280',
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginBottom: 10,
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
