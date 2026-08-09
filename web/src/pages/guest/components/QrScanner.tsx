import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { ChevronLeft, AlertCircle, VideoOff } from 'lucide-react';
import { extractMeetingId, isCameraPermissionDenied } from '@/lib/qr';

interface Props {
  onScan: (meetingId: string) => void;
  onCancel: () => void;
}

export default function QrScanner({ onScan, onCancel }: Props) {
  const [error, setError] = useState<string | null>(null);
  // Camera never started at all (permission denied, no camera, construction
  // failure, anything) — distinct from a scan error, which should keep the
  // camera live and let the guest try again.
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const scannedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let scanner: Html5Qrcode | null = null;

    function fail(message: string) {
      if (cancelled) return;
      setError(message);
      setCameraBlocked(true);
      if (scanner) {
        try { scanner.clear(); } catch { /* nothing to clear */ }
      }
    }

    function handleScan(decodedText: string) {
      if (scannedRef.current || !scanner) return;
      scannedRef.current = true;
      try { scanner.stop(); } catch { /* already stopping */ }
      onScan(extractMeetingId(decodedText));
    }

    function startScanning() {
      if (!scanner || cancelled) return;
      try {
        scanner
          .start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 240, height: 240 } }, handleScan, undefined)
          .catch((e: unknown) => {
            const message = e instanceof Error ? e.message : String(e);
            fail(
              isCameraPermissionDenied(message)
                ? 'Camera access was denied. Please allow camera access to check in.'
                : 'Could not start the camera on this device.',
            );
          });
      } catch {
        fail('Could not start the camera on this device.');
      }
    }

    try {
      const el = document.getElementById('guest-qr-reader');
      if (!el) {
        fail('Could not start the camera on this device.');
      } else {
        scanner = new Html5Qrcode('guest-qr-reader', { verbose: false });
        startScanning();
      }
    } catch {
      fail('Could not start the camera on this device.');
    }

    return () => {
      cancelled = true;
      if (scanner) {
        try {
          scanner.stop().catch(() => {}).finally(() => {
            try { scanner!.clear(); } catch { /* nothing to clear */ }
          });
        } catch {
          try { scanner.clear(); } catch { /* nothing to clear */ }
        }
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={onCancel} className="flex items-center text-white font-semibold text-base w-[60px]">
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
            onClick={onCancel}
            className="mt-2 bg-brand text-white rounded-xl px-6 py-3 text-sm font-bold active:scale-95 transition-transform"
          >
            Go Back
          </button>
        </div>
      ) : (
        <div className="flex-1 relative max-w-lg mx-auto w-full">
          <div id="guest-qr-reader" className="w-full" />
          <div className="absolute inset-x-0 bottom-10 flex justify-center px-8">
            {error ? (
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
