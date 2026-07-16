import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import {
  Download, Share2, Users, ChevronDown, ChevronUp,
  Calendar, MapPin, Clock, Mic, MessageSquare,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getMeetingRoster, updateMeeting } from '@/services/meetingService';
import { getMembers } from '@/services/memberService';
import { AdminBottomNav } from '@/components/layout/BottomNav';
import PageHeader from '@/components/layout/PageHeader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { SINGLETON_ROLES, ROLE_LABELS } from '@/types';
import type { MeetingWithRoster, RosterEntry, Member, MeetingStatus } from '@/types';
import { formatDate, formatTime } from '@/lib/utils';

const GUEST_URL_BASE = 'https://amitvadnalwar.github.io/toastmaster/guest-web/';

function downloadQR(canvasId: string, filename: string) {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!canvas) return;
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}

async function shareQR(canvasId: string, title: string) {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!canvas) return;
  canvas.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], `${title}.png`, { type: 'image/png' });
    if (navigator.share && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title });
    } else {
      downloadQR(canvasId, `${title}.png`);
    }
  });
}

interface RosterRowProps {
  role: string;
  name?: string | null;
  sub?: string;
}

function RosterRow({ role, name, sub }: RosterRowProps) {
  const filled = !!name;
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">
          {ROLE_LABELS[role] ?? role}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {filled ? (
        <span className="text-sm font-semibold text-gray-900 truncate max-w-[130px]">{name}</span>
      ) : (
        <span className="text-xs font-semibold text-gray-300">Open</span>
      )}
    </div>
  );
}

export default function AdminMeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session, appRole } = useAuthStore();
  const isSuperAdmin = appRole === 'super_admin';

  const [data, setData] = useState<MeetingWithRoster | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!session || !id) return;
    try {
      const [roster, mems] = await Promise.all([
        getMeetingRoster(id, session.access_token),
        getMembers(session.access_token),
      ]);
      setData(roster);
      setMembers(mems);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [session, id]);

  useEffect(() => { load(); }, [load]);

  async function changeStatus(status: MeetingStatus) {
    if (!session || !id || !data) return;
    setUpdating(true);
    try {
      const updated = await updateMeeting(id, { status }, session.access_token);
      setData((prev) => prev ? { ...prev, meeting: { ...prev.meeting, status: updated.status } } : prev);
    } finally {
      setUpdating(false);
    }
  }

  async function toggleVoting() {
    if (!session || !id || !data) return;
    setUpdating(true);
    try {
      const updated = await updateMeeting(
        id,
        { voting_open: !data.meeting.voting_open },
        session.access_token,
      );
      setData((prev) =>
        prev ? { ...prev, meeting: { ...prev.meeting, voting_open: updated.voting_open } } : prev,
      );
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <div className="flex flex-col min-h-full bg-gray-50"><PageHeader title="Meeting Details" back /><PageSpinner /></div>;
  if (!data) return <div className="flex flex-col min-h-full bg-gray-50"><PageHeader title="Meeting Details" back /><p className="text-center mt-20 text-gray-500">Not found</p></div>;

  const { meeting, roster } = data;
  const speakers = roster.filter((r) => r.role === 'speaker');
  const evaluators = roster.filter((r) => r.role === 'evaluator');
  const tableTopicsSpeakers = roster.filter((r) => r.role === 'table_topics_speaker');

  const memberQrValue = `toastmasters://join?meeting_id=${meeting.id}`;
  const guestQrValue = `${GUEST_URL_BASE}?meeting_id=${meeting.id}`;

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <PageHeader
        title="Meeting Details"
        back
        right={
          <button
            onClick={() => navigate(`/admin/meetings/${id}/edit`)}
            className="text-brand text-sm font-bold px-3 py-1.5 rounded-lg hover:bg-brand-50"
          >
            Edit
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto pb-28 max-w-lg mx-auto w-full">
        {/* Info card */}
        <div className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h2 className="text-lg font-black text-gray-900 flex-1 leading-tight">{meeting.title}</h2>
            <Badge variant={meeting.status === 'published' ? 'published' : meeting.status === 'draft' ? 'draft' : 'completed'}>
              {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
            </Badge>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <Calendar size={12} /><span>{formatDate(meeting.scheduled_at)}</span>
              <span className="text-gray-300">·</span>
              <Clock size={12} /><span>{formatTime(meeting.scheduled_at)}</span>
            </div>
            {meeting.venue && (
              <div className="flex items-center gap-2 text-gray-500 text-xs">
                <MapPin size={12} /><span>{meeting.venue}</span>
              </div>
            )}
            {meeting.theme && (
              <p className="text-xs text-gray-500 italic">"{meeting.theme}"</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mx-4 mt-3 bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Actions</p>

          {meeting.status === 'draft' && (
            <Button variant="primary" fullWidth onClick={() => changeStatus('published')} loading={updating}>
              Publish Meeting
            </Button>
          )}
          {meeting.status === 'published' && (
            <>
              <Button variant="outline" fullWidth onClick={() => changeStatus('completed')} loading={updating}>
                Mark Completed
              </Button>
              <Button
                variant={meeting.voting_open ? 'danger' : 'ghost'}
                fullWidth
                onClick={toggleVoting}
                loading={updating}
              >
                {meeting.voting_open ? 'Close Voting' : 'Open Voting'}
              </Button>
            </>
          )}
          {meeting.status === 'completed' && (
            <p className="text-sm text-gray-500 text-center py-2">Meeting completed</p>
          )}
        </div>

        {/* QR Codes */}
        <div className="mx-4 mt-3 bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50"
            onClick={() => setShowQR((v) => !v)}
          >
            <span className="font-bold text-gray-800 text-sm">QR Codes</span>
            {showQR ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
          </button>

          {showQR && (
            <div className="px-4 pb-4 grid grid-cols-2 gap-4">
              {/* Member QR */}
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs font-bold text-gray-500">Member Check-In</p>
                <div className="p-2 bg-white border border-gray-100 rounded-xl">
                  <QRCodeCanvas id="member-qr" value={memberQrValue} size={120} level="M" />
                </div>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => downloadQR('member-qr', 'member-checkin-qr')}
                    className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold text-gray-600 bg-gray-50 rounded-lg py-2 active:bg-gray-100"
                  >
                    <Download size={13} />
                    Save
                  </button>
                  <button
                    onClick={() => shareQR('member-qr', 'member-checkin-qr')}
                    className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold text-brand bg-brand-50 rounded-lg py-2 active:bg-brand-100"
                  >
                    <Share2 size={13} />
                    Share
                  </button>
                </div>
              </div>

              {/* Guest QR */}
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs font-bold text-gray-500">Guest Feedback</p>
                <div className="p-2 bg-white border border-gray-100 rounded-xl">
                  <QRCodeCanvas id="guest-qr" value={guestQrValue} size={120} level="M" />
                </div>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => downloadQR('guest-qr', 'guest-feedback-qr')}
                    className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold text-gray-600 bg-gray-50 rounded-lg py-2 active:bg-gray-100"
                  >
                    <Download size={13} />
                    Save
                  </button>
                  <button
                    onClick={() => shareQR('guest-qr', 'guest-feedback-qr')}
                    className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold text-brand bg-brand-50 rounded-lg py-2 active:bg-brand-100"
                  >
                    <Share2 size={13} />
                    Share
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Singleton roles */}
        <p className="mx-4 mt-5 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
          Role Players
        </p>
        <div className="mx-4 bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
          {SINGLETON_ROLES.map((role) => {
            const entry = roster.find((r) => r.role === role);
            return <RosterRow key={role} role={role} name={entry?.member_name} />;
          })}
        </div>

        {/* Speakers */}
        <div className="mx-4 mt-4 flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Speakers</p>
          <span className="text-xs font-bold text-gray-400">
            {speakers.length} / {meeting.max_speakers}
          </span>
        </div>
        <div className="mx-4 bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
          {speakers.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-400">No speakers enrolled</div>
          ) : (
            speakers.map((sp) => (
              <RosterRow key={sp.id} role="speaker" name={sp.member_name} sub={sp.speech_title ?? undefined} />
            ))
          )}
        </div>

        {/* Evaluators */}
        {speakers.length > 0 && (
          <>
            <p className="mx-4 mt-4 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
              Evaluators
            </p>
            <div className="mx-4 bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
              {speakers.map((sp) => {
                const ev = evaluators.find((e) => e.evaluates_member_id === sp.member_id);
                return (
                  <RosterRow
                    key={`ev-${sp.id}`}
                    role="evaluator"
                    name={ev?.member_name}
                    sub={`For ${sp.member_name ?? '—'}`}
                  />
                );
              })}
            </div>
          </>
        )}

        {/* Table Topics Speakers */}
        {tableTopicsSpeakers.length > 0 && (
          <>
            <p className="mx-4 mt-4 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
              Table Topics Speakers
            </p>
            <div className="mx-4 bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
              {tableTopicsSpeakers.map((sp) => (
                <RosterRow key={sp.id} role="table_topics_speaker" name={sp.member_name} />
              ))}
            </div>
          </>
        )}

        {error && (
          <div className="mx-4 mt-4 bg-red-50 rounded-xl p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>

      <AdminBottomNav isSuperAdmin={isSuperAdmin} />
    </div>
  );
}
