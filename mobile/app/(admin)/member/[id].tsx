import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAuthStore } from '@/store';
import {
  getMemberById,
  setMemberActive,
  resendInvite,
  updateMemberClubRole,
  updateMemberAppRole,
} from '@/services/memberService';
import type { Member, ClubRole, AppRole } from '@/types';
import { CLUB_ROLE_LABELS, ASSIGNABLE_CLUB_ROLES } from '@/types';
import { Toast, useToast } from '@/components/Toast';

const APP_ROLE_LABELS: Record<AppRole, string> = {
  member: 'Member',
  admin: 'Admin',
  super_admin: 'Super Admin',
};
const ASSIGNABLE_APP_ROLES: AppRole[] = ['member', 'admin', 'super_admin'];

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

type PickerTarget = 'club_role' | 'app_role';

export default function MemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, appRole: myRole } = useAuthStore();

  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [resending, setResending] = useState(false);

  // Role picker
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [savingRole, setSavingRole] = useState(false);

  const { showToast, toastProps } = useToast();

  const load = useCallback(async () => {
    if (!session || !id) return;
    try {
      const m = await getMemberById(id, session.access_token);
      setMember(m);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load member');
    } finally {
      setLoading(false);
    }
  }, [session, id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleToggleActive() {
    if (!session || !member) return;
    const next = !member.is_active;
    Alert.alert(
      next ? 'Activate Member' : 'Deactivate Member',
      next
        ? `${member.name} will be able to log in again.`
        : `${member.name} will be blocked from logging in. Their data is kept.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: next ? 'Activate' : 'Deactivate',
          style: next ? 'default' : 'destructive',
          onPress: async () => {
            setToggling(true);
            try {
              await setMemberActive(member.id, next, session.access_token);
              setMember((prev) => prev ? { ...prev, is_active: next } : prev);
              showToast(next ? 'Account activated' : 'Account deactivated');
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update status');
            } finally {
              setToggling(false);
            }
          },
        },
      ],
    );
  }

  async function handleResendInvite() {
    if (!session || !member) return;
    setResending(true);
    try {
      await resendInvite(member.id, session.access_token);
      showToast(`Activation link sent to ${member.email}`);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to resend invite');
    } finally {
      setResending(false);
    }
  }

  async function handleSelectRole(value: string) {
    if (!session || !member || !pickerTarget) return;
    const target = pickerTarget;
    setPickerTarget(null);
    setSavingRole(true);
    try {
      if (target === 'club_role') {
        await updateMemberClubRole(member.id, value as ClubRole, session.access_token);
        setMember((prev) => prev ? { ...prev, club_role: value as ClubRole } : prev);
        showToast(`Club role updated to ${CLUB_ROLE_LABELS[value as ClubRole]}`);
      } else {
        await updateMemberAppRole(member.id, value as AppRole, session.access_token);
        setMember((prev) => prev ? { ...prev, app_role: value as AppRole } : prev);
        showToast(`App role updated to ${APP_ROLE_LABELS[value as AppRole]}`);
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setSavingRole(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Member</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#8B1A1A" />
        </View>
      </SafeAreaView>
    );
  }

  if (!member) return null;

  const pickerOptions =
    pickerTarget === 'club_role'
      ? ASSIGNABLE_CLUB_ROLES.map((r) => ({ value: r, label: CLUB_ROLE_LABELS[r] }))
      : ASSIGNABLE_APP_ROLES.map((r) => ({ value: r, label: APP_ROLE_LABELS[r] }));

  const currentPickerValue =
    pickerTarget === 'club_role' ? member.club_role : member.app_role;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Member Details</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Avatar + name */}
        <View style={styles.profileCard}>
          <View style={[styles.avatar, !member.is_active && styles.avatarInactive]}>
            <Text style={styles.avatarText}>
              {member.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.profileName}>{member.name}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, {
              backgroundColor: !member.is_active ? '#9ca3af' : member.is_confirmed ? '#10b981' : '#f59e0b',
            }]} />
            <Text style={styles.statusText}>
              {!member.is_active ? 'Inactive' : member.is_confirmed ? 'Active' : 'Invite pending'}
            </Text>
          </View>
        </View>

        {/* Details */}
        <Text style={styles.sectionTitle}>DETAILS</Text>
        <View style={styles.card}>
          <DetailRow label="Email" value={member.email} />
          <View style={styles.divider} />
          <DetailRow label="Phone" value={member.phone ?? '—'} />
          <View style={styles.divider} />
          <DetailRow label="Birthday" value={member.birthday ?? '—'} />
          <View style={styles.divider} />
          <DetailRow label="Joined" value={formatDate(member.created_at)} />
        </View>

        {/* Account status */}
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Account Active</Text>
              <Text style={styles.switchSub}>
                {member.is_active ? 'Member can log in' : 'Login blocked'}
              </Text>
            </View>
            {toggling ? (
              <ActivityIndicator color="#8B1A1A" />
            ) : (
              <Switch
                value={member.is_active}
                onValueChange={handleToggleActive}
                trackColor={{ false: '#d1d5db', true: '#10b981' }}
                thumbColor="#fff"
                ios_backgroundColor="#d1d5db"
              />
            )}
          </View>

          {!member.is_confirmed && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.resendRow}
                onPress={handleResendInvite}
                disabled={resending}
              >
                {resending ? (
                  <ActivityIndicator size="small" color="#8B1A1A" />
                ) : (
                  <Feather name="mail" size={16} color="#8B1A1A" />
                )}
                <Text style={styles.resendText}>Resend Activation Link</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Roles */}
        <Text style={styles.sectionTitle}>ROLES</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.roleRow}
            onPress={() => setPickerTarget('club_role')}
            disabled={savingRole}
          >
            <View>
              <Text style={styles.roleLabel}>Club Role</Text>
              <Text style={styles.roleValue}>{CLUB_ROLE_LABELS[member.club_role]}</Text>
            </View>
            {savingRole && pickerTarget === 'club_role' ? (
              <ActivityIndicator size="small" color="#8B1A1A" />
            ) : (
              <Feather name="chevron-right" size={18} color="#9ca3af" />
            )}
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.roleRow}
            onPress={() => setPickerTarget('app_role')}
            disabled={savingRole}
          >
            <View>
              <Text style={styles.roleLabel}>App Role</Text>
              <Text style={styles.roleValue}>
                {member.app_role ? APP_ROLE_LABELS[member.app_role] : '—'}
              </Text>
            </View>
            {savingRole && pickerTarget === 'app_role' ? (
              <ActivityIndicator size="small" color="#8B1A1A" />
            ) : (
              <Feather name="chevron-right" size={18} color="#9ca3af" />
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>

      <Toast {...toastProps} />

      {/* Role picker modal */}
      <Modal
        visible={pickerTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerTarget(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setPickerTarget(null)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {pickerTarget === 'club_role' ? 'Select Club Role' : 'Select App Role'}
              </Text>
              <TouchableOpacity onPress={() => setPickerTarget(null)}>
                <Feather name="x" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={pickerOptions}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => handleSelectRole(item.value)}
                >
                  <Text style={[
                    styles.optionText,
                    item.value === currentPickerValue && styles.optionTextSelected,
                  ]}>
                    {item.label}
                  </Text>
                  {item.value === currentPickerValue && (
                    <Feather name="check" size={16} color="#8B1A1A" />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.divider} />}
            />
          </View>
        </TouchableOpacity>
      </Modal>
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
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 },

  profileCard: { alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#8B1A1A', alignItems: 'center',
    justifyContent: 'center', marginBottom: 12,
  },
  avatarInactive: { backgroundColor: '#9ca3af' },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '700' },
  profileName: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 6 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },

  sectionTitle: {
    fontSize: 11, fontWeight: '600', color: '#6b7280',
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginBottom: 10, marginTop: 8,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1, marginBottom: 20,
  },
  detailRow: {
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16,
  },
  detailLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  detailValue: { fontSize: 14, color: '#111827', fontWeight: '500', textAlign: 'right', flex: 1 },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 16 },

  switchRow: {
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  switchLabel: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 },
  switchSub: { fontSize: 12, color: '#6b7280' },

  resendRow: {
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  resendText: { fontSize: 14, color: '#8B1A1A', fontWeight: '600' },

  roleRow: {
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  roleLabel: { fontSize: 12, color: '#6b7280', marginBottom: 3 },
  roleValue: { fontSize: 15, color: '#111827', fontWeight: '600' },

  // Modal
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  optionRow: {
    paddingHorizontal: 20, paddingVertical: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  optionText: { fontSize: 15, color: '#374151' },
  optionTextSelected: { color: '#8B1A1A', fontWeight: '700' },
});
