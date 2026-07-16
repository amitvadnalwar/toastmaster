import { apiRequest } from '@/lib/apiClient';
import type { Club } from '@/types';

export function getMyClub(token: string): Promise<Club> {
  return apiRequest('/clubs/me', { token });
}
