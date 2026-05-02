import { z } from "zod";

export const JoinSchema = z.object({
  QueueId: z.string().trim().min(1, "Queue ID is required"),
  Name: z.string().trim().min(1, "Name is required").max(60),
  PhoneNumber: z.string().trim().regex(/^\d{10,10}$/, "Phone must be 10 digits"),
  Email: z.string().trim().email("Invalid email address"),
});

export type JoinData = z.infer<typeof JoinSchema>;
