import { z } from "zod";

export const JoinSchema = z.object({
  QueueId: z.coerce.number().int().positive(), 
  Name:  z.string().trim().min(1, "Name is required").max(60),
  PhoneNumber: z.string().trim().regex(/^\d{4,6}$/, "Phone must be 4-6 digits"),
});

export type JoinData = z.infer<typeof JoinSchema>;
