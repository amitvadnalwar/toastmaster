import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { useAuthStore } from '@/store/authStore';
import { checkInToMeeting } from '@/services/meetingService';
import { MemberBottomNav } from '@/components/layout/BottomNav';
import { CheckCircle, XCircle } from 'lucide-react';

function extractMeetingId(text: string): string | null {
  try {
    if (text.startsWith('toastmasters://')) {
      const url = new URL(text.replace('toastmasters://', 'https://toastmasters.local/'));
      return url.searchParams.get('meeting_id');
    }
    const url = new URL(text);
    return url.searchParams.get('meeting_id');
  } catch {
    return null;
  }
}

export default function MemberScanPage() {
  const { session } = useAuthStore();
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (scanning || status !== 'idle') return;

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true,
      },
      false,
    );

    scanner.render(
      async (decodedText) => {
        const meetingId = extractMeetingId(decodedText);
        if (!meetingId || !session) {
          setStatus('error');
          setMessage('Invalid QR code. Please try again.');
          scanner.clear();
          return;
        }

        setScanning(true);
        scanner.clear();

        try {
          await checkInToMeeting(meetingId, session.access_token);
          setStatus('success');
          setMessage('Checked in successfully!');
        } catch (e: unknown) {
          setStatus('error');
          setMessage(e instanceof Error ? e.message : 'Check-in failed');
        }
      },
      () => {
        // scan error — ignore individual frame errors
      },
    );

    scannerRef.current = scanner;

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [session, status, scanning]);

  function reset() {
    setStatus('idle');
    setScanning(false);
    setMessage('');
  }

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 pt-5 pb-4 sticky top-0 z-20">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-black text-gray-900">Check In</h1>
          <p className="text-sm text-gray-500 mt-0.5">Scan the meeting QR code</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-28 max-w-lg mx-auto w-full px-4 pt-6">
        {status === 'idle' && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div id="qr-reader" className="w-full" />
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle size={44} className="text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 mb-1">Checked In!</h2>
              <p className="text-gray-500 text-sm">{message}</p>
            </div>
            <button
              onClick={reset}
              className="mt-4 text-brand font-bold text-sm border border-brand rounded-xl px-6 py-3 active:bg-brand-50"
            >
              Scan Again
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle size={44} className="text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 mb-1">Check-in Failed</h2>
              <p className="text-gray-500 text-sm">{message}</p>
            </div>
            <button
              onClick={reset}
              className="mt-4 text-brand font-bold text-sm border border-brand rounded-xl px-6 py-3 active:bg-brand-50"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      <MemberBottomNav />
    </div>
  );
}
