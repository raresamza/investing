import { z } from 'zod';

export const CreateInvestmentSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  shares: z.number().positive(),
  avgCost: z.number().positive(),
  color: z.string().optional(),
});

export type CreateInvestmentDto = z.infer<typeof CreateInvestmentSchema>;

export const UpdateInvestmentSchema = z.object({
  symbol: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  shares: z.number().positive().optional(),
  avgCost: z.number().positive().optional(),
  color: z.string().optional(),
});

export type UpdateInvestmentDto = z.infer<typeof UpdateInvestmentSchema>;
