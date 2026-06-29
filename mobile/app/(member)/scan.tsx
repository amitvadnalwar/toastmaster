import { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '@/store';
import { checkinMeeting } from '@/services/meetingService';

export default function ScanScreen() {
  const { session } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scanned = useRef(false);

  const handleScan = useCallback(async ({ data }: BarcodeScanningResult) => {
    if (scanned.current || !session) return;
    scanned.current = true;
    setLoading(true);
    setError(null);

    try {
      const result = await checkinMeeting(data, session.access_token);
      router.replace(`/(member)/meeting/feedback/${result.meeting.id}` as any);
    } catch (e: any) {
      setError(e?.message ?? 'Invalid QR code. Please try again.');
      setLoading(false);
      // Allow retry after a short pause
      setTimeout(() => { scanned.current = false; }, 2000);
    }
  }, [session]);

  // Permission not yet determined
  if (!permission) {
    return <View style={s.safe} />;
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Scan QR Code</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={s.permBox}>
          <Feather name="camera-off" size={48} color="#d1d5db" />
          <Text style={s.permTitle}>Camera Access Required</Text>
          <Text style={s.permSub}>Allow camera access to scan the meeting QR code.</Text>
          <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
            <Text style={s.permBtnText}>Allow Camera</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Scan QR Code</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={s.cameraWrap}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={loading ? undefined : handleScan}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />

        {/* Overlay */}
        <View style={s.overlay}>
          <View style={s.overlayTop} />
          <View style={s.overlayRow}>
            <View style={s.overlaySide} />
            <View style={s.frame}>
              {/* Corner marks */}
              <View style={[s.corner, s.cornerTL]} />
              <View style={[s.corner, s.cornerTR]} />
              <View style={[s.corner, s.cornerBL]} />
              <View style={[s.corner, s.cornerBR]} />
            </View>
            <View style={s.overlaySide} />
          </View>
          <View style={s.overlayBottom}>
            {loading ? (
              <View style={s.statusRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={s.statusText}>Checking in…</Text>
              </View>
            ) : error ? (
              <View style={s.errorRow}>
                <Feather name="alert-circle" size={16} color="#fca5a5" />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : (
              <Text style={s.hintText}>Point your camera at the meeting QR code</Text>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const FRAME = 240;
const CORNER = 24;
const BORDER = 3;
const OVERLAY_BG = 'rgba(0,0,0,0.55)';

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#000',
  },
  backText: { fontSize: 16, color: '#fff', fontWeight: '600', width: 60 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff', flex: 1, textAlign: 'center' },

  cameraWrap: { flex: 1, position: 'relative' },

  // Darkened overlay with a clear square cutout
  overlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'column' },
  overlayTop: { flex: 1, backgroundColor: OVERLAY_BG },
  overlayRow: { flexDirection: 'row', height: FRAME },
  overlaySide: { flex: 1, backgroundColor: OVERLAY_BG },
  frame: {
    width: FRAME, height: FRAME,
    // transparent centre
  },
  overlayBottom: {
    flex: 1, backgroundColor: OVERLAY_BG,
    alignItems: 'center', justifyContent: 'flex-start', paddingTop: 28,
  },

  // Corner markers
  corner: {
    position: 'absolute', width: CORNER, height: CORNER,
    borderColor: '#fff', borderWidth: BORDER,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },

  hintText: { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', paddingHorizontal: 32 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 24 },
  errorText: { fontSize: 13, color: '#fca5a5', flex: 1, textAlign: 'center' },

  // Permission denied
  permBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 32, backgroundColor: '#fff' },
  permTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  permSub: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  permBtn: { backgroundColor: '#8B1A1A', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 28, marginTop: 8 },
  permBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
