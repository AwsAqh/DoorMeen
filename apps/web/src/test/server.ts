import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

export const server = setupServer(
  http.post("/api/queues", async ({ request }) => {
    const body = await request.json();
    if (!(body as any)?.Name) {
      return HttpResponse.json({ error: "Name required" }, { status: 400 });
    }
    return HttpResponse.json({ id: 1 }, { status: 201 });
  }),
  http.get("/api/queues/q/:id", ({ params }) => {
    const id = Number(params.id);
    if (id === 404) return HttpResponse.json({}, { status: 404 });
    return HttpResponse.json({
      Id: id,
      Name: "Q Demo",
      CreatedAt: new Date().toISOString(),
      Waiters: []
    });
  })
);


