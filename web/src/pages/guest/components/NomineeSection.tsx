import type { GuestNomineeCategory } from '@/types/guest';

interface Props {
  category: GuestNomineeCategory;
  selectedNomineeId: string | null;
  onSelect: (memberId: string) => void;
}

export default function NomineeSection({ category, selectedNomineeId, onSelect }: Props) {
  return (
    <div className="mb-6">
      <div className="text-sm font-bold text-brand mb-2.5 uppercase tracking-wide">{category.label}</div>
      <div className="flex flex-col gap-1.5">
        {category.nominees.map((n) => {
          const selected = selectedNomineeId === n.member_id;
          return (
            <button
              key={n.member_id}
              type="button"
              onClick={() => onSelect(n.member_id)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-[10px] border-[1.5px] text-[15px] font-medium text-left transition-all ${
                selected
                  ? 'border-brand bg-brand-light text-brand font-bold'
                  : 'border-gray-200 bg-white text-gray-900 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full border-2 shrink-0 ${
                  selected ? 'border-brand bg-brand' : 'border-gray-300'
                }`}
              />
              {n.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
