import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import type { AppRole, Member } from '@/types';

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return {};
  }
}

interface AuthState {
  session: Session | null;
  member: Member | null;
  appRole: AppRole | null;
  clubId: string | null;
  isGuest: boolean;
  guestToken: string | null;
  /** True once the initial getSession() call in _layout.tsx has resolved. */
  _hydrated: boolean;
  /** True when the user logged in with a temp password and must set a permanent one. */
  mustChangePassword: boolean;
  setSession: (session: Session | null) => void;
  setMember: (member: Member) => void;
  setGuestToken: (token: string, guestMember: Member) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  member: null,
  appRole: null,
  clubId: null,
  isGuest: false,
  guestToken: null,
  _hydrated: false,
  mustChangePassword: false,

  setSession: (session) => {
    if (!session) {
      set({ session: null, appRole: null, clubId: null, _hydrated: true, mustChangePassword: false });
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

  setMember: (member) =>
    set({ member, appRole: member.app_role, isGuest: member.is_guest }),

  setGuestToken: (guestToken, guestMember) =>
    set({ guestToken, member: guestMember, isGuest: true, appRole: null }),

  clearAuth: () =>
    set({
      session: null,
      member: null,
      appRole: null,
      clubId: null,
      isGuest: false,
      guestToken: null,
      _hydrated: true,
      mustChangePassword: false,
    }),
}));
