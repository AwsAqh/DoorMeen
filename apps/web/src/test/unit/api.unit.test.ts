// apps/web/src/test/unit/api.unit.test.ts
import {
  describe,
  test,
  expect,
  vi,
  beforeEach,
  afterEach,
  afterAll,
} from "vitest";
import type { Mock } from "vitest";
import {
  apiCreateQueue,
  apiJoinQueue,
  apiManageQueue,
  apiCancelRegister,
  apiGetCustomers,
  apiGetOwnerCustomers,
  apiUpdateUserStatus,
  apiServeCustomer,
  apiUpdateMaxCustomers,
  apiUpdateQueueName,
  apiVerifyEmail,
  apiResendVerificationEmail,
} from "../../features/queue/services/api";

/* ---------- helpers ---------- */

type MockHeaders = { get: (k: string) => string | null };
type MockResponse<T = unknown> = {
  ok: boolean;
  status: number;
  headers: MockHeaders;
  json: () => Promise<T>;
  text: () => Promise<string>;
};

function makeResponse<T = unknown>(opts: {
  status?: number;
  ok?: boolean;
  body?: T | string | null;
  contentType?: string | null;
  contentLength?: string | null;
}): MockResponse<T> {
  const {
    status = 200,
    ok = status >= 200 && status < 300,
    body = null,
    contentType = typeof body === "string" ? "text/plain" : "application/json",
    contentLength = body == null ? "0" : undefined,
  } = opts;

  const map = new Map<string, string>();
  if (contentType) map.set("content-type", contentType);
  if (contentLength) map.set("content-length", contentLength);

  return {
    ok,
    status,
    headers: { get: (k: string) => map.get(k.toLowerCase()) ?? null },
    json: async () => body as T,
    text: async () =>
      typeof body === "string" ? body : body == null ? "" : JSON.stringify(body),
  };
}

const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = vi.fn() as unknown as typeof fetch;
});
afterEach(() => {
  vi.resetAllMocks();
});
afterAll(() => {
  global.fetch = originalFetch;
});

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<unknown>;
type FetchMock = Mock<FetchFn>;
const asFetchMock = () => global.fetch as unknown as FetchMock;

type FetchCall = [RequestInfo | URL, RequestInit?];


/** Assert last fetch call path matches a regex (host-agnostic) and optionally match init */
function expectLastFetchMatch(pathRe: RegExp, initMatcher?: Partial<RequestInit>) {
  const calls = asFetchMock().mock.calls as unknown as FetchCall[];
  expect(calls.length).toBeGreaterThan(0);

  const [url, init] = calls[calls.length - 1];
  const u = new URL(String(url), "http://dummy");
  const actual = u.pathname + (u.search || "");

  expect(actual).toMatch(pathRe);
  if (initMatcher) expect(init ?? {}).toEqual(expect.objectContaining(initMatcher));
}

/** Accept one of several candidate paths (strings or regex) */
function expectLastFetchOneOf(paths: Array<RegExp | string>, initMatcher?: Partial<RequestInit>) {
  const calls = asFetchMock().mock.calls as unknown as FetchCall[];
  expect(calls.length).toBeGreaterThan(0);

  const [url, init] = calls[calls.length - 1];
  const u = new URL(String(url), "http://dummy");
  const actual = u.pathname + (u.search || "");

  const matched = paths.some((p) => (typeof p === "string" ? actual === p : p.test(actual)));
  if (!matched) {
    throw new Error(
      `expectLastFetchOneOf: "${actual}" did not match any of:\n` +
      paths.map((p) => `  - ${p.toString()}`).join("\n")
    );
  }

  if (initMatcher) expect(init ?? {}).toEqual(expect.objectContaining(initMatcher));
}

/* ---------- tests ---------- */

describe("API layer (Vitest)", () => {
  test("apiCreateQueue: success 200", async () => {
    const mockBody = { id: 1, name: "Dermn", maxCustomers: 10 };
    asFetchMock().mockResolvedValueOnce(makeResponse({ status: 200, body: mockBody }));
    const data = await apiCreateQueue({ name: "Dermn", password: "1234" });
    expect(data).toEqual(mockBody);
    expectLastFetchMatch(/^\/api\/queues$/, { method: "POST" });
  });

  test("apiCreateQueue: throws on non-OK", async () => {
    asFetchMock().mockResolvedValueOnce(makeResponse({ status: 400, ok: false, body: "Bad Request" }));
    await expect(apiCreateQueue({ name: "x", password: "y" })).rejects.toThrow("failed to create a queue");
  });

  test("apiJoinQueue: success", async () => {
    const body = { id: 11, queueId: 2, name: "Ali" };
    asFetchMock().mockResolvedValueOnce(makeResponse({ status: 201, body }));
    const res = await apiJoinQueue({ QueueId: 2, Name: "Ali", PhoneNumber: "0599", Email: "test@test.com" });
    expect(res).toEqual(body);
    expectLastFetchMatch(/^\/api\/queuecustomers\/joinQueue$/, {
      method: "POST",
      headers: expect.objectContaining({ "Content-type": "application/json" }),
    });
  });

  test("apiVerifyEmail: success", async () => {
    asFetchMock().mockResolvedValueOnce(makeResponse({ status: 200 }));
    const res = await apiVerifyEmail({ CustomerId: 1, Email: "a@a.com", Digits: 1234 });
    expect(res).toBe(true);
    expectLastFetchMatch(/^\/api\/queuecustomers\/verifyEmail$/, {
      method: "POST",
      body: JSON.stringify({ CustomerId: 1, Email: "a@a.com", Digits: 1234 }),
    });
  });

  test("apiResendVerificationEmail: success", async () => {
    asFetchMock().mockResolvedValueOnce(makeResponse({ status: 200 }));
    const res = await apiResendVerificationEmail({ CustomerId: 1 });
    expect(res).toBe(true);
    expectLastFetchMatch(/^\/api\/queuecustomers\/sendVerificationEmail$/, {
      method: "POST",
      body: JSON.stringify({ CustomerId: 1 }),
    });
  });

  test("apiJoinQueue: throws with response body on non-OK", async () => {
    asFetchMock().mockResolvedValueOnce(makeResponse({ status: 409, ok: false, body: { detail: "Already joined" } }));
    await expect(apiJoinQueue({ QueueId: 2, Name: "Ali", PhoneNumber: "0599", Email: "test@test.com" })).rejects.toBeInstanceOf(Error);
  });

  test("apiManageQueue: success", async () => {
    const body = { token: "jwt-123" };
    asFetchMock().mockResolvedValueOnce(makeResponse({ status: 200, body }));
    const res = await apiManageQueue({ QueueId: 1, password: "abcd" });
    expect(res).toEqual(body);
    expectLastFetchOneOf([/^\/api\/queues\/manage$/, /^\/api\/owners\/verify-password$/], {
      method: "POST",
    });
  });

  test("apiManageQueue: throws 'Invalid Password'", async () => {
    asFetchMock().mockResolvedValueOnce(makeResponse({ status: 401, ok: false, body: "Invalid" }));
    await expect(apiManageQueue({ QueueId: 1, password: "bad" })).rejects.toThrow("Invalid Password");
  });

  test("apiCancelRegister: returns true on 204", async () => {
    asFetchMock().mockResolvedValueOnce(makeResponse({ status: 204, body: null, contentType: null }));
    const ok = await apiCancelRegister({ queueId: 3, customerId: 9, token: "t" });
    expect(ok).toBe(true);
    expectLastFetchOneOf([/^\/api\/queuecustomers\/cancel\/3\/9$/, /^\/api\/queuecustomers\/\d+\/cancel$/], {
      method: "DELETE",
    });
  });

  test("apiCancelRegister: throws on non-OK", async () => {
    asFetchMock().mockResolvedValueOnce(makeResponse({ status: 404, ok: false, body: "Not Found" }));
    await expect(
      apiCancelRegister({ queueId: 99, customerId: 9, token: "t" })
    ).rejects.toThrow("Failed to cancel registration");
  });

  test("apiGetCustomers: returns JSON body on 200", async () => {
    const body = [{ id: 1 }, { id: 2 }];
    asFetchMock().mockResolvedValueOnce(makeResponse({ status: 200, body }));
    const res = await apiGetCustomers({ QueueId: 7 });
    expect(res).toEqual(body);
    expectLastFetchOneOf([/^\/api\/queues\/q\/7$/, /^\/api\/queues\/7\/customers$/], { method: "GET" });
  });

  test("apiGetCustomers: returns true on 204", async () => {
    asFetchMock().mockResolvedValueOnce(
      makeResponse({ status: 204, body: null, contentType: null, contentLength: "0" })
    );
    const res = await apiGetCustomers({ QueueId: 7 });
    expect(res).toBe(true);
    expectLastFetchOneOf([/^\/api\/queues\/q\/7$/, /^\/api\/queues\/7\/customers$/], { method: "GET" });
  });

  test("apiGetCustomers: throws text message when non-OK + text", async () => {
    asFetchMock().mockResolvedValueOnce(makeResponse({ status: 400, ok: false, body: "Bad request: invalid id" }));
    await expect(apiGetCustomers({ QueueId: -1 })).rejects.toThrow("Bad request: invalid id");
  });

  test("apiGetCustomers: throws details when non-OK + JSON", async () => {
    asFetchMock().mockResolvedValueOnce(makeResponse({ status: 409, ok: false, body: { detail: "Conflict" } }));
    await expect(apiGetCustomers({ QueueId: 1 })).rejects.toThrow("Conflict");
  });

  test("apiGetOwnerCustomers: success", async () => {
    const body = [{ id: 1, state: "waiting" }];
    asFetchMock().mockResolvedValueOnce(makeResponse({ status: 200, body }));
    const res = await apiGetOwnerCustomers({ QueueId: 1, token: "jwt" });
    expect(res).toEqual(body);
    expectLastFetchOneOf(
      [/^\/api\/owners\/q\/1$/, /^\/api\/owners\/q\/1\/customers$/, /^\/api\/owners\/1\/customers$/],
      { method: "GET" }
    );
  });

  test("apiGetOwnerCustomers: throws on non-OK", async () => {
    asFetchMock().mockResolvedValueOnce(makeResponse({ status: 401, ok: false, body: { title: "Unauthorized" } }));
    await expect(apiGetOwnerCustomers({ QueueId: 1, token: "bad" })).rejects.toBeInstanceOf(Error);
  });

  test("apiUpdateUserStatus: returns body on success", async () => {
    const body = { id: 8, state: "in_progress" };
    asFetchMock().mockResolvedValueOnce(makeResponse({ status: 200, body }));
    const res = await apiUpdateUserStatus({ QueueId: 1, CustomerId: 8, token: "t" });
    expect(res).toEqual(body);
    expectLastFetchOneOf(
      [/^\/api\/owners\/1\/customers\/8\/status$/, /^\/api\/owners\/set-in-progress\/1\/8$/],
      { method: "PUT" }
    );
  });

  test("apiUpdateUserStatus: returns true on 204", async () => {
    asFetchMock().mockResolvedValueOnce(
      makeResponse({ status: 204, body: null, contentType: null, contentLength: "0" })
    );
    const res = await apiUpdateUserStatus({ QueueId: 1, CustomerId: 8, token: "t" });
    expect(res).toBe(true);
    expectLastFetchOneOf(
      [/^\/api\/owners\/1\/customers\/8\/status$/, /^\/api\/owners\/set-in-progress\/1\/8$/],
      { method: "PUT" }
    );
  });

  test("apiUpdateUserStatus: throws best-effort message on non-OK JSON", async () => {
    asFetchMock().mockResolvedValueOnce(makeResponse({ status: 400, ok: false, body: { message: "Invalid state" } }));
    await expect(apiUpdateUserStatus({ QueueId: 1, CustomerId: 8, token: "t" })).rejects.toThrow("Invalid state");
  });

  test("apiServeCustomer: returns true on 204", async () => {
    asFetchMock().mockResolvedValueOnce(
      makeResponse({ status: 204, body: null, contentType: null, contentLength: "0" })
    );
    const res = await apiServeCustomer({ QueueId: 1, CustomerId: 2, token: "t" });
    expect(res).toBe(true);
    expectLastFetchOneOf([/^\/api\/owners\/1\/customers\/2\/serve$/, /^\/api\/owners\/serve\/1\/2$/], {
      method: "DELETE",
    });
  });

  test("apiServeCustomer: throws mapped message on non-OK text", async () => {
    asFetchMock().mockResolvedValueOnce(makeResponse({ status: 404, ok: false, body: "Not found" }));
    await expect(apiServeCustomer({ QueueId: 1, CustomerId: 999, token: "t" })).rejects.toThrow("Not found");
  });

  test("apiUpdateMaxCustomers: returns body on 200", async () => {
    const body = { queueId: 1, maxCustomers: 20 };
    asFetchMock().mockResolvedValueOnce(makeResponse({ status: 200, body }));
    const res = await apiUpdateMaxCustomers({ QueueId: 1, Max: 20, token: "t" });
    expect(res).toEqual(body);
    expectLastFetchOneOf(
      [/^\/api\/queues\/1\/max-customers$/, /^\/api\/owners\/set-max-customers\/1\/\d+$/],
      { method: "PUT" }
    );
  });

  test("apiUpdateMaxCustomers: returns true on 204", async () => {
    asFetchMock().mockResolvedValueOnce(
      makeResponse({ status: 204, body: null, contentType: null, contentLength: "0" })
    );
    const res = await apiUpdateMaxCustomers({ QueueId: 1, Max: 30, token: "t" });
    expect(res).toBe(true);
    expectLastFetchOneOf(
      [/^\/api\/queues\/1\/max-customers$/, /^\/api\/owners\/set-max-customers\/1\/\d+$/],
      { method: "PUT" }
    );
  });

  test("apiUpdateMaxCustomers: throws mapped message on non-OK JSON", async () => {
    asFetchMock().mockResolvedValueOnce(makeResponse({ status: 400, ok: false, body: { title: "Bad value" } }));
    await expect(apiUpdateMaxCustomers({ QueueId: 1, Max: -1, token: "t" })).rejects.toThrow("Bad value");
  });

  test("apiUpdateQueueName: returns true on 204", async () => {
    asFetchMock().mockResolvedValueOnce(
      makeResponse({ status: 204, body: null, contentType: null, contentLength: "0" })
    );
    const res = await apiUpdateQueueName({ QueueId: 1, name: "New", token: "t" });
    expect(res).toBe(true);
    expectLastFetchOneOf([/^\/api\/queues\/1\/name$/, /^\/api\/owners\/update-name\/1$/], { method: "PUT" });
  });

  test("apiUpdateQueueName: throws mapped message on non-OK text", async () => {
    asFetchMock().mockResolvedValueOnce(makeResponse({ status: 409, ok: false, body: "Name taken" }));
    await expect(apiUpdateQueueName({ QueueId: 1, name: "Dup", token: "t" })).rejects.toThrow("Name taken");
  });
});
