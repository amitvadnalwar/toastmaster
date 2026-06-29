export type PostPlatform = 'instagram' | 'linkedin';

export interface Post {
  id: string;
  club_id: string;
  platform: PostPlatform;
  url: string;
  thumbnail_url: string | null;
  is_active: boolean;
  created_at: string;
}
