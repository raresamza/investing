import { z } from 'zod';

export const CreateTransactionSchema = z.object({
  investmentId: z.string().uuid(),
  type: z.enum(['BUY', 'SELL']),
  quantity: z.number().positive(),
  pricePerShare: z.number().positive(),
  transactionDate: z.string().datetime().optional(),
});

export type CreateTransactionDto = z.infer<typeof CreateTransactionSchema>;
