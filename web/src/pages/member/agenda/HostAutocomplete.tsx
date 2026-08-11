import { useState } from 'react';

interface MemberOption {
  id: string;
  name: string;
  initials: string;
}

interface Props {
  value: string;
  placeholder: string;
  members: MemberOption[];
  onChange: (name: string, memberId: string | null) => void;
}

// Type-ahead against club members with a free-text fallback: picking a
// suggestion links host_member_id, typing past it just keeps the plain text
// (e.g. for one-off hosts like an external installing officer).
export default function HostAutocomplete({ value, placeholder, members, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const matches =
    value.trim().length > 0
      ? members.filter((m) => m.name.toLowerCase().includes(value.trim().toLowerCase())).slice(0, 6)
      : [];

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value, null); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 outline-none focus:border-brand"
      />
      {open && matches.length > 0 && (
        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {matches.map((m) => (
            <button
              key={m.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onChange(m.name, m.id); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 text-sm"
            >
              <span className="text-brand font-semibold text-xs">{m.initials}</span>
              <span className="text-gray-900">{m.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
