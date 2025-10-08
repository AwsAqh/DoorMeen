/// <reference types="vitest" />
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import QueuePage from "./QueuePage";
import { server } from "@/test/server";
import { http, HttpResponse } from "msw";

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/queue/:id" element={<QueuePage mode="public" />} />
      </Routes>
    </MemoryRouter>
  );
}

test("renders queue details from API", async () => {
  server.use(
    http.get("/api/queues/q/:id", ({ params }) => {
      return HttpResponse.json({
        Id: Number(params.id),
        Name: "Q Demo",
        CreatedAt: new Date().toISOString(),
        Waiters: []
      });
    })
  );

  renderAt("/queue/1");

  await waitFor(() => {
    expect(screen.getByText(/Q Demo/i)).toBeInTheDocument();
  });

  // No customers -> shows empty state CTA
  expect(screen.getByRole("button", { name: /join/i })).toBeInTheDocument();
});

test("shows not found UI when API returns 404", async () => {
  server.use(
    http.get("/api/queues/q/:id", () => HttpResponse.json({}, { status: 404 }))
  );

  renderAt("/queue/404");

  await waitFor(() => {
    expect(screen.getByText(/No queue found/i)).toBeInTheDocument();
  });
});


