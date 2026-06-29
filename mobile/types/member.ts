export type AppRole = 'member' | 'admin' | 'super_admin';

export type ClubRole =
  | 'member'
  | 'guest'
  | 'president'
  | 'vp_education'
  | 'vp_membership'
  | 'vp_pr'
  | 'secretary'
  | 'treasurer'
  | 'saa';

export const CLUB_ROLE_LABELS: Record<ClubRole, string> = {
  member: 'Member',
  guest: 'Guest',
  president: 'President',
  vp_education: 'VP Education',
  vp_membership: 'VP Membership',
  vp_pr: 'VP PR',
  secretary: 'Secretary',
  treasurer: 'Treasurer',
  saa: 'SAA',
};

export const ASSIGNABLE_CLUB_ROLES: ClubRole[] = [
  'president',
  'vp_education',
  'vp_membership',
  'vp_pr',
  'secretary',
  'treasurer',
  'saa',
  'member',
];

export interface Member {
  id: string;
  auth_user_id: string | null;
  club_id: string;
  email: string;
  phone: string | null;
  name: string;
  birthday: string | null; // MM-DD format
  birthday_collected: boolean;
  source: string | null;
  is_guest: boolean;
  app_role: AppRole | null;
  club_role: ClubRole;
  created_at: string;
  is_active: boolean;
  is_confirmed: boolean;
}

export type RegistrationSource =
  | 'Friend'
  | 'Social Media'
  | 'Website'
  | 'Walk-in'
  | 'Other';
