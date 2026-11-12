import { normalizeApiBaseUrl } from './apiClient';

export function getApiBaseUrl(): string {
  return normalizeApiBaseUrl(import.meta.env.VITE_API_URL);
}
