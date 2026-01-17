
import { z } from 'zod';

export const SignupSchema = z.object({
  email: z.email(),
  name: z.string(),
  password: z.string().min(8),
});

export type SignupDto = z.infer<typeof SignupSchema>;
