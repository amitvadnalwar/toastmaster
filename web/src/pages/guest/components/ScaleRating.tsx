const SCALE_LABELS = ['Could be better', 'Average', 'Good', 'Super', 'Outstanding'];

interface Props {
  value: number | null;
  onChange: (value: number) => void;
}

export default function ScaleRating({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      {SCALE_LABELS.map((label, i) => {
        const v = i + 1;
        const selected = value === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] border-[1.5px] text-sm text-left transition-all ${
              selected
                ? 'border-brand bg-brand-light text-brand font-semibold'
                : 'border-gray-200 bg-white text-gray-900 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full border-2 shrink-0 ${
                selected ? 'border-brand bg-brand' : 'border-gray-300'
              }`}
            />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
