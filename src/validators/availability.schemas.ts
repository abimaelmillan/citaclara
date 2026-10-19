import { z } from 'zod';
import { time } from './common.schemas.js';

const availabilityFields = z.object({
  dayOfWeek: z.number().int().min(1).max(7),
  startTime: time,
  endTime: time
});

export const createAvailabilitySchema = availabilityFields.refine(
  (input) => input.startTime < input.endTime,
  { message: 'La hora de inicio debe ser menor a la hora de fin', path: ['endTime'] }
);

// La regla inicio < fin se valida en el servicio, combinando con el registro existente.
export const updateAvailabilitySchema = availabilityFields
  .partial()
  .refine((input) => Object.keys(input).length > 0, 'Envía al menos un campo para actualizar');
