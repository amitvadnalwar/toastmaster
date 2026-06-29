import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, FlatList, TextInput, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAuthStore } from '@/store';
import { supabase } from '@/lib/supabase';
import {
  getMeetingRoster, enrollInRole, enrollAsSpeaker, enrollAsEvaluator, withdrawFromRole,
} from '@/services/meetingService';
import { getMe } from '@/services/memberService';
import type { MeetingRoleAssignment, MeetingWithRoster, SpeechDuration } from '@/types';
import { SINGLETON_ROLES, ROLE_LABELS, SPEECH_DURATIONS } from '@/types';

const ROLE_CFG: Record<string, { icon: string; iconBg: string; iconColor: string }> = {
  tmod:                { icon: 'mic',            iconBg: '#dcfce7', iconColor: '#16a34a' },
  timer:               { icon: 'clock',          iconBg: '#fff7ed', iconColor: '#f97316' },
  general_evaluator:   { icon: 'star',           iconBg: '#fef9c3', iconColor: '#ca8a04' },
  grammarian:          { icon: 'book-open',      iconBg: '#fce7f3', iconColor: '#db2777' },
  ah_counter:          { icon: 'volume-2',       iconBg: '#f0fdf4', iconColor: '#22c55e' },
  table_topics_master: { icon: 'users',          iconBg: '#eff6ff', iconColor: '#3b82f6' },
  speaker:             { icon: 'mic',            iconBg: '#eff6ff', iconColor: '#3b82f6' },
  evaluator:           { icon: 'message-square', iconBg: '#f5f3ff', iconColor: '#8b5cf6' },
};

function initials(name: string | null | undefined) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// ── Modals ────────────────────────────────────────────────────────────────

function TMODModal({ visible, onConfirm, onClose }: { visible: boolean; onConfirm: (t: string) => void; onClose: () => void }) {
  const [theme, setTheme] = useState('');
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <View style={s.modalSheet}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={onClose}><Text style={s.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>Enroll as TMOD</Text>
            <TouchableOpacity onPress={() => { if (theme.trim()) { onConfirm(theme.trim()); setTheme(''); } }}>
              <Text style={[s.modalDone, !theme.trim() && { opacity: 0.4 }]}>Confirm</Text>
            </TouchableOpacity>
          </View>
          <View style={s.modalBody}>
            <Text style={s.modalLabel}>Meeting Theme (required)</Text>
            <TextInput
              style={s.modalInput} placeholder="e.g. Leadership & Growth"
              placeholderTextColor="#9ca3af" value={theme} onChangeText={setTheme} autoFocus
            />
            <Text style={s.modalHint}>As TMOD you set the theme for this meeting.</Text>
          </View>
          <View style={{ height: 32 }} />
        </View>
      </View>
    </Modal>
  );
}

function DurationModal({ visible, onSelect, onClose }: { visible: boolean; onSelect: (d: SpeechDuration) => void; onClose: () => void }) {
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <View style={s.modalSheet}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={onClose}><Text style={s.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>Select Speech Duration</Text>
            <View style={{ width: 60 }} />
          </View>
          {SPEECH_DURATIONS.map(d => (
            <TouchableOpacity key={d} style={s.optionRow} onPress={() => onSelect(d)}>
              <Feather name="clock" size={16} color="#8B1A1A" />
              <Text style={s.optionText}>{d}</Text>
            </TouchableOpacity>
          ))}
          <View style={{ height: 32 }} />
        </View>
      </View>
    </Modal>
  );
}

// ── Role row card ─────────────────────────────────────────────────────────

interface RoleRowProps {
  roleKey: string;
  label: string;
  assignment?: MeetingRoleAssignment;
  isMe: boolean;
  canApply: boolean;
  isPublished: boolean;
  onApply: () => void;
  onWithdraw: () => void;
  actingRole: string | null;
}
function RoleRow({ roleKey, label, assignment, isMe, canApply, isPublished, onApply, onWithdraw, actingRole }: RoleRowProps) {
  const cfg = ROLE_CFG[roleKey] ?? { icon: 'user', iconBg: '#f3f4f6', iconColor: '#6b7280' };
  const isThisActing = actingRole === roleKey;
  const anyActing = actingRole !== null;

  return (
    <View style={s.roleRow}>
      <View style={[s.roleIconWrap, { backgroundColor: cfg.iconBg }]}>
        <Feather name={cfg.icon as any} size={18} color={cfg.iconColor} />
      </View>
      <View style={s.roleInfo}>
        <Text style={s.roleLabel}>{label}</Text>
        {isMe ? (
          <Text style={[s.roleStatus, { color: '#16a34a' }]}>You are assigned</Text>
        ) : assignment ? (
          <Text style={s.roleStatus}>{assignment.member_name ?? '—'}</Text>
        ) : isPublished ? (
          <Text style={[s.roleStatus, { color: '#9ca3af' }]}>Open for applications</Text>
        ) : (
          <Text style={[s.roleStatus, { color: '#9ca3af' }]}>Not open yet</Text>
        )}
      </View>
      {isMe ? (
        <View style={s.row}>
          <View style={s.assignedBadge}><Text style={s.assignedBadgeText}>Assigned</Text></View>
          <TouchableOpacity onPress={onWithdraw} disabled={anyActing} style={{ marginLeft: 8 }}>
            <Feather name="x-circle" size={16} color="#d1d5db" />
          </TouchableOpacity>
        </View>
      ) : canApply ? (
        <TouchableOpacity
          style={[s.applyBtn, anyActing && !isThisActing && s.applyBtnMuted]}
          onPress={onApply} disabled={anyActing}
        >
          {isThisActing
            ? <ActivityIndicator size="small" color="#8B1A1A" />
            : <Text style={s.applyBtnText}>Apply Now</Text>}
        </TouchableOpacity>
      ) : !assignment && isPublished ? (
        <View style={s.openBadge}><Text style={s.openBadgeText}>Open</Text></View>
      ) : null}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────

export default function ApplyRoleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthStore();

  const [data, setData] = useState<MeetingWithRoster | null>(null);
  const [myMemberId, setMyMemberId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [actingRole, setActingRole] = useState<string | null>(null);
  const [showTMODModal, setShowTMODModal] = useState(false);
  const [showDurationModal, setShowDurationModal] = useState(false);

  const load = useCallback(async () => {
    if (!session || !id) return;
    setFetching(true);
    try {
      const [rosterResult, me] = await Promise.all([
        getMeetingRoster(id, session.access_token),
        getMe(session.access_token),
      ]);
      setData(rosterResult);
      setMyMemberId(me.id);
    } catch { } finally { setFetching(false); }
  }, [session, id]);

  useFocusEffect(
    useCallback(() => {
      load();
      const channel = supabase
        .channel(`apply-roster:${id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'meeting_roles', filter: `meeting_id=eq.${id}` }, () => load())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }, [load, id]),
  );

  if (fetching) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}><Text style={s.backText}>‹ Back</Text></TouchableOpacity>
          <Text style={s.headerTitle}>Apply for Role</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={s.loadingBox}><ActivityIndicator color="#8B1A1A" size="large" /></View>
      </SafeAreaView>
    );
  }

  if (!data) return null;

  const { meeting, roster } = data;
  const isPublished = meeting.status === 'published';
  const myAssignment = roster.find(r => r.member_id === myMemberId);
  const alreadyEnrolled = !!myAssignment;
  const speakers = roster.filter(r => r.role === 'speaker');
  const evaluators = roster.filter(r => r.role === 'evaluator');

  function canEnroll() { return isPublished && !alreadyEnrolled; }

  function startEnroll(role: string) {
    if (alreadyEnrolled) { Alert.alert('Already Enrolled', 'You can only apply for one role per meeting.'); return; }
    Keyboard.dismiss();
    if (role === 'tmod') setShowTMODModal(true);
    else if (role === 'speaker') setShowDurationModal(true);
    else confirmEnroll(role);
  }

  async function confirmEnroll(role: string, theme?: string) {
    if (!session || !id) return;
    setActingRole(role);
    try {
      await enrollInRole(id, role as any, session.access_token, theme);
      await load();
    } catch (err) {
      Alert.alert('Cannot Apply', err instanceof Error ? err.message : 'Failed to apply');
    } finally { setActingRole(null); }
  }

  async function handleDurationSelect(duration: SpeechDuration) {
    setShowDurationModal(false);
    if (!session || !id) return;
    setActingRole('speaker');
    try {
      await enrollAsSpeaker(id, duration, session.access_token);
      await load();
    } catch (err) {
      Alert.alert('Cannot Apply', err instanceof Error ? err.message : 'Failed to apply');
    } finally { setActingRole(null); }
  }

  async function handleApplyEvaluator(speakerMemberId: string, speakerName: string | null | undefined) {
    Alert.alert('Confirm', `Evaluate ${speakerName ?? 'this speaker'}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Apply', onPress: async () => {
          if (!session || !id) return;
          setActingRole('evaluator');
          try {
            await enrollAsEvaluator(id, speakerMemberId, session.access_token);
            await load();
          } catch (err) {
            Alert.alert('Cannot Apply', err instanceof Error ? err.message : 'Failed to apply');
          } finally { setActingRole(null); }
        },
      },
    ]);
  }

  function handleWithdraw() {
    if (!myAssignment) return;
    Alert.alert('Withdraw', 'Withdraw from this role?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Withdraw', style: 'destructive',
        onPress: async () => {
          if (!session || !id) return;
          setActingRole(myAssignment.role);
          try {
            await withdrawFromRole(id, myAssignment.id, session.access_token);
            await load();
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to withdraw');
          } finally { setActingRole(null); }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>Apply for Role</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Meeting name context */}
        <View style={s.contextCard}>
          <Text style={s.contextTitle} numberOfLines={1}>{meeting.title}</Text>
          <Text style={s.contextSub}>
            {new Date(meeting.scheduled_at).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
            {meeting.venue ? `  ·  ${meeting.venue}` : ''}
          </Text>
        </View>

        {/* Section 1: Roles */}
        <Text style={s.sectionTitle}>Role Players</Text>
        <View style={s.rolesCard}>
          {SINGLETON_ROLES.map((role, i) => {
            const assignment = roster.find(r => r.role === role);
            const isMe = assignment?.member_id === myMemberId;
            return (
              <View key={role}>
                {i > 0 && <View style={s.divider} />}
                <RoleRow roleKey={role} label={ROLE_LABELS[role] ?? role} assignment={assignment}
                  isMe={isMe} canApply={canEnroll() && !assignment} isPublished={isPublished}
                  onApply={() => startEnroll(role)} onWithdraw={handleWithdraw} actingRole={actingRole} />
              </View>
            );
          })}
        </View>

        {/* Section 2: Speakers */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Speakers</Text>
          <View style={s.countBadge}>
            <Text style={s.countBadgeText}>{speakers.length} / {meeting.max_speakers}</Text>
          </View>
        </View>
        <View style={s.rolesCard}>
          {speakers.map((sp, i) => (
            <View key={sp.id}>
              {i > 0 && <View style={s.divider} />}
              <RoleRow roleKey="speaker" label="Speaker" assignment={sp}
                isMe={sp.member_id === myMemberId} canApply={false} isPublished={isPublished}
                onApply={() => {}} onWithdraw={handleWithdraw} actingRole={actingRole} />
            </View>
          ))}
          {Array.from({ length: meeting.max_speakers - speakers.length }).map((_, i) => (
            <View key={`open-sp-${i}`}>
              {(speakers.length > 0 || i > 0) && <View style={s.divider} />}
              <RoleRow roleKey="speaker" label="Speaker" isMe={false}
                canApply={canEnroll()} isPublished={isPublished}
                onApply={() => startEnroll('speaker')} onWithdraw={() => {}} actingRole={actingRole} />
            </View>
          ))}
        </View>

        {/* Section 3: Evaluators */}
        {speakers.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Evaluators</Text>
            <View style={s.rolesCard}>
              {speakers.map((sp, i) => {
                const evaluator = evaluators.find(e => e.evaluates_member_id === sp.member_id);
                const isMe = evaluator?.member_id === myMemberId;
                return (
                  <View key={`eval-${sp.id}`}>
                    {i > 0 && <View style={s.divider} />}
                    <RoleRow roleKey="evaluator" label={`For ${sp.member_name ?? '—'}`}
                      assignment={evaluator} isMe={isMe}
                      canApply={canEnroll() && !evaluator} isPublished={isPublished}
                      onApply={() => handleApplyEvaluator(sp.member_id, sp.member_name)}
                      onWithdraw={handleWithdraw} actingRole={actingRole} />
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Info note */}
        {isPublished && (
          <View style={s.infoNote}>
            <Feather name="info" size={15} color="#f59e0b" style={{ marginTop: 1 }} />
            <Text style={s.infoNoteText}>You can apply for only one role per meeting.</Text>
          </View>
        )}

      </ScrollView>

      <TMODModal visible={showTMODModal} onConfirm={t => { setShowTMODModal(false); confirmEnroll('tmod', t); }} onClose={() => setShowTMODModal(false)} />
      <DurationModal visible={showDurationModal} onSelect={handleDurationSelect} onClose={() => setShowDurationModal(false)} />
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
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 48 },

  contextCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  contextTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  contextSub: { fontSize: 12, color: '#6b7280' },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  countBadge: { backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: '#6b7280' },

  rolesCard: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, marginBottom: 20,
  },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 16 },

  roleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  roleIconWrap: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  roleInfo: { flex: 1 },
  roleLabel: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  roleStatus: { fontSize: 13, color: '#374151', fontWeight: '500' },
  row: { flexDirection: 'row', alignItems: 'center' },

  assignedBadge: { backgroundColor: '#dcfce7', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  assignedBadgeText: { fontSize: 12, fontWeight: '700', color: '#16a34a' },
  openBadge: { backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  openBadgeText: { fontSize: 12, fontWeight: '600', color: '#9ca3af' },
  applyBtn: { backgroundColor: '#fef2f2', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center' },
  applyBtnMuted: { backgroundColor: '#f3f4f6' },
  applyBtnText: { fontSize: 12, fontWeight: '700', color: '#8B1A1A' },

  infoNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#fffbeb', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#fde68a', marginBottom: 8,
  },
  infoNoteText: { flex: 1, fontSize: 13, color: '#92400e', lineHeight: 19, fontWeight: '500' },

  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  modalCancel: { fontSize: 16, color: '#6b7280', width: 60 },
  modalDone: { fontSize: 16, color: '#8B1A1A', fontWeight: '700', textAlign: 'right', width: 70 },
  modalBody: { padding: 20 },
  modalLabel: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 8 },
  modalInput: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#111827', marginBottom: 8,
  },
  modalHint: { fontSize: 12, color: '#9ca3af' },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  optionText: { fontSize: 16, color: '#111827', fontWeight: '500' },
});
