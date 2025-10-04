// src/hooks/useOwnerSession.ts
import { useEffect, useState } from "react"
import { jwtDecode } from "jwt-decode"

type OwnerToken = { role?: string; queueId?: string | number; exp?: number }

function isValidOwnerToken(token: string | null, queueId: number | string) {
  if (!token) return false
  try {
    const { role, queueId: qid, exp } = jwtDecode<OwnerToken>(token)
    const now = Math.floor(Date.now() / 1000)
    return role === "owner" && String(qid) === String(queueId) && typeof exp === "number" && exp > now
  } catch {
    return false
  }
}

export function useOwnerSession(queueId: number | string, pingUrl?: string) {
  const key = `queue${queueId} token`
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(key))
  const [signedIn, setSignedIn] = useState<boolean>(() => isValidOwnerToken(token, queueId))

  // watch localStorage changes from other tabs/windows
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
        const t = localStorage.getItem(key)
        setToken(t)
        setSignedIn(isValidOwnerToken(t, queueId))
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [key, queueId])

  // optional: server ping to be extra sure / support revocation
  useEffect(() => {
    if (!pingUrl || !signedIn || !token) return
    fetch(pingUrl, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) throw new Error()
      })
      .catch(() => {
        localStorage.removeItem(key)
        setToken(null)
        setSignedIn(false)
      })
  }, [pingUrl, signedIn, token, key])

  return { signedIn, token, key }
}
