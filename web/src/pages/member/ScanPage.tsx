import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { ChevronLeft, AlertCircle, VideoOff } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { checkinMeeting } from '@/services/meetingService';

function isPermissionDenied(message: string): boolean {
  return /NotAllowedError|Permission denied|denied/i.test(message);
}

// The printed/scanned QR encodes a deep link, e.g.
// "toastmasters://join?meeting_id=<uuid>" — same convention the guest
// check-in flow already uses. Falls back to treating the scanned text as a
// bare id if it isn't a URL at all.
function extractMeetingId(decodedText: string): string {
  try {
    return new URL(decodedText).searchParams.get('meeting_id') ?? decodedText;
  } catch {
    return decodedText;
  }
}

export default function MemberScanPage() {
  const navigate = useNavigate();
  const { session } = useAuthStore();
  // Depend on the token string, not the session object — Supabase's
  // autoRefreshToken replaces the session object (new reference) at each
  // natural token refresh even when the token itself is still effectively
  // the same session; keying off the object would restart the camera and
  // interrupt an in-progress scan every time that happens.
  const accessToken = session?.access_token;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Camera never started at all (permission denied, no camera, construction
  // failure, anything) — distinct from a scan/checkin error, which should
  // keep retrying with the camera live.
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let scanner: Html5Qrcode | null = null;

    // Every path that can end scanning funnels through here — guarantees we
    // always land in a stable fallback state instead of an uncaught throw.
    function fail(message: string) {
      if (cancelled) return;
      setError(message);
      setCameraBlocked(true);
      if (scanner) {
        try { scanner.clear(); } catch { /* nothing to clear */ }
      }
    }

    async function handleScan(decodedText: string) {
      if (scannedRef.current || !accessToken || !scanner) return;
      scannedRef.current = true;
      setLoading(true);
      setError(null);
      try {
        await scanner.stop();
      } catch { /* already stopping */ }
      try {
        const meetingId = extractMeetingId(decodedText);
        const result = await checkinMeeting(meetingId, accessToken);
        navigate(`/meetings/${result.meeting.id}/feedback`, { replace: true });
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Invalid QR code. Please try again.');
        setLoading(false);
        setTimeout(() => {
          scannedRef.current = false;
          if (!cancelled) startScanning();
        }, 2000);
      }
    }

    function startScanning() {
      if (!scanner || cancelled) return;
      try {
        scanner
          .start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 240, height: 240 } }, handleScan, undefined)
          .catch((e: unknown) => {
            // html5-qrcode rejects with a plain string, not an Error, on
            // some browsers — normalize before inspecting it.
            const message = e instanceof Error ? e.message : String(e);
            fail(
              isPermissionDenied(message)
                ? 'Camera access was denied. Please allow camera access to check in.'
                : 'Could not start the camera on this device.',
            );
          });
      } catch {
        // .start() throwing synchronously instead of rejecting, on some
        // browser/device combinations.
        fail('Could not start the camera on this device.');
      }
    }

    try {
      const el = document.getElementById('qr-reader');
      if (!el) {
        fail('Could not start the camera on this device.');
      } else {
        scanner = new Html5Qrcode('qr-reader', { verbose: false });
        scannerRef.current = scanner;
        startScanning();
      }
    } catch {
      // Constructing Html5Qrcode itself can throw on some browsers/devices
      // that lack camera APIs entirely — never let that crash the page.
      fail('Could not start the camera on this device.');
    }

    return () => {
      cancelled = true;
      if (scanner) {
        // stop() throws SYNCHRONOUSLY ("Cannot stop, scanner is not running
        // or paused") if called before start() has resolved — e.g. React
        // StrictMode's synthetic unmount racing ahead of a still-pending
        // getUserMedia prompt. A .catch() alone doesn't help since it never
        // gets attached if stop() throws before returning a promise at all.
        try {
          scanner.stop().catch(() => {}).finally(() => {
            try { scanner!.clear(); } catch { /* nothing to clear */ }
          });
        } catch {
          try { scanner.clear(); } catch { /* nothing to clear */ }
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  return (
    <div className="flex flex-col min-h-full bg-black">
      <div className="bg-black px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate('/home')} className="flex items-center text-white font-semibold text-base w-[60px]">
            <ChevronLeft size={20} /> Back
          </button>
          <h1 className="text-[17px] font-bold text-white">Scan QR Code</h1>
          <div className="w-[60px]" />
        </div>
      </div>

      {cameraBlocked ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
            <VideoOff size={28} className="text-white/70" />
          </div>
          <p className="text-white text-[15px] font-medium">{error}</p>
          <button
            onClick={() => navigate('/home', { replace: true })}
            className="mt-2 bg-brand text-white rounded-xl px-6 py-3 text-sm font-bold active:scale-95 transition-transform"
          >
            Back to Dashboard
          </button>
        </div>
      ) : (
        <div className="flex-1 relative max-w-lg mx-auto w-full">
          <div id="qr-reader" className="w-full" />
          <div className="absolute inset-x-0 bottom-10 flex justify-center px-8">
            {loading ? (
              <div className="flex items-center gap-2 text-white">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-semibold">Checking in…</span>
              </div>
            ) : error ? (
              <div className="flex items-center gap-1.5 text-red-300">
                <AlertCircle size={16} />
                <span className="text-[13px] text-center">{error}</span>
              </div>
            ) : (
              <p className="text-sm text-white/75 text-center">Point your camera at the meeting QR code</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
