// Both the member and guest QR codes encode a URL/deep-link with a
// `meeting_id` query param (see MeetingQrCodesPage). Falls back to treating
// the scanned text as a bare id if it isn't a URL at all.
export function extractMeetingId(decodedText: string): string {
  try {
    return new URL(decodedText).searchParams.get('meeting_id') ?? decodedText;
  } catch {
    return decodedText;
  }
}

export function isCameraPermissionDenied(message: string): boolean {
  return /NotAllowedError|Permission denied|denied/i.test(message);
}
