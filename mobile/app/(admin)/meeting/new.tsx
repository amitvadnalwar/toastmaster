import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Modal, Platform, Alert, ActivityIndicator, FlatList, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useAuthStore } from '@/store';
import { createMeeting } from '@/services/meetingService';
import { getAllMembers } from '@/services/memberService';

type PickerMode = 'date' | 'time';

interface MemberOption { id: string; name: string }
type MemberField = 'president' | 'saa' | null;

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatTime(d: Date) {
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function NewMeetingScreen() {
  const session = useAuthStore((s) => s.session);

  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [scheduledAt, setScheduledAt] = useState(new Date());
  const [pickerMode, setPickerMode] = useState<PickerMode>('date');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [maxSpeakers, setMaxSpeakers] = useState(3);
  const [president, setPresident] = useState<MemberOption | null>(null);
  const [saa, setSaa] = useState<MemberOption | null>(null);
  const [loading, setLoading] = useState(false);

  // Member picker state
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [activeField, setActiveField] = useState<MemberField>(null);
  const [showMemberModal, setShowMemberModal] = useState(false);

  useEffect(() => {
    if (!session) return;
    getAllMembers(session.access_token)
      .then(list => setMembers(list.map(m => ({ id: m.id, name: m.name }))))
      .catch(() => {});
  }, [session]);

  function openPicker(mode: PickerMode) {
    Keyboard.dismiss();
    setTempDate(scheduledAt);
    setPickerMode(mode);
    setShowDatePicker(true);
  }
  function onAndroidChange(_e: DateTimePickerEvent, selected?: Date) {
    setShowDatePicker(false);
    if (selected) setScheduledAt(selected);
  }
  function onIosChange(_e: DateTimePickerEvent, selected?: Date) {
    if (selected) setTempDate(selected);
  }
  function confirmIos() { setScheduledAt(tempDate); setShowDatePicker(false); }

  function openMemberPicker(field: MemberField) {
    Keyboard.dismiss();
    setMemberSearch('');
    setActiveField(field);
    setShowMemberModal(true);
  }

  function selectMember(m: MemberOption) {
    if (activeField === 'president') setPresident(m);
    else if (activeField === 'saa') setSaa(m);
    setShowMemberModal(false);
  }

  async function handleCreate() {
    if (!session) return;
    setLoading(true);
    try {
      const meeting = await createMeeting({
        title: title.trim(),
        scheduled_at: scheduledAt.toISOString(),
        venue: venue.trim() || null,
        president_id: president?.id ?? null,
        saa_id: saa?.id ?? null,
        max_speakers: maxSpeakers,
      }, session.access_token);
      router.replace(`/(admin)/meeting/${meeting.id}`);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create meeting');
    } finally {
      setLoading(false);
    }
  }

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(memberSearch.toLowerCase())
  );
  const isReady = title.trim().length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Meeting</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <Text style={styles.label}>Meeting title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Regular Meeting #42"
            placeholderTextColor="#9ca3af"
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Date &amp; Time</Text>
          <View style={styles.dateRow}>
            <TouchableOpacity style={styles.dateBtn} onPress={() => openPicker('date')}>
              <Text style={styles.dateBtnIcon}>📅</Text>
              <Text style={styles.dateBtnText}>{formatDate(scheduledAt)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dateBtn} onPress={() => openPicker('time')}>
              <Text style={styles.dateBtnIcon}>🕐</Text>
              <Text style={styles.dateBtnText}>{formatTime(scheduledAt)}</Text>
            </TouchableOpacity>
          </View>

          {Platform.OS === 'android' && showDatePicker && (
            <DateTimePicker value={scheduledAt} mode={pickerMode} display="default" onChange={onAndroidChange} />
          )}

          <Text style={styles.label}>Venue</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Community Hall, Room 101"
            placeholderTextColor="#9ca3af"
            value={venue}
            onChangeText={setVenue}
          />

          <Text style={styles.label}>President</Text>
          <TouchableOpacity style={styles.pickerRow} onPress={() => openMemberPicker('president')}>
            <Feather name="user" size={16} color="#6b7280" />
            <Text style={[styles.pickerText, !president && styles.pickerPlaceholder]}>
              {president ? president.name : 'Select president…'}
            </Text>
            <Feather name="chevron-right" size={16} color="#9ca3af" />
          </TouchableOpacity>

          <Text style={styles.label}>SAA</Text>
          <TouchableOpacity style={styles.pickerRow} onPress={() => openMemberPicker('saa')}>
            <Feather name="user" size={16} color="#6b7280" />
            <Text style={[styles.pickerText, !saa && styles.pickerPlaceholder]}>
              {saa ? saa.name : 'Select SAA…'}
            </Text>
            <Feather name="chevron-right" size={16} color="#9ca3af" />
          </TouchableOpacity>

          <Text style={styles.label}>Max Speakers</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => setMaxSpeakers(v => Math.max(1, v - 1))}
            >
              <Feather name="minus" size={18} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.stepValue}>{maxSpeakers}</Text>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => setMaxSpeakers(v => Math.min(8, v + 1))}
            >
              <Feather name="plus" size={18} color="#374151" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.btn, (!isReady || loading) && styles.btnDisabled]}
            onPress={handleCreate}
            disabled={!isReady || loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Meeting</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* iOS date picker modal */}
      {Platform.OS === 'ios' && (
        <Modal transparent animationType="slide" visible={showDatePicker} onRequestClose={() => setShowDatePicker(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.modalCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>{pickerMode === 'date' ? 'Select Date' : 'Select Time'}</Text>
                <TouchableOpacity onPress={confirmIos}>
                  <Text style={styles.modalDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker value={tempDate} mode={pickerMode} display="spinner" onChange={onIosChange} style={styles.iosPicker} textColor="#111827" />
            </View>
          </View>
        </Modal>
      )}

      {/* Member picker modal */}
      <Modal transparent animationType="slide" visible={showMemberModal} onRequestClose={() => setShowMemberModal(false)}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalSheet, styles.memberModalSheet]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowMemberModal(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {activeField === 'president' ? 'Select President' : 'Select SAA'}
              </Text>
              <View style={{ width: 60 }} />
            </View>
            <View style={styles.searchBox}>
              <Feather name="search" size={15} color="#9ca3af" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search members…"
                placeholderTextColor="#9ca3af"
                value={memberSearch}
                onChangeText={setMemberSearch}
                autoFocus
              />
            </View>
            <FlatList
              data={filteredMembers}
              keyExtractor={m => m.id}
              renderItem={({ item: m }) => (
                <TouchableOpacity style={styles.memberRow} onPress={() => selectMember(m)}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>{initials(m.name)}</Text>
                  </View>
                  <Text style={styles.memberName}>{m.name}</Text>
                  <Feather name="check" size={16} color={
                    (activeField === 'president' && president?.id === m.id) ||
                    (activeField === 'saa' && saa?.id === m.id)
                      ? '#8B1A1A' : 'transparent'
                  } />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No members found</Text>
                </View>
              }
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  flex: { flex: 1 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  backBtn: { width: 70 },
  backBtnText: { fontSize: 16, color: '#8B1A1A', fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 },

  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 8 },
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
  dateBtnIcon: { fontSize: 18 },
  dateBtnText: { fontSize: 15, color: '#111827', fontWeight: '500', flexShrink: 1 },

  pickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db',
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20,
  },
  pickerText: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '500' },
  pickerPlaceholder: { color: '#9ca3af' },

  stepperRow: {
    flexDirection: 'row', alignItems: 'center', gap: 0, marginBottom: 32,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db',
    borderRadius: 10, alignSelf: 'flex-start', overflow: 'hidden',
  },
  stepBtn: { paddingHorizontal: 20, paddingVertical: 14 },
  stepValue: { fontSize: 18, fontWeight: '700', color: '#111827', minWidth: 40, textAlign: 'center' },

  btn: { backgroundColor: '#8B1A1A', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Modals
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
  memberModalSheet: { maxHeight: '75%' },
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
});
