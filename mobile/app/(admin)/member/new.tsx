import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useAuthStore } from '@/store';
import { createMember } from '@/services/memberService';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s\-().]{7,15}$/;

function validate(name: string, email: string, phone: string) {
  if (!name.trim()) return 'Full name is required';
  if (!email.trim()) return 'Email is required';
  if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email address';
  if (!phone.trim()) return 'Mobile number is required';
  if (!PHONE_RE.test(phone.trim())) return 'Enter a valid mobile number';
  return null;
}

export default function NewMemberScreen() {
  const session = useAuthStore((s) => s.session);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // DOB state — stored as MM-DD
  const [dobDate, setDobDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function formatDob(d: Date) {
    const dd = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${dd} ${d.toLocaleString('default', { month: 'short' })} ${year}`;
  }

  function dobToMmDd(d: Date) {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${mm}-${dd}`;
  }

  function onAndroidChange(_e: DateTimePickerEvent, selected?: Date) {
    setShowPicker(false);
    if (selected) setDobDate(selected);
  }

  function onIosChange(_e: DateTimePickerEvent, selected?: Date) {
    if (selected) setTempDate(selected);
  }

  function confirmIos() {
    setDobDate(tempDate);
    setShowPicker(false);
  }

  function openDobPicker() {
    setTempDate(dobDate ?? new Date(2000, 0, 1));
    setShowPicker(true);
  }

  function clearDob() {
    setDobDate(null);
  }

  function touch(field: string) {
    setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  async function handleSubmit() {
    const err = validate(name, email, phone);
    if (err) {
      const field = err.toLowerCase().includes('name')
        ? 'name'
        : err.toLowerCase().includes('email')
        ? 'email'
        : 'phone';
      setErrors({ [field]: err });
      return;
    }

    if (!session) return;
    setSubmitting(true);
    try {
      await createMember(
        {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          birthday: dobDate ? dobToMmDd(dobDate) : undefined,
        },
        session.access_token,
      );
      Alert.alert(
        'Member Added',
        `An invitation email has been sent to ${email.trim()} to set up their account.`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create member');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Member</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Full Name */}
          <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.name ? styles.inputError : null]}
            placeholder="e.g. Priya Sharma"
            placeholderTextColor="#9ca3af"
            value={name}
            onChangeText={(v) => { setName(v); touch('name'); }}
            autoCapitalize="words"
            returnKeyType="next"
          />
          {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}

          {/* Email */}
          <Text style={styles.label}>Email <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.email ? styles.inputError : null]}
            placeholder="member@example.com"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={(v) => { setEmail(v); touch('email'); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

          {/* Mobile */}
          <Text style={styles.label}>Mobile <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.phone ? styles.inputError : null]}
            placeholder="+91 98765 43210"
            placeholderTextColor="#9ca3af"
            value={phone}
            onChangeText={(v) => { setPhone(v); touch('phone'); }}
            keyboardType="phone-pad"
            returnKeyType="done"
          />
          {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}

          {/* Date of Birth (optional) */}
          <Text style={styles.label}>Date of Birth <Text style={styles.optional}>(optional)</Text></Text>
          <View style={styles.dobRow}>
            <TouchableOpacity style={styles.dobBtn} onPress={openDobPicker}>
              <Feather name="calendar" size={15} color="#6b7280" />
              <Text style={[styles.dobBtnText, !dobDate && styles.dobPlaceholder]}>
                {dobDate ? formatDob(dobDate) : 'Select date'}
              </Text>
            </TouchableOpacity>
            {dobDate ? (
              <TouchableOpacity style={styles.clearBtn} onPress={clearDob}>
                <Feather name="x" size={16} color="#9ca3af" />
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.dobHint}>Only month and day are stored for birthday reminders.</Text>

          {Platform.OS === 'android' && showPicker && (
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="default"
              maximumDate={new Date()}
              onChange={onAndroidChange}
            />
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Add Member &amp; Send Invite</Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* iOS date picker modal */}
      {Platform.OS === 'ios' && (
        <Modal
          transparent
          animationType="slide"
          visible={showPicker}
          onRequestClose={() => setShowPicker(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.modalCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Date of Birth</Text>
                <TouchableOpacity onPress={confirmIos}>
                  <Text style={styles.modalDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={onIosChange}
                style={styles.iosPicker}
                textColor="#111827"
              />
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  flex: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backBtn: { width: 70 },
  backBtnText: { fontSize: 16, color: '#8B1A1A', fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827', flex: 1, textAlign: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 },

  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  required: { color: '#ef4444' },
  optional: { color: '#9ca3af', fontWeight: '400' },

  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    marginBottom: 6,
  },
  inputError: { borderColor: '#ef4444' },
  errorText: { fontSize: 12, color: '#ef4444', marginBottom: 14 },

  dobRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  dobBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dobBtnText: { fontSize: 15, color: '#111827', fontWeight: '500' },
  dobPlaceholder: { color: '#9ca3af', fontWeight: '400' },
  clearBtn: { padding: 10 },
  dobHint: { fontSize: 12, color: '#9ca3af', marginBottom: 28 },

  submitBtn: {
    backgroundColor: '#8B1A1A',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // iOS modal
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  modalCancel: { fontSize: 16, color: '#6b7280' },
  modalDone: { fontSize: 16, color: '#8B1A1A', fontWeight: '700' },
  iosPicker: { width: '100%' },
});