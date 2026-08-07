import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, UserPlus, Phone } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getMeetingById, getMeetingGuests } from '@/services/meetingService';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Meeting, Guest } from '@/types';
import { formatTime, initials } from '@/lib/utils';

export default function MeetingGuestsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuthStore();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [fetching, setFetching] = useState(true);

  const load = useCallback(async () => {
    if (!session || !id) return;
    setFetching(true);
    try {
      const [meetingData, guestsData] = await Promise.all([
        getMeetingById(id, session.access_token),
        getMeetingGuests(id, session.access_token),
      ]);
      setMeeting(meetingData);
      setGuests(guestsData);
    } catch { /* ignore */ } finally {
      setFetching(false);
    }
  }, [session, id]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center text-brand font-semibold text-base w-[70px]">
            <ChevronLeft size={20} /> Back
          </button>
          <h1 className="text-lg font-bold text-gray-900 truncate">Guests</h1>
          <div className="w-[70px]" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-12 max-w-lg mx-auto w-full">
        {fetching ? (
          <>
            <Skeleton className="w-48 h-6 rounded-full mb-4" />
            <Skeleton className="w-full h-16 rounded-2xl mb-2.5" />
            <Skeleton className="w-full h-16 rounded-2xl" />
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-1">{meeting?.title}</h2>
            <p className="text-[13px] text-gray-500 mb-5">{guests.length} guest{guests.length === 1 ? '' : 's'} joined</p>

            {guests.length === 0 ? (
              <div className="flex flex-col items-center gap-3 pt-16">
                <UserPlus size={36} className="text-gray-300" />
                <p className="text-sm text-gray-400">No guests have registered for this meeting yet.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {guests.map((g, i) => (
                  <div key={g.id}>
                    {i > 0 && <div className="h-px bg-gray-100 mx-4" />}
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-blue-500">{initials(g.name)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{g.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {g.phone && (
                            <span className="flex items-center gap-1 text-[11px] text-gray-400">
                              <Phone size={11} /> {g.phone}
                            </span>
                          )}
                          <span className="text-[11px] text-gray-400">via {g.source}</span>
                        </div>
                      </div>
                      <span className="text-[11px] text-gray-400 shrink-0">{formatTime(g.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
