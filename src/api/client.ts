import type { AppState } from '../types';
import { normalizeState } from '../utils/storage';

const API_BASE = '/api';

export async function fetchStateFromServer(): Promise<AppState> {
  const res = await fetch(`${API_BASE}/state`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data = (await res.json()) as Partial<AppState>;
  return normalizeState(data);
}

export async function pushStateToServer(state: AppState): Promise<void> {
  const res = await fetch(`${API_BASE}/state`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${detail}`);
  }
}
