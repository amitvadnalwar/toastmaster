import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

export default function JoinScreen() {
  const { meeting_id } = useLocalSearchParams<{ meeting_id: string }>();
  const [contact, setContact] = useState('');

  function handleLookup() {
    // TODO: call POST /onboarding/lookup with email or phone
    // Route to /(guest)/register if not found, or /(auth)/login if member
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          <Text style={styles.logo}>🎤</Text>
          <Text style={styles.title}>Welcome to Toastmasters!</Text>
          <Text style={styles.subtitle}>
            Enter your email or phone number to get started with today's meeting.
          </Text>

          <Text style={styles.label}>Email or phone</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com or +91..."
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={contact}
            onChangeText={setContact}
            onSubmitEditing={handleLookup}
            returnKeyType="go"
          />

          <TouchableOpacity
            style={[styles.btn, !contact.trim() && styles.btnDisabled]}
            onPress={handleLookup}
            disabled={!contact.trim()}
          >
            <Text style={styles.btnText}>Continue</Text>
          </TouchableOpacity>

          {meeting_id ? (
            <Text style={styles.meetingHint}>Meeting ID: {meeting_id.slice(0, 8)}…</Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
  },
  logo: { fontSize: 56, textAlign: 'center', marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 10 },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
  },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    marginBottom: 16,
  },
  btn: {
    backgroundColor: '#8B1A1A',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  meetingHint: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 20 },
});