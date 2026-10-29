/**
 * API service — mirrors apps/web/src/features/queue/services/api.tsx exactly.
 * Uses fetch() which works identically in React Native.
 * Storage is injected via the `storage` param so the service stays testable.
 */

import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV();

// ─── Base URL ────────────────────────────────────────────────────────────────
// Set EXPO_PUBLIC_API_BASE_URL in apps/mobile/.env
const API = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

/** Wake the hosted API when the app opens; startup should continue if the server is cold. */
export async function apiHealthCheck() {
  if (!API) return;
  try {
    await fetch(`${API}/health`, { method: 'GET', signal: AbortSignal.timeout(8000) });
  } catch {
    // The health ping is best-effort and must not block app startup.
  }
}

// ─── Custom Error ────────────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Shared body reader ───────────────────────────────────────────────────────
async function readBody(res: Response) {
  if (res.status === 204) return null;
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) return await res.json();
  return await res.text();
}

function errorMessage(body: any, fallback: string) {
  if (typeof body === 'string' && body.trim()) return body;
  return body?.message ?? body?.detail ?? body?.title ?? fallback;
}

// ─── Token helpers (MMKV instead of localStorage) ────────────────────────────
export const storage_keys = {
  ownerToken: (queueId: string) => `queue${queueId} token`,
  cancelToken: (customerId: number) => `queueCancelToken${customerId}`,
};

export function getOwnerToken(queueId: string): string | null {
  return storage.getString(storage_keys.ownerToken(queueId)) ?? null;
}
export function setOwnerToken(queueId: string, token: string) {
  storage.set(storage_keys.ownerToken(queueId), token);
}
export function getCancelToken(customerId: number): string | null {
  return storage.getString(storage_keys.cancelToken(customerId)) ?? null;
}
export function setCancelToken(customerId: number, token: string) {
  storage.set(storage_keys.cancelToken(customerId), token);
}
export function getAllOwnerTokens(): { id: string; token: string }[] {
  const keys = storage.getAllKeys();
  return keys
    .filter((k: string) => k.startsWith('queue') && k.endsWith(' token'))
    .map((k: string) => ({
      id: k.slice(5, k.length - 6),
      token: storage.getString(k) ?? '',
    }));
}

// ─── Recent queues (persistent, long-lasting) ────────────────────────────────
const RECENT_QUEUES_KEY = 'recentQueues';
const MAX_RECENT = 10;

export type RecentQueue = {
  id: string;
  name: string;
  visitedAt: number; // Unix timestamp ms
};

export function getRecentQueues(): RecentQueue[] {
  try {
    const raw = storage.getString(RECENT_QUEUES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentQueue[];
  } catch {
    return [];
  }
}

export function saveRecentQueue(id: string, name: string) {
  try {
    const existing = getRecentQueues().filter(q => q.id !== id); // dedupe
    const updated: RecentQueue[] = [
      { id, name, visitedAt: Date.now() },
      ...existing,
    ].slice(0, MAX_RECENT);
    storage.set(RECENT_QUEUES_KEY, JSON.stringify(updated));
  } catch { /* non-critical */ }
}

export function removeRecentQueue(id: string) {
  try {
    const updated = getRecentQueues().filter(q => q.id !== id);
    storage.set(RECENT_QUEUES_KEY, JSON.stringify(updated));
  } catch { /* non-critical */ }
}


// ─── Queue APIs ───────────────────────────────────────────────────────────────

export async function apiCreateQueue(input: { name: string; password: string; email: string }) {
  const res = await fetch(`${API}/api/queues`, {
    method: 'POST',
    headers: { 'Content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = await readBody(res);
  if (!res.ok) throw new ApiError(res.status, errorMessage(body, `HTTP ${res.status}`));
  return body ?? true;
}

export async function apiGetQueuePublic(queueId: string) {
  const res = await fetch(`${API}/api/queues/q/${queueId}`, {
    method: 'GET',
    headers: { 'Content-type': 'application/json' },
  });
  const body = await readBody(res);
  if (!res.ok) {
    throw new ApiError(res.status, errorMessage(body, `HTTP ${res.status}`));
  }
  return body;
}

export async function apiGetOwnerQueue(queueId: string, token: string) {
  const res = await fetch(`${API}/api/owners/q/${queueId}`, {
    method: 'GET',
    headers: { 'Content-type': 'application/json', Authorization: `Bearer ${token}` },
  });
  const body = await readBody(res);
  if (!res.ok) throw new ApiError(res.status, errorMessage(body, `HTTP ${res.status}`));
  return body;
}

// ─── Owner APIs ───────────────────────────────────────────────────────────────

export async function apiVerifyPassword(input: { QueueId: string; password: string }) {
  const res = await fetch(`${API}/api/owners/verify-password`, {
    method: 'POST',
    headers: { 'Content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = await readBody(res);
  if (!res.ok) {
    if (res.status === 401) throw new ApiError(401, 'Invalid password');
    throw new ApiError(res.status, errorMessage(body, `HTTP ${res.status}`));
  }
  return body;
}

export async function apiChangeQueuePassword(input: { QueueId: string; password: string; token: string }) {
  const res = await fetch(`${API}/api/owners/change-password/${input.QueueId}`, {
    method: 'PUT',
    headers: { 'Content-type': 'application/json', Authorization: `Bearer ${input.token}` },
    body: JSON.stringify({ QueueId: input.QueueId, Password: input.password }),
  });
  const body = await readBody(res);
  if (!res.ok) throw new ApiError(res.status, errorMessage(body, `HTTP ${res.status}`));
}

export async function apiUpdateOwnerMessage(input: { QueueId: string; Message: string | null; token: string }) {
  const res = await fetch(`${API}/api/owners/update-message/${input.QueueId}`, {
    method: 'PUT',
    headers: { 'Content-type': 'application/json', Authorization: `Bearer ${input.token}` },
    body: JSON.stringify({ Message: input.Message }),
  });
  if (!res.ok) throw new ApiError(res.status, 'Failed to update message');
}

export async function apiUpdateAvgServiceTime(input: { QueueId: string; Minutes: number; token: string }) {
  const res = await fetch(`${API}/api/owners/update-avg-time/${input.QueueId}/${input.Minutes}`, {
    method: 'PUT',
    headers: { 'Content-type': 'application/json', Authorization: `Bearer ${input.token}` },
  });
  if (!res.ok) throw new ApiError(res.status, 'Failed to update avg service time');
}

export async function apiUpdateMaxCustomers(input: { QueueId: string; Max: number; token: string }) {
  const res = await fetch(`${API}/api/owners/set-max-customers/${input.QueueId}/${input.Max}`, {
    method: 'PUT',
    headers: { 'Content-type': 'application/json', Authorization: `Bearer ${input.token}` },
  });
  if (!res.ok) throw new ApiError(res.status, 'Failed to update max customers');
}

export async function apiUpdateQueueName(input: { QueueId: string; name: string; token: string }) {
  const res = await fetch(`${API}/api/owners/update-name/${input.QueueId}`, {
    method: 'PUT',
    headers: { 'Content-type': 'application/json', Authorization: `Bearer ${input.token}` },
    body: JSON.stringify(input.name),
  });
  if (!res.ok) throw new ApiError(res.status, 'Failed to update queue name');
}

export async function apiUpdateClosingTime(input: { QueueId: string; timeString: string; token: string }) {
  const res = await fetch(`${API}/api/owners/update-closing-time/${input.QueueId}`, {
    method: 'PUT',
    headers: { 'Content-type': 'application/json', Authorization: `Bearer ${input.token}` },
    body: JSON.stringify(input.timeString),
  });
  if (!res.ok) throw new ApiError(res.status, 'Failed to update closing time');
}

export async function apiServeCustomer(input: { QueueId: string; CustomerId: number; token: string }) {
  const res = await fetch(`${API}/api/owners/serve/${input.QueueId}/${input.CustomerId}`, {
    method: 'DELETE',
    headers: { 'Content-type': 'application/json', Authorization: `Bearer ${input.token}` },
  });
  if (!res.ok) throw new ApiError(res.status, 'Failed to serve customer');
}

export async function apiUpdateCustomerStatus(input: { QueueId: string; CustomerId: number; token: string }) {
  const res = await fetch(`${API}/api/owners/set-in-progress/${input.QueueId}/${input.CustomerId}`, {
    method: 'PUT',
    headers: { 'Content-type': 'application/json', Authorization: `Bearer ${input.token}` },
  });
  if (!res.ok) throw new ApiError(res.status, 'Failed to update status');
}

export async function apiRevertCustomerToWaiting(input: { QueueId: string; CustomerId: number; token: string }) {
  const res = await fetch(`${API}/api/owners/set-waiting/${input.QueueId}/${input.CustomerId}`, {
    method: 'PUT',
    headers: { 'Content-type': 'application/json', Authorization: `Bearer ${input.token}` },
  });
  if (!res.ok) throw new ApiError(res.status, errorMessage(await readBody(res), 'Failed to move customer back to waiting'));
}

// ─── Customer APIs ────────────────────────────────────────────────────────────

export async function apiJoinQueue(input: { QueueId: string; Name: string; PhoneNumber: string; Email: string }) {
  const res = await fetch(`${API}/api/queuecustomers/joinQueue`, {
    method: 'POST',
    headers: { 'Content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = await readBody(res);
  if (!res.ok) {
    throw new ApiError(res.status, errorMessage(body, `HTTP ${res.status}`));
  }
  return body;
}

export async function apiCancelRegistration(input: { queueId: string; customerId: number; token: string }) {
  const res = await fetch(`${API}/api/queuecustomers/cancel/${input.queueId}/${input.customerId}`, {
    method: 'DELETE',
    headers: { 'Content-type': 'application/json', 'X-Cancel-Token': input.token },
  });
  if (!res.ok) throw new ApiError(res.status, 'Failed to cancel registration');
  return true;
}

export async function apiSnoozeRegistration(input: { queueId: string; customerId: number; token: string }) {
  const res = await fetch(`${API}/api/queueCustomers/snooze/${input.queueId}/${input.customerId}`, {
    method: 'PUT',
    headers: { 'X-Cancel-Token': input.token },
  });
  if (!res.ok) throw new ApiError(res.status, 'Failed to snooze registration');
  return true;
}
