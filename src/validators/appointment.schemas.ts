import { z } from 'zod';
import { appointmentStatuses } from '../models/appointment.model.js';
import { isoDate } from './common.schemas.js';

export const listAppointmentsQuerySchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  status: z.enum(appointmentStatuses).optional()
});

// El profesional puede cerrar una cita programada con alguno de estos estados.
export const updateStatusSchema = z.object({
  status: z.enum(['completed', 'no_show', 'cancelled'])
});
