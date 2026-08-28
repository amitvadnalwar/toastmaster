import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Printer, Pencil, Plus, Copy } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { showAlert } from '@/store/alertStore';
import { getMeetingById } from '@/services/meetingService';
import { getClubMembers } from '@/services/memberService';
import { getClub, getClubOfficers } from '@/services/clubService';
import { getAgenda, saveAgenda, clonePreviousAgenda } from '@/services/agendaService';
import { computeTimes } from '@/lib/agendaCascade';
import { isMeetingLocked } from '@/lib/utils';
import { MeetingDetailSkeleton } from '@/components/ui/Skeleton';
import AgendaRowEditor from './agenda/AgendaRowEditor';
import AgendaReadView from './agenda/AgendaReadView';
import { emptyDraft } from '@/types/agenda';
import type { Meeting, Club, ClubOfficer, MemberInitials } from '@/types';
import type { Agenda, AgendaItemDraft, AgendaItemType } from '@/types/agenda';

interface MemberOption { id: string; name: string; initials: MemberInitials }
type EditableRow = AgendaItemDraft & { _localId: string };

const WOD_IOD_FIELDS = [
  'word_of_day', 'word_of_day_meaning', 'word_of_day_usage',
  'idiom_of_day', 'idiom_of_day_meaning', 'idiom_of_day_usage',
] as const;
type WodIodState = Record<(typeof WOD_IOD_FIELDS)[number], string>;

function toEditableRows(agenda: Agenda): EditableRow[] {
  return agenda.items.map((item) => {
    const { id: _id, meeting_id: _mid, position: _pos, computed_start_time: _cst, ...draft } = item;
    return { ...draft, _localId: item.id };
  });
}

function toWodIodState(agenda: Agenda | null): WodIodState {
  const state = {} as WodIodState;
  for (const f of WOD_IOD_FIELDS) state[f] = agenda?.[f] ?? '';
  return state;
}

export default function MeetingAgendaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session, appRole } = useAuthStore();
  const isAdmin = appRole === 'admin' || appRole === 'super_admin';

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [officers, setOfficers] = useState<ClubOfficer[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [fetching, setFetching] = useState(true);

  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [wodIod, setWodIod] = useState<WodIodState>(toWodIodState(null));
  const [saving, setSaving] = useState(false);
  const [cloning, setCloning] = useState(false);

  const load = useCallback(async () => {
    if (!session || !id) return;
    setFetching(true);
    try {
      const [meetingData, agendaData, clubData, officersData] = await Promise.all([
        getMeetingById(id, session.access_token),
        getAgenda(id, session.access_token),
        getClub(session.access_token).catch(() => null),
        getClubOfficers(session.access_token).catch(() => [] as ClubOfficer[]),
      ]);
      setMeeting(meetingData);
      setAgenda(agendaData);
      setClub(clubData);
      setOfficers(officersData);
      if (isAdmin) {
        getClubMembers(session.access_token).then((list) => {
          setMembers(list.map((m) => ({ id: m.id, name: m.name, initials: m.initials })));
        }).catch(() => {});
      }
    } catch { /* ignore */ } finally {
      setFetching(false);
    }
  }, [session, id, isAdmin]);

  useEffect(() => { load(); }, [load]);

  function startEdit(fromAgenda: Agenda) {
    setRows(toEditableRows(fromAgenda));
    setWodIod(toWodIodState(fromAgenda));
    setEditing(true);
  }

  function addRow(type: AgendaItemType) {
    setRows((prev) => [...prev, { ...emptyDraft(type), _localId: crypto.randomUUID() }]);
  }

  function updateRow(index: number, field: keyof AgendaItemDraft, value: string | number | null) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function moveRow(index: number, direction: -1 | 1) {
    setRows((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function deleteRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!session || !id) return;
    if (rows.length > 0 && !rows[0].start_time_override) {
      await showAlert('The first row needs a start time — everything else is calculated from it.');
      return;
    }
    setSaving(true);
    try {
      const items = rows.map(({ _localId: _lid, ...draft }) => draft);
      const result = await saveAgenda(id, { items, ...wodIod }, session.access_token);
      setAgenda(result);
      setEditing(false);
      await showAlert('Agenda saved.');
    } catch (e: unknown) {
      await showAlert(e instanceof Error ? e.message : 'Failed to save agenda.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCloneFromPrevious() {
    if (!session || !id) return;
    setCloning(true);
    try {
      const result = await clonePreviousAgenda(id, session.access_token);
      setAgenda(result);
      startEdit(result);
    } catch (e: unknown) {
      await showAlert(e instanceof Error ? e.message : 'No previous agenda was found to clone.');
    } finally {
      setCloning(false);
    }
  }

  if (fetching) {
    return (
      <div className="flex flex-col min-h-full bg-gray-50">
        <Header title="Agenda" onBack={() => navigate(-1)} />
        <MeetingDetailSkeleton />
      </div>
    );
  }
  if (!meeting || !agenda) return null;

  const canManage = isAdmin && !isMeetingLocked(meeting);
  const previewRows = computeTimes(rows);

  const guestUrl = `${window.location.origin}${import.meta.env.BASE_URL}guest?meeting_id=${meeting.id}`;

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <Header
        title={editing ? 'Edit Agenda' : 'Agenda'}
        onBack={() => (editing ? setEditing(false) : navigate(-1))}
        actions={
          !editing && agenda.items.length > 0 ? (
            <div className="flex items-center gap-1">
              <button onClick={() => window.print()} className="p-2"><Printer size={18} className="text-gray-700" /></button>
              {canManage && <button onClick={() => startEdit(agenda)} className="p-2"><Pencil size={18} className="text-gray-700" /></button>}
            </div>
          ) : undefined
        }
      />

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-28 max-w-lg mx-auto w-full">
        {canManage && !editing && agenda.items.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <p className="text-sm text-gray-500 mb-5">No agenda yet for this meeting.</p>
            <button
              onClick={handleCloneFromPrevious}
              disabled={cloning}
              className="w-full flex items-center justify-center gap-2 bg-brand text-white rounded-xl py-3 text-sm font-bold mb-2.5 disabled:opacity-60"
            >
              <Copy size={16} /> {cloning ? 'Cloning…' : 'Start from previous meeting’s agenda'}
            </button>
            <button
              onClick={() => startEdit(agenda)}
              className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-700 rounded-xl py-3 text-sm font-bold"
            >
              <Plus size={16} /> Start blank
            </button>
          </div>
        ) : editing ? (
          <>
            {previewRows.map((row, i) => (
              <AgendaRowEditor
                key={rows[i]._localId}
                row={row}
                index={i}
                isFirst={i === 0}
                isLast={i === rows.length - 1}
                members={members}
                onChange={(field, value) => updateRow(i, field, value)}
                onMoveUp={() => moveRow(i, -1)}
                onMoveDown={() => moveRow(i, 1)}
                onDelete={() => deleteRow(i)}
              />
            ))}

            <div className="flex gap-2 mb-5">
              <button onClick={() => addRow('section')} className="flex-1 border border-gray-300 rounded-xl py-2.5 text-xs font-bold text-gray-700">+ Section</button>
              <button onClick={() => addRow('item')} className="flex-1 border border-gray-300 rounded-xl py-2.5 text-xs font-bold text-gray-700">+ Item</button>
              <button onClick={() => addRow('speech')} className="flex-1 border border-gray-300 rounded-xl py-2.5 text-xs font-bold text-gray-700">+ Speech</button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-4 mb-5">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Word &amp; Idiom of the Day (optional)</p>
              <WodIodFields value={wodIod} onChange={(field, value) => setWodIod((prev) => ({ ...prev, [field]: value }))} />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-brand text-white rounded-xl py-3.5 text-base font-bold disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Agenda'}
            </button>
          </>
        ) : (
          <AgendaReadView meeting={meeting} agenda={agenda} club={club} officers={officers} guestUrl={guestUrl} />
        )}
      </div>
    </div>
  );
}

function WodIodFields({ value, onChange }: { value: WodIodState; onChange: (field: (typeof WOD_IOD_FIELDS)[number], v: string) => void }) {
  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 outline-none focus:border-brand mb-2';
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold text-gray-600 mb-1.5">Word of the Day</p>
        <input value={value.word_of_day} onChange={(e) => onChange('word_of_day', e.target.value)} placeholder="Word" className={inputCls} />
        <input value={value.word_of_day_meaning} onChange={(e) => onChange('word_of_day_meaning', e.target.value)} placeholder="Meaning" className={inputCls} />
        <input value={value.word_of_day_usage} onChange={(e) => onChange('word_of_day_usage', e.target.value)} placeholder="Usage example" className={inputCls} />
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-600 mb-1.5">Idiom of the Day</p>
        <input value={value.idiom_of_day} onChange={(e) => onChange('idiom_of_day', e.target.value)} placeholder="Idiom" className={inputCls} />
        <input value={value.idiom_of_day_meaning} onChange={(e) => onChange('idiom_of_day_meaning', e.target.value)} placeholder="Meaning" className={inputCls} />
        <input value={value.idiom_of_day_usage} onChange={(e) => onChange('idiom_of_day_usage', e.target.value)} placeholder="Usage example" className={inputCls} />
      </div>
    </div>
  );
}

function Header({ title, onBack, actions }: { title: string; onBack: () => void; actions?: React.ReactNode }) {
  return (
    <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-20">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        <button onClick={onBack} className="flex items-center text-brand font-semibold text-base w-[70px]">
          <ChevronLeft size={20} /> Back
        </button>
        <h1 className="text-lg font-bold text-gray-900 truncate">{title}</h1>
        <div className="w-[70px] flex justify-end">{actions}</div>
      </div>
    </div>
  );
}
