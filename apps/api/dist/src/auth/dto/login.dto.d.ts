import { z } from "zod";
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export type LoginDto = z.infer<typeof LoginSchema>;
