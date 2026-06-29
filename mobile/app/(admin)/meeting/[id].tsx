import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Modal, Platform, FlatList, Keyboard, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import QRCode from 'react-native-qrcode-svg';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAuthStore } from '@/store';
import {
  getMeetingRoster, updateMeeting, deleteMeeting,
  updateMeetingStatus, updateVotingStatus, adminAssignRole, withdrawFromRole,
} from '@/services/meetingService';
import { getAllMembers } from '@/services/memberService';
import type {
  Meeting, MeetingRole, MeetingRoleAssignment, MeetingStatus,
  MeetingWithRoster, VotingStatus,
} from '@/types';
import { SINGLETON_ROLES, ROLE_LABELS, SPEECH_DURATIONS } from '@/types';

const STATUS_LABEL: Record<MeetingStatus, string> = {
  draft: 'Draft', published: 'Published', completed: 'Completed',
};
const STATUS_COLOR: Record<MeetingStatus, string> = {
  draft: '#f59e0b', published: '#10b981', completed: '#6b7280',
};
const VOTING_LABEL: Record<VotingStatus, string> = {
  not_started: 'Not started', open: 'Open', closed: 'Closed',
};
const VOTING_COLOR: Record<VotingStatus, string> = {
  not_started: '#9ca3af', open: '#10b981', closed: '#6b7280',
};

interface MemberOption { id: string; name: string }

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatTime(d: Date) {
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}
function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
    + '  ·  ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}
function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

// ── Roster helpers ────────────────────────────────────────────────────────

function rosterByRole(roster: MeetingRoleAssignment[], role: MeetingRole) {
  return roster.find(r => r.role === role);
}
function rosterSpeakers(roster: MeetingRoleAssignment[]) {
  return roster.filter(r => r.role === 'speaker');
}
function rosterEvaluators(roster: MeetingRoleAssignment[]) {
  return roster.filter(r => r.role === 'evaluator');
}

// ── Member picker modal ───────────────────────────────────────────────────

interface MemberPickerProps {
  visible: boolean;
  title: string;
  members: MemberOption[];
  selectedId?: string | null;
  onSelect: (m: MemberOption) => void;
  onClose: () => void;
}
function MemberPickerModal({ visible, title, members, selectedId, onSelect, onClose }: MemberPickerProps) {
  const [search, setSearch] = useState('');
  const filtered = members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.modalSheet, { maxHeight: '75%' }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>{title}</Text>
            <View style={{ width: 60 }} />
          </View>
          <View style={styles.searchBox}>
            <Feather name="search" size={15} color="#9ca3af" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search members…"
              placeholderTextColor="#9ca3af"
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={m => m.id}
            renderItem={({ item: m }) => (
              <TouchableOpacity style={styles.memberRow} onPress={() => { onSelect(m); setSearch(''); }}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>{initials(m.name)}</Text>
                </View>
                <Text style={styles.memberName}>{m.name}</Text>
                {selectedId === m.id && <Feather name="check" size={16} color="#8B1A1A" />}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyBox}><Text style={styles.emptyText}>No members found</Text></View>
            }
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Duration picker modal ─────────────────────────────────────────────────

interface DurationPickerProps {
  visible: boolean;
  selected: string | null;
  onSelect: (d: string) => void;
  onClose: () => void;
}
function DurationPickerModal({ visible, selected, onSelect, onClose }: DurationPickerProps) {
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>Speech Duration</Text>
            <View style={{ width: 60 }} />
          </View>
          {SPEECH_DURATIONS.map(d => (
            <TouchableOpacity key={d} style={styles.durationRow} onPress={() => onSelect(d)}>
              <Text style={styles.durationText}>{d}</Text>
              {selected === d && <Feather name="check" size={16} color="#8B1A1A" />}
            </TouchableOpacity>
          ))}
          <View style={{ height: 32 }} />
        </View>
      </View>
    </Modal>
  );
}

// ── Roster section ────────────────────────────────────────────────────────

interface RosterSectionProps {
  meeting: Meeting;
  roster: MeetingRoleAssignment[];
  memberMap: Map<string, string>;
  onAssign: (role: MeetingRole, speakerMemberId?: string) => void;
  onRemove: (roleId: string, label: string) => void;
  acting: boolean;
}

function RosterSection({ meeting, roster, memberMap, onAssign, onRemove, acting }: RosterSectionProps) {
  const speakers = rosterSpeakers(roster);
  const evaluators = rosterEvaluators(roster);

  return (
    <>
      {/* Role Players */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>ROLE PLAYERS</Text>
      <View style={styles.card}>
        {SINGLETON_ROLES.map((role, i) => {
          const assignment = rosterByRole(roster, role);
          return (
            <View key={role}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.rosterRow}>
                <Text style={styles.rosterRoleLabel}>{ROLE_LABELS[role]}</Text>
                {assignment ? (
                  <View style={styles.rosterAssigned}>
                    <Text style={styles.rosterMemberName} numberOfLines={1}>
                      {assignment.member_name ?? memberMap.get(assignment.member_id) ?? '—'}
                    </Text>
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => onRemove(assignment.id, ROLE_LABELS[role])}
                      disabled={acting}
                    >
                      <Feather name="x" size={14} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.assignBtn}
                    onPress={() => onAssign(role)}
                    disabled={acting}
                  >
                    <Feather name="plus" size={13} color="#8B1A1A" />
                    <Text style={styles.assignBtnText}>Assign</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Speakers */}
      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
        SPEAKERS ({speakers.length}/{meeting.max_speakers})
      </Text>
      <View style={styles.card}>
        {speakers.map((s, i) => (
          <View key={s.id}>
            {i > 0 && <View style={styles.divider} />}
            <View style={styles.rosterRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rosterMemberName}>
                  {s.member_name ?? memberMap.get(s.member_id) ?? '—'}
                </Text>
                {s.speech_duration && (
                  <Text style={styles.rosterSub}>{s.speech_duration}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => onRemove(s.id, 'Speaker')}
                disabled={acting}
              >
                <Feather name="x" size={14} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {speakers.length < meeting.max_speakers && (
          <View>
            {speakers.length > 0 && <View style={styles.divider} />}
            <TouchableOpacity
              style={[styles.rosterRow, { justifyContent: 'center' }]}
              onPress={() => onAssign('speaker')}
              disabled={acting}
            >
              <Feather name="plus" size={13} color="#8B1A1A" />
              <Text style={[styles.assignBtnText, { marginLeft: 4 }]}>Add Speaker</Text>
            </TouchableOpacity>
          </View>
        )}
        {speakers.length === 0 && speakers.length >= meeting.max_speakers && (
          <View style={styles.rosterEmpty}>
            <Text style={styles.rosterEmptyText}>No speakers assigned</Text>
          </View>
        )}
      </View>

      {/* Evaluators */}
      {speakers.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>EVALUATORS</Text>
          <View style={styles.card}>
            {speakers.map((s, i) => {
              const evaluator = evaluators.find(e => e.evaluates_member_id === s.member_id);
              const speakerName = s.member_name ?? memberMap.get(s.member_id) ?? '—';
              return (
                <View key={s.id}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.rosterRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rosterSub}>Evaluator for {speakerName}</Text>
                      {evaluator ? (
                        <Text style={styles.rosterMemberName}>
                          {evaluator.member_name ?? memberMap.get(evaluator.member_id) ?? '—'}
                        </Text>
                      ) : (
                        <Text style={[styles.rosterMemberName, { color: '#9ca3af' }]}>Unassigned</Text>
                      )}
                    </View>
                    {evaluator ? (
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => onRemove(evaluator.id, 'Evaluator')}
                        disabled={acting}
                      >
                        <Feather name="x" size={14} color="#ef4444" />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.assignBtn}
                        onPress={() => onAssign('evaluator', s.member_id)}
                        disabled={acting}
                      >
                        <Feather name="plus" size={13} color="#8B1A1A" />
                        <Text style={styles.assignBtnText}>Assign</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}
    </>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────

export default function MeetingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useAuthStore((s) => s.session);

  const [data, setData] = useState<MeetingWithRoster | null>(null);
  const [fetching, setFetching] = useState(true);
  const [acting, setActing] = useState(false);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [memberMap, setMemberMap] = useState<Map<string, string>>(new Map());

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editVenue, setEditVenue] = useState('');
  const [editDate, setEditDate] = useState(new Date());
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [editPresident, setEditPresident] = useState<MemberOption | null>(null);
  const [editSaa, setEditSaa] = useState<MemberOption | null>(null);
  const [editMaxSpeakers, setEditMaxSpeakers] = useState(3);

  // Assign role flow
  const [assignRole, setAssignRole] = useState<MeetingRole | null>(null);
  const [assignTargetSpeakerId, setAssignTargetSpeakerId] = useState<string | null>(null);
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [pendingMember, setPendingMember] = useState<MemberOption | null>(null);

  // President/SAA edit pickers
  const [showPresidentPicker, setShowPresidentPicker] = useState(false);
  const [showSaaPicker, setShowSaaPicker] = useState(false);

  const load = useCallback(async () => {
    if (!session || !id) return;
    setFetching(true);
    try {
      const result = await getMeetingRoster(id, session.access_token);
      setData(result);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load meeting');
    } finally {
      setFetching(false);
    }
  }, [session, id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (!session) return;
    getAllMembers(session.access_token).then(list => {
      const opts = list.map(m => ({ id: m.id, name: m.name }));
      setMembers(opts);
      setMemberMap(new Map(opts.map(m => [m.id, m.name])));
    }).catch(() => {});
  }, [session]);

  // Sync edit fields when data loads
  useEffect(() => {
    if (!data) return;
    const m = data.meeting;
    setEditTitle(m.title);
    setEditVenue(m.venue ?? '');
    setEditDate(new Date(m.scheduled_at));
    setEditMaxSpeakers(m.max_speakers);
    if (m.president_id) setEditPresident({ id: m.president_id, name: memberMap.get(m.president_id) ?? '…' });
    if (m.saa_id) setEditSaa({ id: m.saa_id, name: memberMap.get(m.saa_id) ?? '…' });
  }, [data]);

  // Update president/saa names once memberMap is loaded
  useEffect(() => {
    if (!data || memberMap.size === 0) return;
    const m = data.meeting;
    if (m.president_id && memberMap.has(m.president_id)) {
      setEditPresident({ id: m.president_id, name: memberMap.get(m.president_id)! });
    }
    if (m.saa_id && memberMap.has(m.saa_id)) {
      setEditSaa({ id: m.saa_id, name: memberMap.get(m.saa_id)! });
    }
  }, [memberMap]);

  function startEdit() {
    if (!data) return;
    setEditing(true);
  }
  function cancelEdit() { setEditing(false); }

  function openPicker(mode: 'date' | 'time') {
    Keyboard.dismiss();
    setTempDate(editDate);
    setPickerMode(mode);
    setShowPicker(true);
  }
  function onAndroidChange(_e: DateTimePickerEvent, selected?: Date) {
    setShowPicker(false);
    if (selected) setEditDate(selected);
  }
  function onIosChange(_e: DateTimePickerEvent, selected?: Date) {
    if (selected) setTempDate(selected);
  }
  function confirmIos() { setEditDate(tempDate); setShowPicker(false); }

  async function handleSave() {
    if (!session || !data || !editTitle.trim()) return;
    setActing(true);
    try {
      const updated = await updateMeeting(data.meeting.id, {
        title: editTitle.trim(),
        scheduled_at: editDate.toISOString(),
        venue: editVenue.trim() || null,
        president_id: editPresident?.id ?? null,
        saa_id: editSaa?.id ?? null,
        max_speakers: editMaxSpeakers,
      }, session.access_token);
      setData({ meeting: updated, roster: data.roster });
      setEditing(false);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setActing(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Delete Meeting', 'This will permanently delete the meeting and all data.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          if (!session || !data) return;
          setActing(true);
          try {
            await deleteMeeting(data.meeting.id, session.access_token);
            router.back();
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete');
            setActing(false);
          }
        },
      },
    ]);
  }

  async function handlePublish() {
    if (!session || !data) return;
    Alert.alert('Publish Meeting', 'Publish this meeting so members can see it?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Publish',
        onPress: async () => {
          setActing(true);
          try {
            const updated = await updateMeetingStatus(data.meeting.id, 'published', session.access_token);
            setData({ meeting: updated, roster: data.roster });
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to publish');
          } finally {
            setActing(false);
          }
        },
      },
    ]);
  }

  async function handleVotingToggle() {
    if (!session || !data) return;
    const next: VotingStatus = data.meeting.voting_status === 'open' ? 'closed' : 'open';
    setActing(true);
    try {
      const updated = await updateVotingStatus(data.meeting.id, next, session.access_token);
      setData({ meeting: updated, roster: data.roster });
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update voting');
    } finally {
      setActing(false);
    }
  }

  // ── Role assignment flow ──────────────────────────────────────────────

  function startAssign(role: MeetingRole, speakerMemberId?: string) {
    Keyboard.dismiss();
    setAssignRole(role);
    setAssignTargetSpeakerId(speakerMemberId ?? null);
    setPendingMember(null);
    setShowMemberPicker(true);
  }

  function onMemberSelected(m: MemberOption) {
    setPendingMember(m);
    setShowMemberPicker(false);
    if (assignRole === 'speaker') {
      setShowDurationPicker(true);
    } else {
      commitAssign(m, null);
    }
  }

  async function onDurationSelected(duration: string) {
    setShowDurationPicker(false);
    if (pendingMember) commitAssign(pendingMember, duration);
  }

  async function commitAssign(member: MemberOption, duration: string | null) {
    if (!session || !data || !assignRole) return;
    setActing(true);
    try {
      await adminAssignRole(data.meeting.id, {
        member_id: member.id,
        role: assignRole,
        speech_duration: duration,
        evaluates_member_id: assignTargetSpeakerId,
      }, session.access_token);
      await load();
    } catch (err) {
      Alert.alert('Cannot assign', err instanceof Error ? err.message : 'Failed to assign role');
    } finally {
      setActing(false);
      setAssignRole(null);
      setPendingMember(null);
    }
  }

  function handleRemove(roleId: string, label: string) {
    Alert.alert('Remove Assignment', `Remove ${label} assignment?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          if (!session || !data) return;
          setActing(true);
          try {
            await withdrawFromRole(data.meeting.id, roleId, session.access_token);
            await load();
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to remove');
          } finally {
            setActing(false);
          }
        },
      },
    ]);
  }

  // ── Render ────────────────────────────────────────────────────────────

  if (fetching) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meeting</Text>
          <View style={styles.headerIcons} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B1A1A" />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!data) return null;

  const { meeting, roster } = data;
  const votingIsOpen = meeting.voting_status === 'open';
  const canEdit = meeting.status === 'draft';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.headerRow}>
        {editing ? (
          <TouchableOpacity style={styles.backBtn} onPress={cancelEdit}>
            <Text style={styles.backBtnText}>Cancel</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>‹ Back</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle} numberOfLines={1}>
          {editing ? 'Edit Meeting' : 'Meeting Details'}
        </Text>
        <View style={styles.headerIcons}>
          {editing ? (
            <TouchableOpacity style={styles.iconBtn} onPress={handleSave} disabled={acting || !editTitle.trim()}>
              {acting ? <ActivityIndicator size="small" color="#10b981" /> : <Feather name="check" size={20} color="#10b981" />}
            </TouchableOpacity>
          ) : (
            <>
              {canEdit && (
                <>
                  <TouchableOpacity style={styles.iconBtn} onPress={startEdit}>
                    <Feather name="edit-2" size={18} color="#374151" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconBtn} onPress={confirmDelete} disabled={acting}>
                    <Feather name="trash-2" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {editing ? (
          /* ── Edit mode ── */
          <>
            <Text style={styles.fieldLabel}>Meeting title</Text>
            <TextInput
              style={styles.input}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="e.g. Regular Meeting #42"
              placeholderTextColor="#9ca3af"
              autoFocus
            />
            <Text style={styles.fieldLabel}>Date &amp; Time</Text>
            <View style={styles.dateRow}>
              <TouchableOpacity style={styles.dateBtn} onPress={() => openPicker('date')}>
                <Feather name="calendar" size={15} color="#6b7280" />
                <Text style={styles.dateBtnText}>{formatDate(editDate)}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dateBtn} onPress={() => openPicker('time')}>
                <Feather name="clock" size={15} color="#6b7280" />
                <Text style={styles.dateBtnText}>{formatTime(editDate)}</Text>
              </TouchableOpacity>
            </View>
            {Platform.OS === 'android' && showPicker && (
              <DateTimePicker value={editDate} mode={pickerMode} display="default" onChange={onAndroidChange} />
            )}
            <Text style={styles.fieldLabel}>Venue</Text>
            <TextInput
              style={styles.input}
              value={editVenue}
              onChangeText={setEditVenue}
              placeholder="Venue location"
              placeholderTextColor="#9ca3af"
            />
            <Text style={styles.fieldLabel}>President</Text>
            <TouchableOpacity style={styles.pickerRow} onPress={() => { Keyboard.dismiss(); setShowPresidentPicker(true); }}>
              <Feather name="user" size={16} color="#6b7280" />
              <Text style={[styles.pickerText, !editPresident && styles.pickerPlaceholder]}>
                {editPresident ? editPresident.name : 'Select president…'}
              </Text>
              <Feather name="chevron-right" size={16} color="#9ca3af" />
            </TouchableOpacity>
            <Text style={styles.fieldLabel}>SAA</Text>
            <TouchableOpacity style={styles.pickerRow} onPress={() => { Keyboard.dismiss(); setShowSaaPicker(true); }}>
              <Feather name="user" size={16} color="#6b7280" />
              <Text style={[styles.pickerText, !editSaa && styles.pickerPlaceholder]}>
                {editSaa ? editSaa.name : 'Select SAA…'}
              </Text>
              <Feather name="chevron-right" size={16} color="#9ca3af" />
            </TouchableOpacity>
            <Text style={styles.fieldLabel}>Max Speakers</Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setEditMaxSpeakers(v => Math.max(1, v - 1))}>
                <Feather name="minus" size={18} color="#374151" />
              </TouchableOpacity>
              <Text style={styles.stepValue}>{editMaxSpeakers}</Text>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setEditMaxSpeakers(v => Math.min(8, v + 1))}>
                <Feather name="plus" size={18} color="#374151" />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          /* ── View mode ── */
          <>
            <Text style={styles.meetingTitle}>{meeting.title}</Text>

            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: STATUS_COLOR[meeting.status] + '22' }]}>
                <View style={[styles.badgeDot, { backgroundColor: STATUS_COLOR[meeting.status] }]} />
                <Text style={[styles.badgeText, { color: STATUS_COLOR[meeting.status] }]}>
                  {STATUS_LABEL[meeting.status]}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: VOTING_COLOR[meeting.voting_status] + '22' }]}>
                <View style={[styles.badgeDot, { backgroundColor: VOTING_COLOR[meeting.voting_status] }]} />
                <Text style={[styles.badgeText, { color: VOTING_COLOR[meeting.voting_status] }]}>
                  Voting {VOTING_LABEL[meeting.voting_status]}
                </Text>
              </View>
            </View>

            {meeting.status === 'draft' && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.publishBtn, acting && styles.btnDisabled]}
                onPress={handlePublish}
                disabled={acting}
              >
                {acting ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>Publish Meeting</Text>}
              </TouchableOpacity>
            )}
            {meeting.status === 'published' && (
              <TouchableOpacity
                style={[styles.actionBtn, votingIsOpen ? styles.closeVotingBtn : styles.openVotingBtn, acting && styles.btnDisabled]}
                onPress={handleVotingToggle}
                disabled={acting}
              >
                {acting ? <ActivityIndicator color="#fff" /> : (
                  <Text style={styles.actionBtnText}>{votingIsOpen ? 'Close Voting' : 'Open Voting'}</Text>
                )}
              </TouchableOpacity>
            )}

            <Text style={styles.sectionTitle}>DETAILS</Text>
            <View style={styles.card}>
              <DetailRow label="Title" value={meeting.title} />
              <View style={styles.divider} />
              <DetailRow label="Date & Time" value={formatDateTime(meeting.scheduled_at)} />
              {meeting.venue ? (
                <>
                  <View style={styles.divider} />
                  <DetailRow label="Venue" value={meeting.venue} />
                </>
              ) : null}
              {meeting.theme ? (
                <>
                  <View style={styles.divider} />
                  <DetailRow label="Theme" value={meeting.theme} />
                </>
              ) : null}
              {meeting.president_id ? (
                <>
                  <View style={styles.divider} />
                  <DetailRow label="President" value={memberMap.get(meeting.president_id) ?? '—'} />
                </>
              ) : null}
              {meeting.saa_id ? (
                <>
                  <View style={styles.divider} />
                  <DetailRow label="SAA" value={memberMap.get(meeting.saa_id) ?? '—'} />
                </>
              ) : null}
              <View style={styles.divider} />
              <DetailRow label="Status" value={STATUS_LABEL[meeting.status]} />
              <View style={styles.divider} />
              <DetailRow label="Max Speakers" value={String(meeting.max_speakers)} />
              <View style={styles.divider} />
              <DetailRow
                label="Created"
                value={new Date(meeting.created_at).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              />
            </View>

            {/* Roster management */}
            <RosterSection
              meeting={meeting}
              roster={roster}
              memberMap={memberMap}
              onAssign={startAssign}
              onRemove={handleRemove}
              acting={acting}
            />

            {/* QR Code */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>MEMBER QR CODE</Text>
            <View style={styles.qrCard}>
              <Text style={styles.qrHint}>Members scan this to join the meeting</Text>
              <View style={styles.qrWrapper}>
                <QRCode value={`toastmasters://join?meeting_id=${meeting.id}`} size={200} color="#111827" backgroundColor="#ffffff" />
              </View>
              <Text style={styles.qrId}>{meeting.id}</Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* iOS date picker */}
      {Platform.OS === 'ios' && (
        <Modal transparent animationType="slide" visible={showPicker} onRequestClose={() => setShowPicker(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
                <Text style={styles.modalTitle}>{pickerMode === 'date' ? 'Select Date' : 'Select Time'}</Text>
                <TouchableOpacity onPress={confirmIos}><Text style={styles.modalDone}>Done</Text></TouchableOpacity>
              </View>
              <DateTimePicker value={tempDate} mode={pickerMode} display="spinner" onChange={onIosChange} style={styles.iosPicker} textColor="#111827" />
            </View>
          </View>
        </Modal>
      )}

      {/* President picker (edit mode) */}
      <MemberPickerModal
        visible={showPresidentPicker}
        title="Select President"
        members={members}
        selectedId={editPresident?.id}
        onSelect={m => { setEditPresident(m); setShowPresidentPicker(false); }}
        onClose={() => setShowPresidentPicker(false)}
      />

      {/* SAA picker (edit mode) */}
      <MemberPickerModal
        visible={showSaaPicker}
        title="Select SAA"
        members={members}
        selectedId={editSaa?.id}
        onSelect={m => { setEditSaa(m); setShowSaaPicker(false); }}
        onClose={() => setShowSaaPicker(false)}
      />

      {/* Role assignment member picker */}
      <MemberPickerModal
        visible={showMemberPicker}
        title={assignRole ? `Assign ${ROLE_LABELS[assignRole]}` : 'Select Member'}
        members={members}
        onSelect={onMemberSelected}
        onClose={() => { setShowMemberPicker(false); setAssignRole(null); }}
      />

      {/* Duration picker (for speaker assignments) */}
      <DurationPickerModal
        visible={showDurationPicker}
        selected={null}
        onSelect={onDurationSelected}
        onClose={() => { setShowDurationPicker(false); setAssignRole(null); setPendingMember(null); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  backBtn: { width: 70 },
  backBtnText: { fontSize: 16, color: '#8B1A1A', fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827', flex: 1, textAlign: 'center' },
  headerIcons: { width: 70, flexDirection: 'row', justifyContent: 'flex-end', gap: 4 },
  iconBtn: { padding: 8 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#6b7280' },
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 },

  meetingTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 12 },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 20 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  badgeDot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: '600' },

  actionBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  publishBtn: { backgroundColor: '#10b981' },
  openVotingBtn: { backgroundColor: '#8B1A1A' },
  closeVotingBtn: { backgroundColor: '#374151' },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },

  sectionTitle: {
    fontSize: 11, fontWeight: '600', color: '#6b7280',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  detailRow: {
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
  },
  detailLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500', minWidth: 80 },
  detailValue: { fontSize: 14, color: '#111827', fontWeight: '500', flex: 1, textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 16 },

  // Roster
  rosterRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 8,
  },
  rosterRoleLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500', flex: 1 },
  rosterAssigned: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 2 },
  rosterMemberName: { fontSize: 14, color: '#111827', fontWeight: '600', flex: 1 },
  rosterSub: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  rosterEmpty: { padding: 16, alignItems: 'center' },
  rosterEmptyText: { fontSize: 13, color: '#9ca3af' },
  removeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center',
  },
  assignBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fef2f2', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  assignBtnText: { fontSize: 13, color: '#8B1A1A', fontWeight: '600' },

  qrCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 24, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  qrHint: { fontSize: 13, color: '#6b7280', marginBottom: 20, textAlign: 'center' },
  qrWrapper: { padding: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  qrId: { fontSize: 10, color: '#d1d5db', marginTop: 16, textAlign: 'center' },

  // Edit mode
  fieldLabel: {
    fontSize: 13, fontWeight: '500', color: '#6b7280',
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: '#111827', backgroundColor: '#fff', marginBottom: 20,
  },
  dateRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  dateBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14,
  },
  dateBtnText: { fontSize: 14, color: '#111827', fontWeight: '500', flexShrink: 1 },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db',
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20,
  },
  pickerText: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '500' },
  pickerPlaceholder: { color: '#9ca3af' },
  stepperRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db',
    borderRadius: 10, alignSelf: 'flex-start', overflow: 'hidden', marginBottom: 24,
  },
  stepBtn: { paddingHorizontal: 20, paddingVertical: 14 },
  stepValue: { fontSize: 18, fontWeight: '700', color: '#111827', minWidth: 40, textAlign: 'center' },

  // Modals
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  modalCancel: { fontSize: 16, color: '#6b7280' },
  modalDone: { fontSize: 16, color: '#8B1A1A', fontWeight: '700' },
  iosPicker: { width: '100%' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginVertical: 12,
    backgroundColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#111827' },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f9fafb',
  },
  memberAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#8B1A1A', alignItems: 'center', justifyContent: 'center',
  },
  memberAvatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  memberName: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '500' },
  emptyBox: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9ca3af' },
  durationRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 18,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  durationText: { fontSize: 16, color: '#111827', fontWeight: '500' },
});
