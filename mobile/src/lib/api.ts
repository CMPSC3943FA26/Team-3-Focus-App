import axios from 'axios';

const baseURL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
const HAS_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/i;

export const apiEnabled = baseURL.length > 0;

export const apiHost = apiEnabled ? baseURL.replace(/^https?:\/\//, '').split('/')[0] : null;

export const api = axios.create({
  baseURL,
  timeout: 5000,
  headers: { 'Content-Type': 'application/json' },
});

export type ServerStatus = 'local' | 'online' | 'offline';

export async function checkServer(): Promise<ServerStatus> {
  if (!apiEnabled) return 'local';
  try {
    const response = await api.get('/health');
    return response.status === 200 ? 'online' : 'offline';
  } catch {
    return 'offline';
  }
}

export function isNotFound(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404;
}

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { error?: string } | undefined)?.error;
    if (message) return message;
    if (!error.response) return 'Could not reach the server';
  }
  return 'Something went wrong';
}

export function withUtcStamps<T extends { created_at: string; updated_at: string }>(item: T): T {
  // server send utc time but without the Z, so js read it as local time and it go off by some hours
  const fix = (value: string) => (HAS_OFFSET.test(value) ? value : `${value}Z`);
  return { ...item, created_at: fix(item.created_at), updated_at: fix(item.updated_at) };
}
