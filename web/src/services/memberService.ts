import { apiRequest } from '@/lib/apiClient';
import type { Member, ClubRole, AppRole } from '@/types';

export interface MemberCreatePayload {
  name: string;
  email: string;
  phone: string;
  birthday?: string; // MM-DD
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
): Promise<{ id: string; name: string; club_role: string; app_role: string | null; is_active: boolean }[]> {
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
