export interface ApiResponse<T> {
  data: T;
  error: string | null;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  error: string;
  detail?: string;
}
