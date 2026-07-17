import { apiRequest } from '@/lib/apiClient';
import type { Club } from '@/types';

export function getClub(token: string): Promise<Club> {
  return apiRequest<Club>('/club/', { token });
}
