/**
 * useOwnerSession — mirrors apps/web/src/hooks/useOwnerSession.tsx
 * Reads the stored JWT and validates ownership of a given queueId.
 */
import { useState, useEffect } from 'react';
import { getOwnerToken, setOwnerToken, getAllOwnerTokens } from '../features/queue/services/api';
import { jwtDecode } from 'jwt-decode';

type JwtPayload = {
  'queue-id'?: string;
  exp?: number;
};

export function isTokenValid(token: string): boolean {
  try {
    const { exp } = jwtDecode<JwtPayload>(token);
    if (!exp) return false;
    return Date.now() / 1000 < exp;
  } catch {
    return false;
  }
}

export function useOwnerSession(queueId: string | null) {
  const [token, setToken] = useState<string | null>(() => {
    if (!queueId) return null;
    const t = getOwnerToken(queueId);
    return t && isTokenValid(t) ? t : null;
  });
  const [isOwner, setIsOwner] = useState<boolean>(() => {
    if (!queueId) return false;
    const t = getOwnerToken(queueId);
    return !!(t && isTokenValid(t));
  });

  useEffect(() => {
    if (!queueId) { setToken(null); setIsOwner(false); return; }
    const t = getOwnerToken(queueId);
    if (t && isTokenValid(t)) { setToken(t); setIsOwner(true); }
    else                      { setToken(null); setIsOwner(false); }
  }, [queueId]);

  const login = (newToken: string) => {
    if (queueId) { setOwnerToken(queueId, newToken); setToken(newToken); setIsOwner(true); }
  };
  const logout = () => { setToken(null); setIsOwner(false); };

  return { token, isOwner, login, logout };
}

/** Returns all queues this device has an owner token for. */
export function useOwnerQueues() {
  return getAllOwnerTokens().filter(({ token }) => isTokenValid(token));
}
