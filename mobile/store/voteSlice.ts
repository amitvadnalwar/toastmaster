import { create } from 'zustand';
import type { VoteCategory } from '@/types';

interface VoteState {
  submittedCategories: Set<VoteCategory>;
  ratingSubmitted: boolean;
  markCategorySubmitted: (category: VoteCategory) => void;
  markRatingSubmitted: () => void;
  resetVotes: () => void;
}

export const useVoteStore = create<VoteState>((set) => ({
  submittedCategories: new Set(),
  ratingSubmitted: false,

  markCategorySubmitted: (category) =>
    set((state) => ({
      submittedCategories: new Set([...state.submittedCategories, category]),
    })),

  markRatingSubmitted: () => set({ ratingSubmitted: true }),

  resetVotes: () => set({ submittedCategories: new Set(), ratingSubmitted: false }),
}));
