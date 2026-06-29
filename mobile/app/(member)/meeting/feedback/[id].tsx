import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAuthStore } from '@/store';
import { getMeetingRoster, getMyFeedback, submitFeedback } from '@/services/meetingService';
import type { MeetingRoleAssignment, SpeakerFeedback, SpeakerFeedbackPayload } from '@/types';

interface SpeakerRow {
  assignment: MeetingRoleAssignment;
  rating: number;
  comment: string;
}

function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={s.stars}>
      {[1, 2, 3, 4, 5].map(n => (
        <TouchableOpacity key={n} onPress={() => onChange(n)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
          <Feather
            name="star"
            size={30}
            color={n <= value ? '#f59e0b' : '#e5e7eb'}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function MeetingFeedbackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthStore();

  const [speakers, setSpeakers] = useState<SpeakerRow[]>([]);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [fetching, setFetching] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!session || !id) return;
    setFetching(true);
    try {
      const [rosterData, existing] = await Promise.all([
        getMeetingRoster(id, session.access_token),
        getMyFeedback(id, session.access_token),
      ]);

      setMeetingTitle(rosterData.meeting.title);

      const feedbackMap = new Map<string, SpeakerFeedback>(
        existing.map(fb => [fb.speaker_member_id, fb])
      );

      const rows: SpeakerRow[] = rosterData.roster
        .filter(r => r.role === 'speaker')
        .map(a => {
          const prev = feedbackMap.get(a.member_id);
          return {
            assignment: a,
            rating: prev?.rating ?? 0,
            comment: prev?.comment ?? '',
          };
        });

      setSpeakers(rows);
    } catch { } finally { setFetching(false); }
  }, [session, id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const updateRating = (index: number, rating: number) => {
    setSpeakers(prev => prev.map((r, i) => i === index ? { ...r, rating } : r));
  };

  const updateComment = (index: number, comment: string) => {
    setSpeakers(prev => prev.map((r, i) => i === index ? { ...r, comment } : r));
  };

  const handleSubmit = async () => {
    const unrated = speakers.filter(r => r.rating === 0);
    if (unrated.length > 0) {
      Alert.alert('Rating required', 'Please rate all speakers before submitting.');
      return;
    }

    if (!session || !id) return;
    setSubmitting(true);
    try {
      const payload: SpeakerFeedbackPayload[] = speakers.map(r => ({
        speaker_member_id: r.assignment.member_id,
        rating: r.rating,
        comment: r.comment.trim() || null,
      }));
      await submitFeedback(id, payload, session.access_token);
      Alert.alert('Feedback submitted', 'Thank you for your feedback!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (fetching) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}><Text style={s.backText}>‹ Back</Text></TouchableOpacity>
          <Text style={s.headerTitle}>Speaker Feedback</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={s.loadingBox}><ActivityIndicator color="#8B1A1A" size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>Speaker Feedback</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <View style={s.meetingChip}>
          <Feather name="check-circle" size={14} color="#16a34a" />
          <Text style={s.meetingChipText}>Checked in · {meetingTitle}</Text>
        </View>

        {speakers.length === 0 ? (
          <View style={s.emptyBox}>
            <Feather name="mic-off" size={36} color="#d1d5db" />
            <Text style={s.emptyText}>No speakers in this meeting.</Text>
          </View>
        ) : (
          <>
            <Text style={s.intro}>Rate each speaker's performance and leave optional comments.</Text>

            {speakers.map((row, i) => (
              <View key={row.assignment.id} style={s.card}>
                <View style={s.cardHeader}>
                  <View style={s.speakerCircle}>
                    <Text style={s.speakerInitial}>
                      {(row.assignment.member_name ?? '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={s.cardHeaderText}>
                    <Text style={s.speakerName}>{row.assignment.member_name ?? '—'}</Text>
                    {row.assignment.speech_duration ? (
                      <Text style={s.speechDuration}>{row.assignment.speech_duration}</Text>
                    ) : null}
                  </View>
                  {row.rating > 0 && (
                    <Text style={s.ratingLabel}>{row.rating}/5</Text>
                  )}
                </View>

                <StarRating value={row.rating} onChange={n => updateRating(i, n)} />

                <TextInput
                  style={s.commentInput}
                  placeholder="Add a comment (optional)…"
                  placeholderTextColor="#9ca3af"
                  value={row.comment}
                  onChangeText={t => updateComment(i, t)}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {speakers.length > 0 && (
        <View style={s.ctaBar}>
          <TouchableOpacity
            style={[s.submitBtn, submitting && s.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.submitBtnText}>Submit Feedback</Text>
            }
          </TouchableOpacity>
        </View>
      )}
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
  scroll: { padding: 16, paddingBottom: 32 },

  meetingChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f0fdf4', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    alignSelf: 'flex-start', marginBottom: 16, borderWidth: 1, borderColor: '#bbf7d0',
  },
  meetingChipText: { fontSize: 13, fontWeight: '600', color: '#15803d' },

  intro: { fontSize: 13, color: '#6b7280', marginBottom: 16 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  speakerCircle: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center',
  },
  speakerInitial: { fontSize: 18, fontWeight: '700', color: '#3b82f6' },
  cardHeaderText: { flex: 1 },
  speakerName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  speechDuration: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  ratingLabel: { fontSize: 14, fontWeight: '700', color: '#f59e0b' },

  stars: { flexDirection: 'row', gap: 10, marginBottom: 14 },

  commentInput: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    padding: 12, fontSize: 14, color: '#111827',
    minHeight: 80, backgroundColor: '#fafafa',
  },

  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#9ca3af' },

  ctaBar: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  submitBtn: {
    backgroundColor: '#8B1A1A', borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
