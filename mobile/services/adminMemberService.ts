import { apiRequest } from '@/lib/apiClient';
import type { AppRole, ClubRole, Member } from '@/types';

export function getAllMembers(token: string): Promise<Member[]> {
  return apiRequest<Member[]>('/admin/members', { token });
}

export function assignClubRole(
  memberId: string,
  clubRole: ClubRole,
  token: string
): Promise<Member> {
  return apiRequest<Member>(`/admin/members/${memberId}/club-role`, {
    method: 'PUT',
    body: { club_role: clubRole },
    token,
  });
}

export function assignAppRole(
  memberId: string,
  appRole: AppRole,
  token: string
): Promise<Member> {
  return apiRequest<Member>(`/admin/members/${memberId}/app-role`, {
    method: 'PUT',
    body: { app_role: appRole },
    token,
  });
}
