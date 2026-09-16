import { z } from 'zod';

export const CreatePortfolioSchema = z.object({
  currency: z.string().default('USD'),
});

export type CreatePortfolioDto = z.infer<typeof CreatePortfolioSchema>;
