import Constants from 'expo-constants';
import type { ApiResponse } from '@/types';

const baseUrl = Constants.expoConfig?.extra?.apiBaseUrl as string;

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token: string;
};

export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, token }: RequestOptions
): Promise<T> {
  const url = `${baseUrl}${path}`;
  console.log(`[API] ${method} ${url}`);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    console.error(`[API] Network error on ${method} ${url}:`, err);
    throw new Error(`Network error: cannot reach server at ${baseUrl}`);
  }

  console.log(`[API] ${method} ${url} → ${response.status}`);

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  let json: ApiResponse<T>;
  try {
    json = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new Error(`Server returned non-JSON response (status ${response.status})`);
  }

  if (!response.ok) {
    const message = (json as { detail?: string; error?: string }).detail
      ?? json.error
      ?? `Request failed with status ${response.status}`;
    console.error(`[API] Error response:`, json);
    throw new Error(message);
  }

  return json.data;
}