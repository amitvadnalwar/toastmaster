import { apiRequest } from '@/lib/apiClient';
import type { Club, ClubOfficer, ClubUpdatePayload } from '@/types';

export function getClub(token: string): Promise<Club> {
  return apiRequest<Club>('/club/', { token });
}

export function updateClub(payload: ClubUpdatePayload, token: string): Promise<Club> {
  return apiRequest<Club>('/club/', { method: 'PUT', body: payload, token });
}

export function getClubOfficers(token: string): Promise<ClubOfficer[]> {
  return apiRequest<ClubOfficer[]>('/club/officers', { token });
}
