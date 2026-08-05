import { apiRequest } from '@/lib/apiClient';
import type { LeaderboardEntry, MemberPointsOut } from '@/types';

export function getLeaderboard(month: string, token: string): Promise<LeaderboardEntry[]> {
  return apiRequest<LeaderboardEntry[]>(`/leaderboard/?month=${month}`, { token });
}

export function getMemberPoints(memberId: string, month: string, token: string): Promise<MemberPointsOut> {
  return apiRequest<MemberPointsOut>(`/leaderboard/${memberId}?month=${month}`, { token });
}
