// Remembers a guest's identity per meeting on this device, so re-scanning the
// same meeting's QR code resumes their feedback instead of registering them
// as a new guest.

interface StoredGuest {
  id: string;
  name: string;
}

function storageKey(meetingId: string): string {
  return `tm-guest:${meetingId}`;
}

export function getStoredGuest(meetingId: string): StoredGuest | null {
  try {
    const raw = localStorage.getItem(storageKey(meetingId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.id === 'string' && typeof parsed?.name === 'string') return parsed;
    return null;
  } catch {
    return null;
  }
}

export function storeGuest(meetingId: string, guest: StoredGuest): void {
  try {
    localStorage.setItem(storageKey(meetingId), JSON.stringify(guest));
  } catch {
    // Storage unavailable (private browsing, quota) — resuming just won't work next time.
  }
}
