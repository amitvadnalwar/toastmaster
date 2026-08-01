import { create } from 'zustand';
import { CLUB_NAME } from '@/lib/constants';

interface AlertState {
  open: boolean;
  title: string;
  message: string;
  resolve: (() => void) | null;
  show: (message: string, title?: string) => Promise<void>;
  close: () => void;
}

// App-wide replacement for window.alert(). Native alert()/confirm() dialogs
// always show "<site origin> says" as the title — that's a hardcoded browser
// security feature no website can override. This renders our own modal
// instead, titled with the club's name, and stays awaitable like alert() so
// call sites barely change (`await showAlert(...)` in place of `alert(...)`).
export const useAlertStore = create<AlertState>((set, get) => ({
  open: false,
  title: CLUB_NAME,
  message: '',
  resolve: null,

  show: (message, title = CLUB_NAME) =>
    new Promise<void>((resolve) => {
      set({ open: true, title, message, resolve });
    }),

  close: () => {
    get().resolve?.();
    set({ open: false, resolve: null });
  },
}));

export function showAlert(message: string, title?: string): Promise<void> {
  return useAlertStore.getState().show(message, title);
}
