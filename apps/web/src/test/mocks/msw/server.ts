import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

// --- In-memory state for tests (simple) ---
let nextQueueId = 1;
const queues = new Map<number, { id: number; name: string; maxCustomers: number }>();
const customersByQueue = new Map<number, Array<{ id: number; name: string; phone: string; state: "waiting" | "in_progress" }>>();
let nextCustomerId = 1;

// Helpers
function ensureQueue(qid: number) {
  if (!queues.has(qid)) {
    queues.set(qid, { id: qid, name: `Q-${qid}`, maxCustomers: 50 });
    customersByQueue.set(qid, []);
  }
}

export const handlers = [
  // Create queue
  http.post("https://localhost:7014/api/queues", async ({ request }) => {
    const body = (await request.json()) as { name: string; password: string };
    const id = nextQueueId++;
    queues.set(id, { id, name: body.name, maxCustomers: 50 });
    customersByQueue.set(id, []);
    return HttpResponse.json({ id, name: body.name, maxCustomers: 50 }, { status: 200 });
  }),

  // Join queue
  http.post("https://localhost:7014/api/queuecustomers", async ({ request }) => {
    const body = (await request.json()) as { QueueId: number; Name: string; PhoneNumber: string };
    ensureQueue(body.QueueId);
    const list = customersByQueue.get(body.QueueId)!;

    // duplicate by phone?
    if (list.some(c => c.phone === body.PhoneNumber)) {
      // your client maps JSON.error.detail or text; give JSON with detail
      return HttpResponse.json({ detail: "Already joined" }, { status: 409 });
    }

    const created = { id: nextCustomerId++, name: body.Name, phone: body.PhoneNumber, state: "waiting" as const };
    list.push(created);
    return HttpResponse.json({ id: created.id, queueId: body.QueueId, name: created.name }, { status: 201 });
  }),

  // Verify owner password
  http.post("https://localhost:7014/api/owners/verify-password", async ({ request }) => {
    const body = (await request.json()) as { QueueId: number; password: string };
    // only "abcd" is valid in our mock
    if (body.password === "abcd") {
      return HttpResponse.json({ token: "jwt-123" }, { status: 200 });
    }
    // text body on error is fine; your client throws a fixed "Invalid Password"
    return HttpResponse.text("Invalid", { status: 401 });
  }),

  // Get public customers
  http.get("https://localhost:7014/api/queues/q/:qid", async ({ params }) => {
    const qid = Number(params.qid);
    ensureQueue(qid);
    const list = customersByQueue.get(qid)!;

    // Simulate sometimes empty -> 204
    if (list.length === 0) {
      return new HttpResponse(null, { status: 204 });
    }
    return HttpResponse.json(list.map(c => ({ id: c.id, name: c.name, state: c.state })), { status: 200 });
  }),

  // Owner: get customers (requires Authorization: Bearer jwt-123)
  http.get("https://localhost:7014/api/owners/q/:qid", async ({ request, params }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer jwt-")) {
      return HttpResponse.json({ title: "Unauthorized" }, { status: 401 });
    }
    const qid = Number(params.qid);
    ensureQueue(qid);
    const list = customersByQueue.get(qid)!;
    return HttpResponse.json(list, { status: 200 });
  }),

  // Owner: set in progress
  http.put("https://localhost:7014/api/owners/set-in-progress/:qid/:cid", async ({ request, params }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer jwt-")) {
      return HttpResponse.json({ title: "Unauthorized" }, { status: 401 });
    }
    const qid = Number(params.qid);
    const cid = Number(params.cid);
    ensureQueue(qid);
    const list = customersByQueue.get(qid)!;
    const found = list.find(c => c.id === cid);
    if (!found) return HttpResponse.json({ detail: "Not found" }, { status: 404 });

    found.state = "in_progress";
    return HttpResponse.json({ id: found.id, state: found.state }, { status: 200 });
  }),

  // Owner: serve (delete) -> 204
  http.delete("https://localhost:7014/api/owners/serve/:qid/:cid", async ({ request, params }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer jwt-")) {
      return HttpResponse.text("Unauthorized", { status: 401 });
    }
    const qid = Number(params.qid);
    const cid = Number(params.cid);
    ensureQueue(qid);
    const list = customersByQueue.get(qid)!;
    const idx = list.findIndex(c => c.id === cid);
    if (idx === -1) return HttpResponse.text("Not found", { status: 404 });
    list.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // Owner: set max customers
  http.put("https://localhost:7014/api/owners/set-max-customers/:qid/:max", async ({ request, params }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer jwt-")) {
      return HttpResponse.json({ title: "Unauthorized" }, { status: 401 });
    }
    const qid = Number(params.qid);
    const max = Number(params.max);
    if (max <= 0) return HttpResponse.json({ title: "Bad value" }, { status: 400 });

    ensureQueue(qid);
    const q = queues.get(qid)!;
    q.maxCustomers = max;
    return HttpResponse.json({ queueId: qid, maxCustomers: max }, { status: 200 });
  }),

  // Owner: update queue name (body is a JSON string in your client)
  http.put("https://localhost:7014/api/owners/update-name/:qid", async ({ request, params }) => {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer jwt-")) {
      return HttpResponse.json({ title: "Unauthorized" }, { status: 401 });
    }
    const qid = Number(params.qid);
    const name = await request.json(); // your client sends JSON.stringify(input.name)
    if (typeof name !== "string" || name.trim() === "") {
      return HttpResponse.text("Name required", { status: 400 });
    }
    if (name === "Dup") {
      return HttpResponse.text("Name taken", { status: 409 });
    }
    ensureQueue(qid);
    const q = queues.get(qid)!;
    q.name = name;
    // Simulate 204 (no content) success
    return new HttpResponse(null, { status: 204 });
  }),

  // Cancel registration (requires X-Cancel-Token), returns 204
  http.delete("https://localhost:7014/api/queuecustomers/cancel/:qid/:cid", async ({ request, params }) => {
    const token = request.headers.get("x-cancel-token");
    if (!token) return HttpResponse.text("Missing token", { status: 400 });
    const qid = Number(params.qid);
    const cid = Number(params.cid);
    ensureQueue(qid);
    const list = customersByQueue.get(qid)!;
    const idx = list.findIndex(c => c.id === cid);
    if (idx === -1) return HttpResponse.text("Not Found", { status: 404 });
    list.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];

export const server = setupServer(...handlers);
