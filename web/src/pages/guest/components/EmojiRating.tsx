const FACES: Record<number, string> = { 1: '😞', 2: '😕', 3: '😐', 4: '🙂', 5: '😊' };

interface Props {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
}

export default function EmojiRating({ label, value, onChange }: Props) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium text-gray-700 min-w-[84px] shrink-0">{label}</span>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xl transition-all ${
              value === v
                ? 'bg-brand-light border-brand scale-110'
                : 'bg-white border-transparent hover:bg-gray-100'
            }`}
          >
            {FACES[v]}
          </button>
        ))}
      </div>
    </div>
  );
}
