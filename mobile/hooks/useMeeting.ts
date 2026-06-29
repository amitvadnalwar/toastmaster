import { useQuery } from '@tanstack/react-query';
import { getCurrentMeeting } from '@/services/meetingService';
import { useMeetingStore } from '@/store';
import { useAuthStore } from '@/store';

export function useCurrentMeeting() {
  const token = useAuthStore((s) => s.session?.access_token ?? s.guestToken ?? '');
  const setCurrentMeeting = useMeetingStore((s) => s.setCurrentMeeting);
  const setRoster = useMeetingStore((s) => s.setRoster);

  return useQuery({
    queryKey: ['meeting', 'current'],
    queryFn: async () => {
      const result = await getCurrentMeeting(token);
      setCurrentMeeting(result.meeting);
      setRoster(result.roster);
      return result;
    },
    enabled: !!token,
  });
}
