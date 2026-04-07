import { z } from 'zod';
export declare const SignupSchema: z.ZodObject<{
    email: z.ZodString;
    name: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export type SignupDto = z.infer<typeof SignupSchema>;
