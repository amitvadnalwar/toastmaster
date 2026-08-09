import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { ChevronLeft, Share2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getMeetingById } from '@/services/meetingService';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Meeting } from '@/types';

const GUEST_URL = `${window.location.origin}${import.meta.env.BASE_URL}guest`;

function downloadCanvas(id: string, filename: string) {
  const canvas = document.getElementById(id) as HTMLCanvasElement | null;
  if (!canvas) return;
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = filename;
  a.click();
}
async function shareCanvas(id: string, label: string) {
  const canvas = document.getElementById(id) as HTMLCanvasElement | null;
  if (!canvas) return;
  canvas.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], `${label}.png`, { type: 'image/png' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: `${label} QR Code` }); } catch { /* cancelled */ }
    } else {
      downloadCanvas(id, `${label}.png`);
    }
  });
}

export default function MeetingQrCodesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuthStore();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [fetching, setFetching] = useState(true);

  const load = useCallback(async () => {
    if (!session || !id) return;
    setFetching(true);
    try {
      setMeeting(await getMeetingById(id, session.access_token));
    } catch { /* ignore */ } finally {
      setFetching(false);
    }
  }, [session, id]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center text-brand font-semibold text-base w-[70px]">
            <ChevronLeft size={20} /> Back
          </button>
          <h1 className="text-lg font-bold text-gray-900 truncate">QR Codes</h1>
          <div className="w-[70px]" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-12 max-w-lg mx-auto w-full">
        {fetching || !meeting ? (
          <>
            <Skeleton className="w-48 h-6 rounded-full mb-4" />
            <Skeleton className="w-full h-72 rounded-2xl" />
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-5">{meeting.title}</h2>

            <SectionLabel>Member QR Code</SectionLabel>
            <QrCard
              hint="Members scan this to join the meeting (requires app)"
              canvasId="member-qr"
              value={`toastmasters://join?meeting_id=${meeting.id}`}
              meetingId={meeting.id}
              label="Member"
            />

            <div className="mt-6" />
            <SectionLabel>Guest QR Code</SectionLabel>
            <QrCard
              hint="Guests scan this to register (no app needed)"
              canvasId="guest-qr"
              value={`${GUEST_URL}?meeting_id=${meeting.id}`}
              meetingId={meeting.id}
              label="Guest"
            />
          </>
        )}
      </div>
    </div>
  );
}

function QrCard({ hint, canvasId, value, meetingId, label }: { hint: string; canvasId: string; value: string; meetingId: string; label: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center">
      <p className="text-[13px] text-gray-500 mb-5 text-center">{hint}</p>
      <div className="p-4 bg-white rounded-xl border border-gray-200">
        <QRCodeCanvas id={canvasId} value={value} size={200} level="M" />
      </div>
      <p className="text-[10px] text-gray-300 mt-4 text-center break-all">{meetingId}</p>
      <div className="flex gap-2 mt-4 w-full">
        <button onClick={() => downloadCanvas(canvasId, `${label}-qr.png`)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] bg-gray-50 text-gray-600 text-sm font-semibold">
          Save
        </button>
        <button onClick={() => shareCanvas(canvasId, label)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] bg-[#fef2f2] border border-red-200 text-brand text-sm font-semibold">
          <Share2 size={16} /> Share
        </button>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5">{children}</p>;
}
