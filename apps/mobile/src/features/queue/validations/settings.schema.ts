import { z } from "zod";

export const SettingsSchema = z.object({
  name:      z.string().trim().min(1, "Queue name is required").max(80),
  message:   z.string().max(200).optional(),
  avgTime:   z.string().regex(/^\d+$/, "Must be a number").transform(Number).pipe(z.number().int().min(1).max(480)).optional().or(z.literal("")),
  maxCust:   z.string().regex(/^\d+$/, "Must be a number").transform(Number).pipe(z.number().int().min(0).max(1000)).optional().or(z.literal("")),
  closingTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)").optional().or(z.literal("")),
});

export type SettingsData = z.infer<typeof SettingsSchema>;
