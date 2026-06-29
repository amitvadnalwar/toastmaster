import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAllMembers,
  assignClubRole,
  assignAppRole,
} from '@/services/adminMemberService';
import { useAuthStore } from '@/store';
import type { AppRole, ClubRole } from '@/types';

function useToken() {
  return useAuthStore((s) => s.session?.access_token ?? '');
}

export function useAllMembers() {
  const token = useToken();
  return useQuery({
    queryKey: ['admin', 'members'],
    queryFn: () => getAllMembers(token),
    enabled: !!token,
  });
}

export function useAssignClubRole() {
  const token = useToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, clubRole }: { memberId: string; clubRole: ClubRole }) =>
      assignClubRole(memberId, clubRole, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'members'] });
    },
  });
}

export function useAssignAppRole() {
  const token = useToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, appRole }: { memberId: string; appRole: AppRole }) =>
      assignAppRole(memberId, appRole, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'members'] });
    },
  });
}
