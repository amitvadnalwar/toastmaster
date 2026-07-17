import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { ChevronLeft, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { checkinMeeting } from '@/services/meetingService';

export default function MemberScanPage() {
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannedRef = useRef(false);

  useEffect(() => {
    const el = document.getElementById('qr-reader');
    if (!el) return;

    const scanner = new Html5Qrcode('qr-reader', { verbose: false });
    scannerRef.current = scanner;

    let cancelled = false;

    async function handleScan(decodedText: string) {
      if (scannedRef.current || !session) return;
      scannedRef.current = true;
      setLoading(true);
      setError(null);
      try {
        await scanner.stop();
      } catch { /* already stopping */ }
      try {
        const result = await checkinMeeting(decodedText, session.access_token);
        navigate(`/meetings/${result.meeting.id}/feedback`, { replace: true });
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Invalid QR code. Please try again.');
        setLoading(false);
        setTimeout(() => {
          scannedRef.current = false;
          if (!cancelled) start();
        }, 2000);
      }
    }

    function start() {
      scanner
        .start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 240, height: 240 } }, handleScan, undefined)
        .catch((e) => setError(e instanceof Error ? e.message : 'Camera access required'));
    }

    start();

    return () => {
      cancelled = true;
      scanner.stop().catch(() => {}).finally(() => scanner.clear());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  return (
    <div className="flex flex-col min-h-full bg-black">
      <div className="bg-black px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center text-white font-semibold text-base w-[60px]">
            <ChevronLeft size={20} /> Back
          </button>
          <h1 className="text-[17px] font-bold text-white">Scan QR Code</h1>
          <div className="w-[60px]" />
        </div>
      </div>

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
    </div>
  );
}
