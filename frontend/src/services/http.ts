import Constants from 'expo-constants';

function getExpoGoApiUrl(): string | null {
  // Expo provides the host used by the QR-code development server, for example
  // "172.16.36.188:8081". Use the same laptop host for the FastAPI port.
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;

  const hostAndPort = hostUri.replace(/^https?:\/\//, '').split('/')[0];
  const host = hostAndPort.replace(/:\d+$/, '');
  return host ? `http://${host}:8000` : null;
}

// In Expo Go development, this follows the laptop's current Wi-Fi IP
// automatically. A fixed EXPO_PUBLIC_API_URL is used only for web/production.
const API_URL = (__DEV__ ? getExpoGoApiUrl() : null)
  || process.env.EXPO_PUBLIC_API_URL
  || 'http://127.0.0.1:8000';

let token: string | null = null;

export function setToken(value: string | null) {
  token = value;
}

export function getToken() {
  return token;
}

export async function request(path: string, options: RequestInit = {}) {
  const isFormData = options.body instanceof FormData;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('Cannot reach the LifeLink API. Check that the backend is running and that your phone is on the same Wi-Fi.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

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
