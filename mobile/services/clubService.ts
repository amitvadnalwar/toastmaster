import { apiRequest } from '@/lib/apiClient';
import type { Club } from '@/types';

export interface UpdateSocialLinksPayload {
  instagram_url?: string;
  linkedin_url?: string;
  whatsapp_invite_url?: string;
}

export function getClub(token: string): Promise<Club> {
  return apiRequest<Club>('/club/', { token });
}

export function updateSocialLinks(
  payload: UpdateSocialLinksPayload,
  token: string
): Promise<Club> {
  return apiRequest<Club>('/club/social-links', {
    method: 'PUT',
    body: payload,
    token,
  });
}
