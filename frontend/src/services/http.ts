const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

let token: string | null = null;

export function setToken(value: string | null) {
  token = value;
}

export function getToken() {
  return token;
}

export async function request(path: string, options: RequestInit = {}) {
  const isFormData = options.body instanceof FormData;
  
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let message = errorText;
    try {
      const json = JSON.parse(errorText);
      if (json.detail) {
        message = typeof json.detail === 'string' ? json.detail : JSON.stringify(json.detail);
      }
    } catch (_) {}
    throw new Error(message);
  }

  return response.json();
}