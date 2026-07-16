import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import type { AppRole } from '@/types';

interface AuthState {
  session: Session | null;
  appRole: AppRole | null;
  mustChangePassword: boolean;
  _hydrated: boolean;

  setSession: (session: Session | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  appRole: null,
  mustChangePassword: false,
  _hydrated: false,

  setSession: (session) => {
    if (!session) {
      set({ session: null, appRole: null, mustChangePassword: false, _hydrated: true });
      return;
    }

    const meta = session.user?.user_metadata ?? {};
    const appMeta = session.user?.app_metadata ?? {};
    const appRole = (meta.app_role ?? appMeta.app_role ?? 'member') as AppRole;
    const mustChangePassword = meta.must_change_password === true;

    set({ session, appRole, mustChangePassword, _hydrated: true });
  },

  clearAuth: () =>
    set({ session: null, appRole: null, mustChangePassword: false, _hydrated: true }),
}));
