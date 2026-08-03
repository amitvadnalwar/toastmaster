import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CheckCircle2, Users, Send } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { showAlert } from '@/store/alertStore';
import { getMeetingRoster, getAllAttendance, getSpeakersFeedbackStatus, publishSpeakerFeedback } from '@/services/meetingService';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Meeting, MeetingRoleAssignment, Attendance, SpeakerFeedbackStatus } from '@/types';
import { formatDateTime } from '@/lib/utils';

export default function FeedbackDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuthStore();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [speakers, setSpeakers] = useState<MeetingRoleAssignment[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [feedbackStatus, setFeedbackStatus] = useState<SpeakerFeedbackStatus[]>([]);
  const [fetching, setFetching] = useState(true);
  const [publishing, setPublishing] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session || !id) return;
    setFetching(true);
    try {
      const [rosterData, attendanceList, statusList] = await Promise.all([
        getMeetingRoster(id, session.access_token),
        getAllAttendance(id, session.access_token),
        getSpeakersFeedbackStatus(id, session.access_token),
      ]);
      setMeeting(rosterData.meeting);
      setSpeakers(rosterData.roster.filter((r) => r.role === 'speaker'));
      setAttendance(attendanceList);
      setFeedbackStatus(statusList);
    } catch { /* ignore */ } finally {
      setFetching(false);
    }
  }, [session, id]);

  useEffect(() => { load(); }, [load]);

  async function handlePublish(speakerMemberId: string) {
    if (!session || !id) return;
    setPublishing(speakerMemberId);
    try {
      await publishSpeakerFeedback(id, speakerMemberId, session.access_token);
      const fresh = await getSpeakersFeedbackStatus(id, session.access_token);
      setFeedbackStatus(fresh);
      await showAlert('Feedback published to the speaker.');
    } catch (e: unknown) {
      await showAlert(e instanceof Error ? e.message : 'Failed to publish feedback.');
    } finally {
      setPublishing(null);
    }
  }

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center text-brand font-semibold text-base w-[70px]">
            <ChevronLeft size={20} /> Back
          </button>
          <h1 className="text-lg font-bold text-gray-900 truncate">Feedback Details</h1>
          <div className="w-[70px]" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-12 max-w-lg mx-auto w-full">
        {fetching ? (
          <>
            <Skeleton className="w-48 h-6 rounded-full mb-4" />
            <Skeleton className="w-full h-16 rounded-2xl mb-2.5" />
            <Skeleton className="w-full h-16 rounded-2xl" />
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-5">{meeting?.title}</h2>

            {/* Speakers — publish feedback to them */}
            <SectionLabel>Speakers</SectionLabel>
            {speakers.length === 0 ? (
              <div className="bg-white rounded-2xl p-4 shadow-sm mb-5 text-center text-[13px] text-gray-400">No speakers in this meeting</div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-5">
                {speakers.map((s, i) => {
                  const st = feedbackStatus.find((f) => f.speaker_member_id === s.member_id);
                  return (
                    <div key={s.id}>
                      {i > 0 && <div className="h-px bg-gray-100 mx-4" />}
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{s.member_name ?? '—'}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {!st?.has_feedback ? 'No feedback yet' : st.published ? 'Published to speaker' : 'Feedback received — not published'}
                          </p>
                        </div>
                        {st?.has_feedback && !st.published && (
                          <button
                            onClick={() => handlePublish(s.member_id)}
                            disabled={publishing === s.member_id}
                            className="flex items-center gap-1.5 bg-brand text-white text-[13px] font-semibold rounded-lg px-3 py-2 disabled:opacity-60"
                          >
                            <Send size={13} /> {publishing === s.member_id ? 'Publishing…' : 'Publish'}
                          </button>
                        )}
                        {st?.published && <CheckCircle2 size={18} className="text-green-500 shrink-0" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Checked-in members — votes & overall rating */}
            <SectionLabel>Checked-in Members</SectionLabel>
            <p className="text-[13px] text-gray-500 mb-3">Select a member to see their votes and overall meeting rating.</p>
            {attendance.length === 0 ? (
              <div className="flex flex-col items-center gap-3 pt-8">
                <Users size={36} className="text-gray-300" />
                <p className="text-sm text-gray-400">No one has checked in yet.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {attendance.map((a, i) => (
                  <button
                    key={a.member_id}
                    onClick={() => navigate(`/meetings/${id}/feedback-details/${a.member_id}`)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left ${i > 0 ? 'border-t border-gray-100' : ''}`}
                  >
                    <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{a.member_name ?? '—'}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Checked in {formatDateTime(a.checked_in_at)}</p>
                    </div>
                    <ChevronRight size={18} className="text-gray-400 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5">{children}</p>;
}
