// src/hooks/useOwnerGuard.ts
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

type OwnerToken = {
  role?: string; Role?: string;
  queueId?: number | string; QueueId?: number | string; qid?: number | string;
  exp?: number | string; Exp?: number | string;
};

export function useOwnerGuard(queueId: number, mode: string) {
  const navigate = useNavigate();

  useEffect(() => {
    if (mode !== "owner") return;

    const key = `queue${queueId} token`;
    const token = localStorage.getItem(key);
    const goPublic = (): void => {
      navigate(`/queue/${queueId}`, { replace: true });
    };
    if (!token) return goPublic();

    try {
      const p = jwtDecode<OwnerToken>(token) ?? {};

      const role = (p.role ?? p.Role ?? "").toString().toLowerCase();
      const q = Number(p.queueId ?? p.QueueId ?? p.qid);
      const expRaw = p.exp ?? p.Exp;
      const expSec =
        typeof expRaw === "string" ? parseInt(expRaw, 10) : Number(expRaw);

      const now = Math.floor(Date.now() / 1000);

      const roleOK = role === "owner";
      const queueOK = Number.isFinite(q) && q === Number(queueId);
      const expOK = Number.isFinite(expSec) && expSec > now;

      if (!(roleOK && queueOK && expOK)) {
        // only remove if clearly invalid for THIS queue or expired
        if (!queueOK || !expOK) localStorage.removeItem(key);
        goPublic();
      }
    } catch {
      // bad token format: remove and bounce
      localStorage.removeItem(key);
      goPublic();
    }
  }, [mode, queueId, navigate]);
}
