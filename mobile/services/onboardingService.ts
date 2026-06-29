import { apiRequest } from '@/lib/apiClient';
import type { Member, RegistrationSource } from '@/types';

export type LookupResult =
  | { status: 'found'; member: Pick<Member, 'id' | 'is_guest' | 'app_role'> }
  | { status: 'not_found' };

export async function lookupIdentity(
  identity: string,
  meetingId: string
): Promise<LookupResult> {
  return apiRequest<LookupResult>('/onboarding/lookup', {
    method: 'POST',
    body: { identity, meeting_id: meetingId },
    token: '',
  });
}

export interface RegisterGuestPayload {
  name: string;
  email: string;
  phone?: string;
  source: RegistrationSource;
  meeting_id: string;
}

export interface RegisterGuestResult {
  member: Member;
  token: string;
}

export async function registerGuest(
  payload: RegisterGuestPayload
): Promise<RegisterGuestResult> {
  return apiRequest<RegisterGuestResult>('/onboarding/register', {
    method: 'POST',
    body: payload,
    token: '',
  });
}
