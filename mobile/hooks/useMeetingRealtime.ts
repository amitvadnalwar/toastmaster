import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useMeetingStore } from '@/store';
import type { VotingStatus } from '@/types';

export function useMeetingRealtime(meetingId: string | undefined) {
  const setVotingStatus = useMeetingStore((s) => s.setVotingStatus);

  useEffect(() => {
    if (!meetingId) return;

    const channel = supabase
      .channel(`meetings:${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'meetings',
          filter: `id=eq.${meetingId}`,
        },
        (payload) => {
          const updated = payload.new as { voting_status: VotingStatus };
          setVotingStatus(updated.voting_status);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId, setVotingStatus]);
}
