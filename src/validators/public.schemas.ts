import { z } from 'zod';
import { isoDate, objectId } from './common.schemas.js';

export const slugParams = z.object({ slug: z.string().min(1).max(80) });
export const tokenParams = z.object({ token: z.string().min(20).max(100) });

export const slotsQuerySchema = z.object({
  appointmentTypeId: objectId,
  date: isoDate
});

const startAt = z.string().datetime({ offset: true });

export const bookAppointmentSchema = z.object({
  appointmentTypeId: objectId,
  startAt,
  patient: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email(),
    phone: z.string().trim().min(7).max(20)
  }),
  notes: z.string().trim().max(500).optional()
});

export const rescheduleSchema = z.object({ startAt });
