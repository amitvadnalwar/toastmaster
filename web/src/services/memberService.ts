import { apiRequest } from '@/lib/apiClient';
import type { Member } from '@/types';

export function getMe(token: string): Promise<Member> {
  return apiRequest('/members/me', { token });
}

export function getMembers(token: string): Promise<Member[]> {
  return apiRequest('/members', { token });
}

export function getMember(id: string, token: string): Promise<Member> {
  return apiRequest(`/members/${id}`, { token });
}

export function createMember(
  data: {
    name: string;
    email: string;
    phone?: string;
    birthday?: string;
    club_role: string;
    app_role: string;
  },
  token: string,
): Promise<Member> {
  return apiRequest('/members', {
    method: 'POST',
    body: JSON.stringify(data),
    token,
  });
}

export function updateMember(
  id: string,
  data: Partial<{
    name: string;
    phone: string;
    birthday: string;
    club_role: string;
    app_role: string;
    is_active: boolean;
  }>,
  token: string,
): Promise<Member> {
  return apiRequest(`/members/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
    token,
  });
}

export function resendInvite(id: string, token: string): Promise<unknown> {
  return apiRequest(`/members/${id}/resend-invite`, {
    method: 'POST',
    token,
  });
}
