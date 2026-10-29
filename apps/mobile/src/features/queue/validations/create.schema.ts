import { z } from 'zod';

export const CreateSchema = z.object({
  name:     z.string().trim().min(1, 'Queue name is required').max(80),
  password: z.string().min(4, 'Password must be at least 4 characters'),
  email:    z.string().trim().email('Enter a valid email address').max(120),
});

export type CreateData = z.infer<typeof CreateSchema>;
