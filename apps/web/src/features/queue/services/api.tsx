
const API = import.meta.env.VITE_API_BASE_URL

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function readBody(res: Response) {
  // 204 or empty body → return null
  if (res.status === 204) return null;
  const len = res.headers.get("content-length");
  if (len === "0") return null;

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await res.json();
  return await res.text(); // fallback to text bodies (e.g., BadRequest("msg"))
}



export async function apiCreateQueue(input: { name: string; password: string }) {

  const res = await fetch(`${API}/api/queues`, { method: "POST", headers: { "Content-type": "application/json" }, body: JSON.stringify(input) })
  const body = await readBody(res);

  if (!res.ok) {
    throw new Error("failed to create a queue")
  }

  // success: return parsed body or true for 204
  return body ?? true;
}

export async function apiJoinQueue(input: { QueueId: string, Name: string; PhoneNumber: string, Email: string }) {

  const res = await fetch(`${API}/api/queuecustomers/joinQueue`, { method: "POST", headers: { "Content-type": "application/json" }, body: JSON.stringify(input) })
  const body = await readBody(res);

  if (!res.ok) {
    // try to surface a meaningful message
    const msg =
      typeof body === "string"
        ? body
        : body?.message || body?.detail || body?.title || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  // success: return parsed body or true for 204
  return body ?? true;
}

export async function apiVerifyEmail(input: { CustomerId: number, Email: string, Digits: number }) {
  const res = await fetch(`${API}/api/queuecustomers/verifyEmail`, { method: "POST", headers: { "Content-type": "application/json" }, body: JSON.stringify(input) });
  const body = await readBody(res);

  if (!res.ok) {
    const msg = typeof body === "string" ? body : body?.message || body?.detail || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

export async function apiResendVerificationEmail(input: { CustomerId: number }) {
  const res = await fetch(`${API}/api/queuecustomers/sendVerificationEmail`, { method: "POST", headers: { "Content-type": "application/json" }, body: JSON.stringify(input) });
  const body = await readBody(res);

  if (!res.ok) {
    const msg = typeof body === "string" ? body : body?.message || body?.detail || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body ?? true;
}

export async function apiManageQueue(input: { QueueId: string, password: string }) {
  const res = await fetch(`${API}/api/owners/verify-password`, { method: "POST", headers: { "Content-type": "application/json" }, body: JSON.stringify(input) })
  const body = await readBody(res);

  if (!res.ok) {
    if (res.status === 401) throw new Error("Invalid Password")
    const msg =
      typeof body === "string"
        ? body
        : body?.message || body?.detail || body?.title || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  // success: return parsed body or true for 204
  return body ?? true;
}

export async function apiCancelRegister(input: { queueId: string, customerId: number, token: string }) {
  const res = await fetch(`${API}/api/queuecustomers/cancel/${input.queueId}/${input.customerId}`, { method: "DELETE", headers: { "Content-type": "application/json", "X-Cancel-Token": input.token } })


  if (!res.ok) throw new Error("Failed to cancel registration")
  return true

}

export async function apiGetCustomers(input: { QueueId: string }) {
  const res = await fetch(`${API}/api/queues/q/${input.QueueId}`, { method: "GET", headers: { "Content-type": "application/json" } })
  const body = await readBody(res);

  if (!res.ok) {
    // try to surface a meaningful message
    const msg =
      typeof body === "string"
        ? body
        : body?.message || body?.detail || body?.title || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  // success: return parsed body or true for 204
  return body ?? true;
}

export async function apiGetOwnerCustomers(input: { QueueId: string, token: string }) {
  const res = await fetch(`${API}/api/owners/q/${input.QueueId}`, { method: "GET", headers: { "Content-type": "application/json", "Authorization": `Bearer ${input.token}` } })

  const data = await res.json()
  if (!res.ok) throw new Error(data)
  return data

}



export async function apiUpdateUserStatus(input: { QueueId: string, CustomerId: number, token: string }) {
  const res = await fetch(`${API}/api/owners/set-in-progress/${input.QueueId}/${input.CustomerId}`, { method: "PUT", headers: { "Content-type": "application/json", "Authorization": `Bearer ${input.token}` } })
  const body = await readBody(res);
  if (!res.ok) {
    // try to surface a meaningful message
    const msg =
      typeof body === "string"
        ? body
        : body?.message || body?.detail || body?.title || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  // success: return parsed body or true for 204
  return body ?? true;
}



export async function apiServeCustomer(input: { QueueId: string, CustomerId: number, token: string }) {
  const res = await fetch(`${API}/api/owners/serve/${input.QueueId}/${input.CustomerId}`, { method: "DELETE", headers: { "Content-type": "application/json", "Authorization": `Bearer ${input.token}` } })
  const body = await readBody(res);

  if (!res.ok) {
    // try to surface a meaningful message
    const msg =
      typeof body === "string"
        ? body
        : body?.message || body?.detail || body?.title || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  // success: return parsed body or true for 204
  return body ?? true;
}

export async function apiUpdateOwnerMessage(input: { QueueId: string, Message: string | null, token: string }) {
  const res = await fetch(`${API}/api/owners/update-message/${input.QueueId}`, {
    method: "PUT",
    headers: { "Content-type": "application/json", "Authorization": `Bearer ${input.token}` },
    body: JSON.stringify({ Message: input.Message })
  });

  const body = await readBody(res);

  if (!res.ok) {
    const msg =
      typeof body === "string"
        ? body
        : body?.message || body?.detail || body?.title || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return body ?? true;
}

export async function apiUpdateMaxCustomers(input: { QueueId: string, Max: number, token: string }) {
  const res = await fetch(`${API}/api/owners/set-max-customers/${input.QueueId}/${input.Max}`, { method: "PUT", headers: { "Content-type": "application/json", "Authorization": `Bearer ${input.token}` } })
  const body = await readBody(res);
  if (!res.ok) {
    // try to surface a meaningful message
    const msg =
      typeof body === "string"
        ? body
        : body?.message || body?.detail || body?.title || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  // success: return parsed body or true for 204
  return body ?? true;
}


export async function apiUpdateQueueName(input: { QueueId: string, name: string, token: string }) {
  const res = await fetch(`${API}/api/owners/update-name/${input.QueueId}`, { method: "PUT", headers: { "Content-type": "application/json", "Authorization": `Bearer ${input.token}` }, body: JSON.stringify(input.name) })
  const body = await readBody(res);
  if (!res.ok) {
    // try to surface a meaningful message
    const msg =
      typeof body === "string"
        ? body
        : body?.message || body?.detail || body?.title || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  // success: return parsed body or true for 204
  return body ?? true;
}


export async function apiUpdateAvgServiceTime(input: { QueueId: string, Minutes: number, token: string }) {
  const res = await fetch(`${API}/api/owners/update-avg-time/${input.QueueId}/${input.Minutes}`, {
    method: "PUT",
    headers: { "Content-type": "application/json", "Authorization": `Bearer ${input.token}` },
  });

  const body = await readBody(res);
  if (!res.ok) {
    const msg =
      typeof body === "string"
        ? body
        : body?.message || body?.detail || body?.title || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return body ?? true;
}

export async function apiSnoozeRegistration(input: { queueId: string, customerId: number, token: string }) {
  const res = await fetch(`${API}/api/queueCustomers/snooze/${input.queueId}/${input.customerId}`, {
    method: "PUT",
    headers: { "X-Cancel-Token": input.token }
  });

  const body = await readBody(res);
  if (!res.ok) {
    const msg = typeof body === "string" ? body : body?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return body ?? true;
}

export async function apiUpdateClosingTime(input: { QueueId: string, timeString: string, token: string }) {
  const res = await fetch(`${API}/api/owners/update-closing-time/${input.QueueId}`, {
    method: "PUT",
    headers: { "Content-type": "application/json", "Authorization": `Bearer ${input.token}` },
    body: JSON.stringify(input.timeString)
  });

  const body = await readBody(res);
  if (!res.ok) {
    const msg = typeof body === "string" ? body : body?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return body ?? true;
}
