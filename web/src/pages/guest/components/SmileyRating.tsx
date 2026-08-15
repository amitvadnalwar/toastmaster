import { Frown, Meh, Smile } from 'lucide-react';

const OPTIONS: { value: 1 | 2 | 3; label: string; Icon: typeof Frown }[] = [
  { value: 1, label: 'Need Improvement', Icon: Frown },
  { value: 2, label: 'Ok', Icon: Meh },
  { value: 3, label: 'Super', Icon: Smile },
];

interface Props {
  label: string;
  value: number | null;
  onChange: (value: 1 | 2 | 3) => void;
}

export default function SmileyRating({ label, value, onChange }: Props) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-1.5">{label}</p>
      <div className="flex gap-2">
        {OPTIONS.map(({ value: v, label: optLabel, Icon }) => {
          const selected = value === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-colors ${
                selected ? 'border-brand bg-brand-light' : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <Icon size={20} className={selected ? 'text-brand' : 'text-gray-300'} />
              <span className={`text-[10px] font-semibold text-center leading-tight ${selected ? 'text-brand' : 'text-gray-400'}`}>
                {optLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
