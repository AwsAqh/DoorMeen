import { z } from 'zod';

export const ManageSchema = z.object({
  QueueId:  z.string().trim().min(1, 'Queue ID is required'),
  password: z.string().trim().regex(/^\d{4,6}$/, 'PIN must be 4–6 digits'),
});

export type ManageData = z.infer<typeof ManageSchema>;
