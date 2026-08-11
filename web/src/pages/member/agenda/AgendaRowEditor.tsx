import { useState } from 'react';
import { ChevronUp, ChevronDown, Trash2, Clock } from 'lucide-react';
import HostAutocomplete from './HostAutocomplete';
import { formatSecondsAsDuration, parseDurationToSeconds } from '@/lib/agendaCascade';
import type { AgendaItemDraft } from '@/types/agenda';

interface MemberOption { id: string; name: string; initials: string }

interface Props {
  row: AgendaItemDraft & { computed_start_time: string };
  index: number;
  isFirst: boolean;
  isLast: boolean;
  members: MemberOption[];
  onChange: (field: keyof AgendaItemDraft, value: string | number | null) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

const TYPE_LABEL: Record<AgendaItemDraft['item_type'], string> = {
  section: 'Section',
  item: 'Item',
  speech: 'Speech',
};

export default function AgendaRowEditor({ row, index, isFirst, isLast, members, onChange, onMoveUp, onMoveDown, onDelete }: Props) {
  const [showTimeOverride, setShowTimeOverride] = useState(isFirst || !!row.start_time_override);

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-brand bg-brand-light px-2 py-0.5 rounded-full">
            {TYPE_LABEL[row.item_type]}
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-gray-500">
            <Clock size={12} /> {row.computed_start_time || '—:—'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onMoveUp} disabled={isFirst} className="p-1.5 disabled:opacity-20"><ChevronUp size={16} className="text-gray-500" /></button>
          <button type="button" onClick={onMoveDown} disabled={isLast} className="p-1.5 disabled:opacity-20"><ChevronDown size={16} className="text-gray-500" /></button>
          <button type="button" onClick={onDelete} className="p-1.5"><Trash2 size={16} className="text-red-500" /></button>
        </div>
      </div>

      <input
        value={row.title}
        onChange={(e) => onChange('title', e.target.value)}
        placeholder={row.item_type === 'speech' ? 'Speech title' : row.item_type === 'section' ? 'Section name' : 'Agenda text'}
        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-900 outline-none focus:border-brand mb-3"
      />

      {isFirst || showTimeOverride ? (
        <Field label={isFirst ? 'Start time *' : 'Start time override'}>
          <input
            type="time"
            value={row.start_time_override ?? ''}
            onChange={(e) => onChange('start_time_override', e.target.value || null)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 outline-none focus:border-brand"
          />
        </Field>
      ) : (
        <button type="button" onClick={() => setShowTimeOverride(true)} className="text-xs text-brand font-semibold mb-3">
          + Set exact start time
        </button>
      )}

      {row.item_type === 'section' && (
        <Field label="Break (minutes)">
          <input
            type="number"
            min={0}
            value={row.break_minutes ?? 0}
            onChange={(e) => onChange('break_minutes', Number(e.target.value))}
            className="w-24 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 outline-none focus:border-brand"
          />
        </Field>
      )}

      {(row.item_type === 'item' || row.item_type === 'speech') && (
        <>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <Field label="Green">
              <DurationInput seconds={row.duration_green_sec} onChange={(s) => onChange('duration_green_sec', s)} />
            </Field>
            <Field label="Yellow">
              <DurationInput seconds={row.duration_yellow_sec} onChange={(s) => onChange('duration_yellow_sec', s)} />
            </Field>
            <Field label="Red">
              <DurationInput seconds={row.duration_red_sec} onChange={(s) => onChange('duration_red_sec', s)} />
            </Field>
          </div>

          {row.item_type === 'speech' && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              <Field label="Path code">
                <input
                  value={row.path_code ?? ''}
                  onChange={(e) => onChange('path_code', e.target.value || null)}
                  placeholder="PM"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 outline-none focus:border-brand"
                />
              </Field>
              <Field label="Level-Project">
                <input
                  value={row.level_project ?? ''}
                  onChange={(e) => onChange('level_project', e.target.value || null)}
                  placeholder="L1P1"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 outline-none focus:border-brand"
                />
              </Field>
            </div>
          )}

          <Field label={row.item_type === 'speech' ? 'Speaker' : 'Host'}>
            <HostAutocomplete
              value={row.host_name ?? ''}
              placeholder="Type a name…"
              members={members}
              onChange={(name, memberId) => { onChange('host_name', name); onChange('host_member_id', memberId); }}
            />
          </Field>

          {row.item_type === 'speech' && (
            <div className="mt-3">
              <Field label="Evaluator (M:)">
                <HostAutocomplete
                  value={row.evaluator_name ?? ''}
                  placeholder="Type a name…"
                  members={members}
                  onChange={(name, memberId) => { onChange('evaluator_name', name); onChange('evaluator_member_id', memberId); }}
                />
              </Field>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DurationInput({ seconds, onChange }: { seconds: number | null | undefined; onChange: (sec: number | null) => void }) {
  const [text, setText] = useState(formatSecondsAsDuration(seconds));
  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onChange(parseDurationToSeconds(text))}
      placeholder="2 or 1:30"
      className="w-full px-2.5 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 outline-none focus:border-brand"
    />
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
      {children}
    </div>
  );
}
