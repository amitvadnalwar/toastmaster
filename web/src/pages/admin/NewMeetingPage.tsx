import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, User, Minus, Plus, Search, Check, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { createMeeting } from '@/services/meetingService';
import { getAllMembers } from '@/services/memberService';
import Button from '@/components/ui/Button';
import { initials } from '@/lib/utils';

interface MemberOption { id: string; name: string }
type MemberField = 'president' | 'saa' | null;

export default function AdminNewMeetingPage() {
  const navigate = useNavigate();
  const { session } = useAuthStore();

  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('19:00');
  const [maxSpeakers, setMaxSpeakers] = useState(3);
  const [president, setPresident] = useState<MemberOption | null>(null);
  const [saa, setSaa] = useState<MemberOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [members, setMembers] = useState<MemberOption[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [activeField, setActiveField] = useState<MemberField>(null);

  useEffect(() => {
    if (!session) return;
    getAllMembers(session.access_token)
      .then((list) => setMembers(list.map((m) => ({ id: m.id, name: m.name }))))
      .catch(() => {});
  }, [session]);

  function selectMember(m: MemberOption) {
    if (activeField === 'president') setPresident(m);
    else if (activeField === 'saa') setSaa(m);
    setActiveField(null);
    setMemberSearch('');
  }

  async function handleCreate() {
    if (!session) return;
    if (!title.trim()) return setError('Meeting title is required');
    if (!date) return setError('Date is required');
    setError('');
    setLoading(true);
    try {
      const scheduled_at = new Date(`${date}T${time}:00`).toISOString();
      const meeting = await createMeeting(
        {
          title: title.trim(),
          scheduled_at,
          venue: venue.trim() || null,
          president_id: president?.id ?? null,
          saa_id: saa?.id ?? null,
          max_speakers: maxSpeakers,
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

  const filteredMembers = members.filter((m) => m.name.toLowerCase().includes(memberSearch.toLowerCase()));

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center text-brand font-semibold text-base w-[70px]">
            <ChevronLeft size={20} /> Back
          </button>
          <h1 className="text-lg font-bold text-gray-900">New Meeting</h1>
          <div className="w-[70px]" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-12 max-w-lg mx-auto w-full">
        <Label>Meeting title</Label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Regular Meeting #42" className={inputCls} />

        <Label>Date &amp; Time</Label>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClsNoMb} />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClsNoMb} />
        </div>

        <Label>Venue</Label>
        <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. Community Hall, Room 101" className={inputCls} />

        <Label>President</Label>
        <button onClick={() => setActiveField('president')} className={pickerCls}>
          <User size={16} className="text-gray-500" />
          <span className={`flex-1 text-left text-[15px] font-medium ${president ? 'text-gray-900' : 'text-gray-400'}`}>
            {president ? president.name : 'Select president…'}
          </span>
          <ChevronRight size={16} className="text-gray-400" />
        </button>

        <Label>SAA</Label>
        <button onClick={() => setActiveField('saa')} className={pickerCls}>
          <User size={16} className="text-gray-500" />
          <span className={`flex-1 text-left text-[15px] font-medium ${saa ? 'text-gray-900' : 'text-gray-400'}`}>
            {saa ? saa.name : 'Select SAA…'}
          </span>
          <ChevronRight size={16} className="text-gray-400" />
        </button>

        <Label>Max Speakers</Label>
        <div className="inline-flex items-center border border-gray-300 rounded-[10px] overflow-hidden bg-white mb-8">
          <button onClick={() => setMaxSpeakers((v) => Math.max(1, v - 1))} className="px-5 py-3.5"><Minus size={18} className="text-gray-700" /></button>
          <span className="text-lg font-bold text-gray-900 min-w-[40px] text-center">{maxSpeakers}</span>
          <button onClick={() => setMaxSpeakers((v) => Math.min(8, v + 1))} className="px-5 py-3.5"><Plus size={18} className="text-gray-700" /></button>
        </div>

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        <Button fullWidth size="lg" loading={loading} disabled={!title.trim()} onClick={handleCreate}>
          Create Meeting
        </Button>
      </div>

      {/* Member picker bottom sheet */}
      {activeField && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setActiveField(null)}>
          <div className="w-full bg-white rounded-t-3xl max-h-[75%] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <button onClick={() => setActiveField(null)} className="text-gray-500 text-base w-[60px] text-left">Cancel</button>
              <h3 className="text-base font-semibold text-gray-900">
                {activeField === 'president' ? 'Select President' : 'Select SAA'}
              </h3>
              <div className="w-[60px]" />
            </div>
            <div className="mx-4 my-3 flex items-center gap-2 bg-gray-100 rounded-[10px] px-3 py-2.5">
              <Search size={15} className="text-gray-400" />
              <input
                autoFocus
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search members…"
                className="flex-1 bg-transparent outline-none text-[15px] text-gray-900"
              />
            </div>
            <div className="overflow-y-auto pb-8">
              {filteredMembers.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400">No members found</div>
              ) : (
                filteredMembers.map((m) => {
                  const selected =
                    (activeField === 'president' && president?.id === m.id) ||
                    (activeField === 'saa' && saa?.id === m.id);
                  return (
                    <button key={m.id} onClick={() => selectMember(m)} className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50">
                      <div className="w-[38px] h-[38px] rounded-full bg-brand flex items-center justify-center shrink-0">
                        <span className="text-white text-[13px] font-bold">{initials(m.name)}</span>
                      </div>
                      <span className="flex-1 text-left text-[15px] text-gray-900 font-medium">{m.name}</span>
                      {selected && <Check size={16} className="text-brand" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = 'w-full bg-white border border-gray-300 rounded-[10px] px-4 py-3.5 text-base text-gray-900 outline-none focus:border-brand mb-5';
const inputClsNoMb = 'w-full bg-white border border-gray-300 rounded-[10px] px-4 py-3.5 text-base text-gray-900 outline-none focus:border-brand';
const pickerCls = 'w-full flex items-center gap-2.5 bg-white border border-gray-300 rounded-[10px] px-4 py-3.5 mb-5';

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] font-medium text-gray-700 mb-2">{children}</p>;
}
