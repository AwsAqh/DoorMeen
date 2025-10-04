// src/hooks/useOwnerGuard.ts
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {jwtDecode} from "jwt-decode";

type OwnerToken = { role?: string; queueId?: string | number; exp?: number };

export function useOwnerGuard(queueId: string | number, mode: string) {
  const navigate = useNavigate();

  useEffect(() => {
    if (mode !== "owner") return;

    const key = `queue${queueId} token`;
    const token = localStorage.getItem(key);

    const redirect = () => {
      localStorage.removeItem(key);
      navigate(`/queue/${queueId}`, { replace: true });
    };

    if (!token) return redirect();

    try {
      const { role, queueId: qid, exp } = jwtDecode<OwnerToken>(token);
      const now = Math.floor(Date.now() / 1000);

      const valid =
        role === "owner" &&
        String(qid) === String(queueId) &&
        typeof exp === "number" &&
        exp > now;

      if (!valid) redirect();
    } catch {
      redirect();
    }
  }, [mode, queueId, navigate]);
}
