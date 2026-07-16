import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { createMeeting } from '@/services/meetingService';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { AdminBottomNav } from '@/components/layout/BottomNav';

export default function AdminNewMeetingPage() {
  const navigate = useNavigate();
  const { session, appRole } = useAuthStore();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [venue, setVenue] = useState('');
  const [theme, setTheme] = useState('');
  const [maxSpeakers, setMaxSpeakers] = useState('3');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    if (!title.trim() || !date) return setError('Title and date are required');

    setError('');
    setLoading(true);
    try {
      const scheduled_at = new Date(`${date}T${time}:00`).toISOString();
      const meeting = await createMeeting(
        {
          title: title.trim(),
          scheduled_at,
          venue: venue.trim() || undefined,
          theme: theme.trim() || undefined,
          max_speakers: parseInt(maxSpeakers, 10),
        },
        session.access_token,
      );
      navigate(`/admin/meetings/${meeting.id}`, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create meeting');
    } finally {
      setLoading(false);
    }
  }

  const isSuperAdmin = appRole === 'super_admin';

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <PageHeader title="New Meeting" back />

      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-28 max-w-lg mx-auto w-full">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Meeting Title"
            placeholder="e.g. Regular Meeting #42"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <Input
              label="Time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          <Input
            label="Venue (optional)"
            placeholder="e.g. Pune, Hotel XYZ"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
          />

          <Input
            label="Theme (optional)"
            placeholder="e.g. Leadership & Growth"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">Max Speakers</label>
            <input
              type="number"
              min="1"
              max="10"
              value={maxSpeakers}
              onChange={(e) => setMaxSpeakers(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          <Button type="submit" fullWidth size="lg" loading={loading} className="mt-2">
            Create Meeting
          </Button>
        </form>
      </div>

      <AdminBottomNav isSuperAdmin={isSuperAdmin} />
    </div>
  );
}
