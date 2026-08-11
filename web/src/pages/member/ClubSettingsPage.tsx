import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { showAlert } from '@/store/alertStore';
import { getClub, updateClub } from '@/services/clubService';
import Button from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

export default function ClubSettingsPage() {
  const navigate = useNavigate();
  const { session } = useAuthStore();

  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [missionStatement, setMissionStatement] = useState('');
  const [venueAddressUrl, setVenueAddressUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [whatsappInviteUrl, setWhatsappInviteUrl] = useState('');

  useEffect(() => {
    if (!session) return;
    getClub(session.access_token)
      .then((club) => {
        setMissionStatement(club.mission_statement ?? '');
        setVenueAddressUrl(club.venue_address_url ?? '');
        setInstagramUrl(club.instagram_url ?? '');
        setFacebookUrl(club.facebook_url ?? '');
        setLinkedinUrl(club.linkedin_url ?? '');
        setWhatsappInviteUrl(club.whatsapp_invite_url ?? '');
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [session]);

  async function handleSave() {
    if (!session) return;
    setSaving(true);
    try {
      await updateClub({
        mission_statement: missionStatement.trim() || null,
        venue_address_url: venueAddressUrl.trim() || null,
        instagram_url: instagramUrl.trim() || null,
        facebook_url: facebookUrl.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
        whatsapp_invite_url: whatsappInviteUrl.trim() || null,
      }, session.access_token);
      await showAlert('Club settings saved.');
    } catch (e: unknown) {
      await showAlert(e instanceof Error ? e.message : 'Failed to save club settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center text-brand font-semibold text-base w-[70px]">
            <ChevronLeft size={20} /> Back
          </button>
          <h1 className="text-lg font-bold text-gray-900">Club Settings</h1>
          <div className="w-[70px]" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-12 max-w-lg mx-auto w-full">
        {fetching ? (
          <>
            <Skeleton className="w-full h-12 rounded-[10px] mb-5" />
            <Skeleton className="w-full h-24 rounded-[10px] mb-5" />
            <Skeleton className="w-full h-12 rounded-[10px] mb-5" />
          </>
        ) : (
          <>
            <p className="text-[13px] text-gray-500 mb-6">
              These constants show up on every meeting's agenda sidebar, so you only set them once.
            </p>

            <Label>Club mission statement</Label>
            <textarea
              value={missionStatement}
              onChange={(e) => setMissionStatement(e.target.value)}
              rows={4}
              placeholder="We provide a supportive and positive learning experience…"
              className={`${inputCls} resize-none`}
            />

            <Label>Venue address link</Label>
            <input value={venueAddressUrl} onChange={(e) => setVenueAddressUrl(e.target.value)} placeholder="https://maps.app.goo.gl/…" className={inputCls} />

            <Label>Instagram URL</Label>
            <input value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/…" className={inputCls} />

            <Label>Facebook URL</Label>
            <input value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/groups/…" className={inputCls} />

            <Label>LinkedIn URL</Label>
            <input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/…" className={inputCls} />

            <Label>WhatsApp invite link</Label>
            <input value={whatsappInviteUrl} onChange={(e) => setWhatsappInviteUrl(e.target.value)} placeholder="https://chat.whatsapp.com/…" className={inputCls} />

            <Button fullWidth size="lg" loading={saving} onClick={handleSave} className="mt-2">
              Save Settings
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

const inputCls = 'w-full bg-white border border-gray-300 rounded-[10px] px-4 py-3.5 text-base text-gray-900 outline-none focus:border-brand mb-5';

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] font-medium text-gray-700 mb-2">{children}</p>;
}
