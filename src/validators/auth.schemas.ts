import { IANAZone } from 'luxon';
import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z.string().min(8).max(72),
  specialty: z.string().trim().max(80).optional(),
  timezone: z.string().refine((zone) => IANAZone.isValidZone(zone), 'Zona horaria inválida').optional()
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});
