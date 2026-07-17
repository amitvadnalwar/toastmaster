const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

interface ApiResponse<T> {
  data: T;
  error: string | null;
  meta?: Record<string, unknown>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string;
};

export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, token }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, `Network error: cannot reach server at ${BASE_URL}`);
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  let json: ApiResponse<T> & { detail?: string; error?: string };
  try {
    json = await response.json();
  } catch {
    throw new ApiError(response.status, `Server returned non-JSON response (status ${response.status})`);
  }

  if (!response.ok) {
    const message = json?.detail ?? json?.error ?? `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return json.data;
}
