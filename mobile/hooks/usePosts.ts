import { useQuery } from '@tanstack/react-query';
import { getActivePost } from '@/services/postService';
import { useAuthStore } from '@/store';

export function useActivePost(clubId: string) {
  const token = useAuthStore((s) => s.session?.access_token ?? '');
  return useQuery({
    queryKey: ['posts', 'active', clubId],
    queryFn: () => getActivePost(clubId, token),
    enabled: !!token && !!clubId,
  });
}
