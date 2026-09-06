import { apiRequest } from '@/lib/apiClient';
import type { Member, ClubRole, AppRole, MemberInitials } from '@/types';

export interface MemberCreatePayload {
  name: string;
  email: string;
  phone: string;
  birthday?: string; // MM-DD
  initials: MemberInitials;
}

export interface MemberUpdatePayload {
  name: string;
  email: string;
  phone: string;
  birthday?: string | null; // MM-DD
  initials: MemberInitials;
}

// ── Admin member management ────────────────────────────────────────────────

export function getAllMembers(token: string): Promise<Member[]> {
  return apiRequest<Member[]>('/admin/members', { token });
}

export function getMemberById(memberId: string, token: string): Promise<Member> {
  return apiRequest<Member>(`/admin/members/${memberId}`, { token });
}

export function createMember(payload: MemberCreatePayload, token: string): Promise<Member> {
  return apiRequest<Member>('/admin/members', { method: 'POST', body: payload, token });
}

// Public — no auth. Self-registration from the login screen.
export function registerMember(payload: MemberCreatePayload): Promise<Member> {
  return apiRequest<Member>('/members/register', { method: 'POST', body: payload });
}

export interface SimpleLoginPayload {
  email: string;
  name: string;
  phone: string;
}

export interface SimpleLoginResult {
  email: string;
  hashed_token: string;
}

// Public — no auth. Passwordless sign-in: email gates entry, name/phone are
// recorded but don't have to match exactly. Returns a token the caller
// exchanges via supabase.auth.verifyOtp({ email, token_hash, type: 'magiclink' }).
export function simpleLogin(payload: SimpleLoginPayload): Promise<SimpleLoginResult> {
  return apiRequest<SimpleLoginResult>('/members/simple-login', { method: 'POST', body: payload });
}

export function updateMemberDetails(memberId: string, payload: MemberUpdatePayload, token: string): Promise<Member> {
  return apiRequest<Member>(`/admin/members/${memberId}`, { method: 'PUT', body: payload, token });
}

export function resendInvite(memberId: string, token: string): Promise<void> {
  return apiRequest<void>(`/admin/members/${memberId}/resend-invite`, { method: 'POST', token });
}

export function setMemberActive(memberId: string, isActive: boolean, token: string): Promise<Member> {
  return apiRequest<Member>(`/admin/members/${memberId}/active`, {
    method: 'PUT',
    body: { is_active: isActive },
    token,
  });
}

export function updateMemberClubRole(memberId: string, clubRole: ClubRole, token: string): Promise<Member> {
  return apiRequest<Member>(`/admin/members/${memberId}/club-role`, {
    method: 'PUT',
    body: { club_role: clubRole },
    token,
  });
}

export function updateMemberAppRole(memberId: string, appRole: AppRole, token: string): Promise<Member> {
  return apiRequest<Member>(`/admin/members/${memberId}/app-role`, {
    method: 'PUT',
    body: { app_role: appRole },
    token,
  });
}

// ── Self / member ──────────────────────────────────────────────────────────

export function getMe(token: string): Promise<Member> {
  return apiRequest<Member>('/members/me', { token });
}

export function confirmPasswordChanged(token: string): Promise<void> {
  return apiRequest<void>('/members/me/confirm-password', { method: 'POST', token });
}

export function getMyStats(token: string): Promise<{ speeches: number; feedbacks: number }> {
  return apiRequest('/members/me/stats', { token });
}

export function getClubMembers(
  token: string,
): Promise<{ id: string; name: string; initials: MemberInitials; club_role: string; app_role: string | null; is_active: boolean }[]> {
  return apiRequest('/members/club', { token });
}

export function updateBirthday(
  birthday: string,
  token: string,
): Promise<Pick<Member, 'id' | 'birthday' | 'birthday_collected'>> {
  return apiRequest('/members/birthday', {
    method: 'PUT',
    body: { birthday },
    token,
  });
}
