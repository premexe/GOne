import type { DataMode } from '../types';

function dataMode(value: string | undefined): DataMode {
  return value?.toLowerCase() === 'mock' ? 'mock' : 'api';
}

export const runtimeConfig = Object.freeze({
  dataMode: dataMode(import.meta.env.VITE_DATA_MODE),
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL ?? 'https://lifelink-backend-1tzq.onrender.com').replace(/\/$/, ''),
});

export const isMockMode = runtimeConfig.dataMode === 'mock';

