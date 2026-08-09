import EmojiRating from './EmojiRating';
import ScaleRating from './ScaleRating';
import type { GuestSpeaker } from '@/types/guest';

export interface SpeakerRatingState {
  content: number | null;
  structure: number | null;
  interaction: number | null;
  confidence: number | null;
  overall: number | null;
  comment: string;
}

export const EMPTY_SPEAKER_RATING: SpeakerRatingState = {
  content: null,
  structure: null,
  interaction: null,
  confidence: null,
  overall: null,
  comment: '',
};

interface Props {
  speaker: GuestSpeaker;
  index: number;
  rating: SpeakerRatingState;
  onChange: (field: keyof SpeakerRatingState, value: number | string) => void;
}

export default function SpeakerCard({ speaker, index, rating, onChange }: Props) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[11px] font-bold text-brand bg-brand-light px-2 py-0.5 rounded-full uppercase tracking-wide">
          Speaker {index + 1}
        </span>
        <span className="text-base font-bold text-gray-900">{speaker.name}</span>
      </div>

      <div className="flex flex-col gap-3.5 mb-4">
        <EmojiRating label="Content" value={rating.content} onChange={(v) => onChange('content', v)} />
        <EmojiRating label="Structure" value={rating.structure} onChange={(v) => onChange('structure', v)} />
        <EmojiRating
          label="Interaction"
          value={rating.interaction}
          onChange={(v) => onChange('interaction', v)}
        />
        <EmojiRating
          label="Confidence"
          value={rating.confidence}
          onChange={(v) => onChange('confidence', v)}
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
          placeholder={`Any specific feedback for ${speaker.name}?`}
          rows={2}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm outline-none transition-colors resize-y focus:border-brand focus:ring-2 focus:ring-brand/10"
        />
      </div>
    </div>
  );
}
