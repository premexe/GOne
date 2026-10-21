import { runtimeConfig } from '../config/runtime';
import type { ApiErrorPayload } from '../types';
import { tokenStore } from './tokenStore';

export class ApiClientError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly details?: Record<string, unknown>;
  readonly requestId?: string;

  constructor(message: string, options: { code?: string; status?: number; details?: Record<string, unknown>; requestId?: string } = {}) {
    super(message);
    this.name = 'ApiClientError';
    this.code = options.code ?? 'UNEXPECTED_ERROR';
    this.status = options.status;
    this.details = options.details;
    this.requestId = options.requestId;
  }
}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ApiErrorPayload>;
  return typeof candidate.code === 'string' && typeof candidate.message === 'string';
}

async function responseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return response.text();
  try { return await response.json(); } catch { return undefined; }
}

// Login paths â€” a 401 on these means wrong credentials, NOT session expired.
const LOGIN_PATHS = ['/users/login', '/auth/login', '/auth/hospital/login', '/hospitals/login'];

export const httpClient = {
  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = tokenStore.get();
    let response: Response;
    try {
      response = await fetch(`${runtimeConfig.apiBaseUrl}${path}`, {
        ...options,
        headers: {
          Accept: 'application/json',
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
      });
    } catch {
      throw new ApiClientError('Unable to connect to the LifeLink backend. Check your internet connection.', { code: 'NETWORK_ERROR' });
    }

    const body = await responseBody(response);
    if (!response.ok) {
      // Only clear token on 401 for non-login paths
      const isLoginPath = LOGIN_PATHS.some((p) => path.endsWith(p));
      if (response.status === 401 && !isLoginPath) tokenStore.clear();

      if (isApiErrorPayload(body)) {
        throw new ApiClientError(body.message, { code: body.code, status: response.status, details: body.details, requestId: body.request_id });
      }

      // Try to extract FastAPI detail message (e.g. "Invalid email or password.")
      let fastApiDetail: string | undefined;
      if (body && typeof body === 'object') {
        const b = body as Record<string, unknown>;
        if (typeof b.detail === 'string') fastApiDetail = b.detail;
      }

      let message: string;
      if (response.status === 401) {
        message = isLoginPath
          ? (fastApiDetail ?? 'Invalid email or password. Please check your credentials.')
          : (fastApiDetail ?? 'Your hospital session has expired. Please log in again.');
      } else if (response.status === 422) {
        message = fastApiDetail ?? 'Invalid request data. Please check all fields and try again.';
      } else if (response.status === 404) {
        message = fastApiDetail ?? 'The requested resource was not found.';
      } else {
        message = fastApiDetail ?? 'The LifeLink backend could not complete this request.';
      }

      throw new ApiClientError(message, {
        code: response.status === 401 ? 'UNAUTHORIZED' : 'API_REQUEST_FAILED',
        status: response.status,
      });
    }
    return body as T;
  },
  get<T>(path: string) { return this.request<T>(path); },
  post<T>(path: string, body?: unknown) { return this.request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }); },
  patch<T>(path: string, body: unknown) { return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }); },
};

