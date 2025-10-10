/// <reference types="vitest" />
import "@testing-library/jest-dom";
import { server } from "./server";
import "whatwg-fetch";
if (!import.meta.env.VITE_API_BASE_URL) {
    import.meta.env.VITE_API_BASE_URL = 'http://localhost:7014';
  }
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());


