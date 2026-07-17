import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import type { AppRole } from '@/types';

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return {};
  }
}

interface AuthState {
  session: Session | null;
  appRole: AppRole | null;
  clubId: string | null;
  mustChangePassword: boolean;
  _hydrated: boolean;

  setSession: (session: Session | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  appRole: null,
  clubId: null,
  mustChangePassword: false,
  _hydrated: false,

  setSession: (session) => {
    if (!session) {
      set({ session: null, appRole: null, clubId: null, mustChangePassword: false, _hydrated: true });
      return;
    }

    const claims = decodeJwtPayload(session.access_token);
    const appMeta = (claims.app_metadata as Record<string, unknown>) ?? {};

    set({
      session,
      appRole: (claims.app_role as AppRole) ?? null,
      clubId: (claims.club_id as string) ?? null,
      mustChangePassword: appMeta.must_change_password === true,
      _hydrated: true,
    });
  },

  clearAuth: () =>
    set({ session: null, appRole: null, clubId: null, mustChangePassword: false, _hydrated: true }),
}));
