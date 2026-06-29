import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';

const CLUB_ROLES = [
  { key: 'president', label: 'President', icon: 'star' as const, desc: 'Leads the club and meeting' },
  { key: 'vp_education', label: 'VP Education', icon: 'book' as const, desc: 'Manages educational programs' },
  { key: 'vp_membership', label: 'VP Membership', icon: 'user-plus' as const, desc: 'Recruits and retains members' },
  { key: 'vp_pr', label: 'VP Public Relations', icon: 'radio' as const, desc: 'Handles club publicity' },
  { key: 'secretary', label: 'Secretary', icon: 'file-text' as const, desc: 'Maintains records and minutes' },
  { key: 'treasurer', label: 'Treasurer', icon: 'dollar-sign' as const, desc: 'Manages club finances' },
  { key: 'saa', label: 'Sergeant-at-Arms', icon: 'shield' as const, desc: 'Manages club logistics' },
];

export default function AdminRolesScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Club Roles</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.intro}>
          Manage ExCom roles for your club. Assign members to leadership positions from the Members tab.
        </Text>

        <Text style={s.sectionTitle}>EXECUTIVE COMMITTEE</Text>
        {CLUB_ROLES.map(role => (
          <TouchableOpacity
            key={role.key}
            style={s.roleRow}
            onPress={() => router.push('/(admin)/members' as any)}
            activeOpacity={0.75}
          >
            <View style={s.roleIcon}>
              <Feather name={role.icon} size={18} color="#8B1A1A" />
            </View>
            <View style={s.roleInfo}>
              <Text style={s.roleLabel}>{role.label}</Text>
              <Text style={s.roleDesc}>{role.desc}</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#9ca3af" />
          </TouchableOpacity>
        ))}

        <Text style={[s.sectionTitle, { marginTop: 24 }]}>MEETING ROLES</Text>
        <View style={s.infoCard}>
          <Feather name="info" size={16} color="#6b7280" />
          <Text style={s.infoText}>
            Meeting roles (TMOD, General Evaluator, Timer, etc.) are assigned per meeting.
            Open a meeting to manage its roster.
          </Text>
        </View>
        <TouchableOpacity style={s.meetingRolesBtn} onPress={() => router.push('/(admin)/meetings' as any)}>
          <Text style={s.meetingRolesBtnText}>Go to Meetings</Text>
          <Feather name="arrow-right" size={14} color="#8B1A1A" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f4f8' },
  header: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },
  intro: {
    fontSize: 14, color: '#6b7280', lineHeight: 20, marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: '600', color: '#6b7280',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10,
  },
  roleRow: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  roleIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center',
  },
  roleInfo: { flex: 1 },
  roleLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  roleDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  infoCard: {
    backgroundColor: '#f9fafb', borderRadius: 12, padding: 14,
    flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 12,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  infoText: { flex: 1, fontSize: 13, color: '#6b7280', lineHeight: 18 },
  meetingRolesBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#8B1A1A',
  },
  meetingRolesBtnText: { fontSize: 14, fontWeight: '600', color: '#8B1A1A' },
});
