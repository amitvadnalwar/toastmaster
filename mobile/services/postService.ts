import { apiRequest } from '@/lib/apiClient';
import type { Post, PostPlatform } from '@/types';

export function getActivePost(clubId: string, token: string): Promise<Post | null> {
  return apiRequest<Post | null>(`/posts/active/${clubId}`, { token });
}

export interface CreatePostPayload {
  platform: PostPlatform;
  url: string;
  thumbnail_url?: string;
}

export function createPost(payload: CreatePostPayload, token: string): Promise<Post> {
  return apiRequest<Post>('/posts', { method: 'POST', body: payload, token });
}
