import { z } from 'zod';

export const createAppointmentTypeSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).optional(),
  durationMinutes: z.number().int().min(10).max(480),
  price: z.number().min(0).optional(),
  preparationNotes: z.string().trim().max(500).optional(),
  active: z.boolean().optional()
});

export const updateAppointmentTypeSchema = createAppointmentTypeSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, 'Envía al menos un campo para actualizar');
