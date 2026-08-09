import EmojiRating from './EmojiRating';
import ScaleRating from './ScaleRating';

export interface MeetingRatingState {
  punctual: number | null;
  agenda: number | null;
  inclusive: number | null;
  experience: number | null;
  overall: number | null;
  comment: string;
}

export const EMPTY_MEETING_RATING: MeetingRatingState = {
  punctual: null,
  agenda: null,
  inclusive: null,
  experience: null,
  overall: null,
  comment: '',
};

interface Props {
  rating: MeetingRatingState;
  onChange: (field: keyof MeetingRatingState, value: number | string) => void;
}

export default function MeetingQualityCard({ rating, onChange }: Props) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-4">
      <div className="flex flex-col gap-3.5 mb-4">
        <EmojiRating label="Punctual" value={rating.punctual} onChange={(v) => onChange('punctual', v)} />
        <EmojiRating label="Agenda" value={rating.agenda} onChange={(v) => onChange('agenda', v)} />
        <EmojiRating label="Inclusive" value={rating.inclusive} onChange={(v) => onChange('inclusive', v)} />
        <EmojiRating
          label="Experience"
          value={rating.experience}
          onChange={(v) => onChange('experience', v)}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Overall</label>
        <ScaleRating value={rating.overall} onChange={(v) => onChange('overall', v)} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Comments (optional)</label>
        <textarea
          value={rating.comment}
          onChange={(e) => onChange('comment', e.target.value)}
          placeholder="What worked? What can be improved?"
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm outline-none transition-colors resize-y focus:border-brand focus:ring-2 focus:ring-brand/10"
        />
      </div>
    </div>
  );
}
