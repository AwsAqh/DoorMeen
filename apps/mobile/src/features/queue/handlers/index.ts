import { JoinSchema }   from '../validations/join.schema';
import { CreateSchema } from '../validations/create.schema';
import { ManageSchema } from '../validations/manage.schema';
import {
  apiJoinQueue,
  apiCreateQueue,
  apiVerifyPassword,
  setOwnerToken,
  setCancelToken,
} from '../services/api';

// ─── Join ────────────────────────────────────────────────────────────────────

export type JoinData = { QueueId: string; Name: string; PhoneNumber: string; Email: string };

export async function handleJoin(input: JoinData) {
  const parsed = JoinSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const server = await apiJoinQueue(parsed.data);
  // Save the per-customer token used for cancel/snooze actions.
  const customerId = server?.Id ?? server?.id ?? server?.CustomerId ?? server?.customerId;
  const cancelToken = server?.Token ?? server?.token ?? server?.CancelToken ?? server?.cancelToken;
  if (typeof customerId === 'number' && typeof cancelToken === 'string') {
    setCancelToken(customerId, cancelToken);
  }
  return server;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export type CreateData = { name: string; password: string; email: string };

export async function handleCreate(input: CreateData) {
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  return await apiCreateQueue(parsed.data);
}

// ─── Manage (login as owner) ─────────────────────────────────────────────────

export type ManageData = { QueueId: string; password: string };

export async function handleManage(input: ManageData) {
  const parsed = ManageSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const result = await apiVerifyPassword({ QueueId: input.QueueId, password: input.password });
  const token = result?.token ?? result?.Token ?? (typeof result === 'string' ? result : null);
  if (token) setOwnerToken(input.QueueId, token);
  return result;
}
