/**
 * useQueueSignalR — mirrors apps/web/src/hooks/useQueueSignalR.ts
 *
 * Backend (apps/api/Api/Program.cs): the hub lives at `/hubs/queue` and clients
 * must invoke `JoinQueueGroup(queueId)` / `LeaveQueueGroup(queueId)` to receive
 * events for a queue. The previous implementation connected to `/queueHub?queueId=`
 * — an endpoint that does not exist — so no realtime events were ever delivered.
 *
 * Event payloads are serialized camelCase by SignalR's default protocol while
 * the REST API is PascalCase (PropertyNamingPolicy = null); every field accepts
 * both casings, exactly like the web hook does.
 */
import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { Status } from '../constants/status';

const API = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

export type CustomerSignalR = {
  Id: number;
  QueueId?: string;
  Name: string;
  State: Status;
  /** Alias of State — keeps consumers written against the old hook shape working. */
  Status: Status;
  CreatedAt?: string;
};

type Handlers = {
  onCustomerJoined?: (customer: CustomerSignalR) => void;
  onCustomerVerified?: (customer: CustomerSignalR) => void;
  onCustomerLeft?: (customerId: number) => void;
  onCustomerStatusChanged?: (customer: CustomerSignalR) => void;
  onCustomerServed?: (customerId: number) => void;
  onMessageUpdated?: (message: string | null) => void;
  onQueueUpdated?: () => void;
};

const asRecord = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' ? (v as Record<string, unknown>) : null;

/** Normalize a SignalR customer payload (camelCase or PascalCase). */
const asCustomer = (raw: unknown): CustomerSignalR | null => {
  const r = asRecord(raw);
  if (!r) return null;
  const id = r.Id ?? r.id;
  if (typeof id !== 'number') return null;
  const state = r.State ?? r.state;
  const name = r.Name ?? r.name;
  const createdAt = r.CreatedAt ?? r.createdAt;
  const queueId = r.QueueId ?? r.queueId;
  const normalizedState = typeof state === 'string' ? (state as Status) : 'waiting';
  return {
    Id: id,
    QueueId: typeof queueId === 'string' ? queueId : undefined,
    Name: typeof name === 'string' ? name : '',
    State: normalizedState,
    Status: normalizedState,
    CreatedAt: typeof createdAt === 'string' ? createdAt : undefined,
  };
};

const asCustomerId = (raw: unknown): number =>
  typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;

export function useQueueSignalR(queueId: string | null, handlers: Handlers) {
  const handlersRef = useRef(handlers);

  // Keep handlers fresh without reconnecting
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!queueId) return;

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${API}/hubs/queue`, {
        skipNegotiation: false,
        transport:
          signalR.HttpTransportType.WebSockets |
          signalR.HttpTransportType.ServerSentEvents |
          signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    conn.on('CustomerJoined', (raw) => {
      const c = asCustomer(raw);
      if (c) handlersRef.current.onCustomerJoined?.(c);
    });
    conn.on('CustomerVerified', (raw) => {
      const c = asCustomer(raw);
      if (c) handlersRef.current.onCustomerVerified?.(c);
    });
    conn.on('CustomerLeft', (raw) => {
      const id = asCustomerId(raw);
      if (!Number.isNaN(id)) handlersRef.current.onCustomerLeft?.(id);
    });
    conn.on('CustomerStatusChanged', (raw) => {
      const c = asCustomer(raw);
      if (c) handlersRef.current.onCustomerStatusChanged?.(c);
    });
    conn.on('CustomerServed', (raw) => {
      const id = asCustomerId(raw);
      if (!Number.isNaN(id)) handlersRef.current.onCustomerServed?.(id);
    });
    conn.on('MessageUpdated', (raw) => {
      handlersRef.current.onMessageUpdated?.(typeof raw === 'string' ? raw : null);
    });
    conn.on('QueueUpdated', () => handlersRef.current.onQueueUpdated?.());

    let joined = false;
    (async () => {
      try {
        await conn.start();
        await conn.invoke('JoinQueueGroup', queueId);
        joined = true;
      } catch (err) {
        console.warn('[SignalR] connection failed', err);
      }
    })();

    return () => {
      if (joined) conn.invoke('LeaveQueueGroup', queueId).catch(() => undefined);
      conn.stop().catch(() => undefined);
    };
  }, [queueId]);
}
