import { z } from "zod";

export const JoinSchema = z.object({
  QueueId: z.string().trim().min(1, "Queue ID is required"),
  Name: z.string().trim().min(1, "Name is required").max(60),
  PhoneNumber: z.string().trim().regex(/^(059|056)\d{7}$/, "Phone must be 10 digits starting with 059 or 056"),
  Email: z.string().trim().email("Invalid email address").optional().or(z.literal("")),
});

export type JoinData = z.infer<typeof JoinSchema>;
