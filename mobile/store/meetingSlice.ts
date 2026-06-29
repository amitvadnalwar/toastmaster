import { create } from 'zustand';
import type { Meeting, MeetingRole, MeetingRoleAssignment, VotingStatus } from '@/types';

interface MeetingState {
  currentMeeting: Meeting | null;
  votingStatus: VotingStatus;
  myRole: MeetingRole | null;
  roster: MeetingRoleAssignment[];
  setCurrentMeeting: (meeting: Meeting) => void;
  setVotingStatus: (status: VotingStatus) => void;
  setRoster: (roster: MeetingRoleAssignment[]) => void;
  setMyRole: (role: MeetingRole | null) => void;
  clearMeeting: () => void;
}

export const useMeetingStore = create<MeetingState>((set) => ({
  currentMeeting: null,
  votingStatus: 'not_started',
  myRole: null,
  roster: [],

  setCurrentMeeting: (meeting) =>
    set({ currentMeeting: meeting, votingStatus: meeting.voting_status }),

  setVotingStatus: (votingStatus) => set({ votingStatus }),

  setRoster: (roster) => set({ roster }),

  setMyRole: (myRole) => set({ myRole }),

  clearMeeting: () =>
    set({ currentMeeting: null, votingStatus: 'not_started', myRole: null, roster: [] }),
}));
