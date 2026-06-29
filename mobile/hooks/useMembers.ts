import { useQuery } from '@tanstack/react-query';
import { getMe } from '@/services/memberService';
import { useAuthStore } from '@/store';

export function useMe() {
  const token = useAuthStore((s) => s.session?.access_token ?? '');
  const setMember = useAuthStore((s) => s.setMember);

  return useQuery({
    queryKey: ['members', 'me'],
    queryFn: async () => {
      const member = await getMe(token);
      setMember(member);
      return member;
    },
    enabled: !!token,
  });
}
