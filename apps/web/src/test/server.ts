import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";


function hasProp<K extends PropertyKey>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return typeof obj === "object" && obj !== null && key in obj;
}

export const server = setupServer(

  http.post("*/api/queues", async ({ request }) => {
    const body = (await request.json()) as unknown;

    if (!hasProp(body, "name") || typeof body.name !== "string" || !body.name.trim()) {
      return HttpResponse.json({ error: "Name required" }, { status: 400 });
    }

    // return a created queue (id is arbitrary for tests)
    return HttpResponse.json({ id: 1 }, { status: 201 });
  }),

  
  http.get("*/api/queues/q/:id", ({ params }) => {
    const id = Number(params.id);
    if (id === 404) {
      return HttpResponse.json({ title: "Not found" }, { status: 404 });
    }
    return HttpResponse.json({
      Id: id,
      Name: "Q Demo",
      CreatedAt: new Date().toISOString(),
      Waiters: [],
    });
  })
);
