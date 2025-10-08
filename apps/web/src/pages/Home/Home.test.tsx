/// <reference types="vitest" />
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Home from "../Home";
// Import the same module the component uses and spy on it
import * as handlers from "../../features/queue/handlers";

vi.spyOn(handlers as any, "handleCreate").mockResolvedValue({ id: 123 } as any);

test("renders CTA and submits create queue", async () => {
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );

  expect(screen.getByText(/Create a queue now!/i)).toBeInTheDocument();

  await userEvent.click(screen.getByText(/Create a queue now!/i));

  const inputs = screen.getAllByRole("textbox");
  await userEvent.type(inputs[0], "My Queue");
  if (inputs.length > 1) {
    await userEvent.type(inputs[1], "1234");
  }

  const createBtn = screen.getByRole("button", { name: /^Create$/i });
  await userEvent.click(createBtn);

  await waitFor(() => {
    expect((handlers as any).handleCreate).toHaveBeenCalled();
  });
});


