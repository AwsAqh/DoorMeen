// guards/RequireOwner.tsx
import { Navigate, Outlet, useParams } from "react-router-dom";

function parseJwt(token: string) {
  const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(b64));
}
function isExpired(token: string) {
  try { return (Date.now() / 1000) >= parseJwt(token).exp; } catch { return true; }
}

export function RequireOwner() {
  const { id } = useParams<{ id: string }>();
  const token = localStorage.getItem(`queue${id} token`);
  if (!token || isExpired(token)) {
    return <Navigate to={`/queue/${id}`} replace />;
  }
  return <Outlet />; 
}
