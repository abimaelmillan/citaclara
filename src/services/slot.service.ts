import { DateTime } from 'luxon';
import type { Types } from 'mongoose';
import { Appointment } from '../models/appointment.model.js';
import { Availability } from '../models/availability.model.js';
import { AppError } from '../utils/app-error.js';

interface SlotOwner {
  _id: Types.ObjectId;
  timezone: string;
}

export interface Slot {
  start: DateTime;
  end: DateTime;
}

function atTime(day: DateTime, time: string): DateTime {
  const [hour, minute] = time.split(':').map(Number);
  return day.set({ hour, minute, second: 0, millisecond: 0 });
}

// Calcula los horarios libres de un día: divide cada bloque de disponibilidad
// en intervalos del tamaño de la consulta y descarta los pasados y los ocupados.
export async function computeSlots(
  professional: SlotOwner,
  durationMinutes: number,
  day: DateTime,
  excludeAppointmentId?: string
): Promise<Slot[]> {
  const dayStart = day.setZone(professional.timezone).startOf('day');
  const dayEnd = dayStart.plus({ days: 1 });

  const [blocks, appointments] = await Promise.all([
    Availability.find({ professional: professional._id, dayOfWeek: dayStart.weekday }).sort({ startTime: 1 }),
    Appointment.find({
      professional: professional._id,
      status: 'scheduled',
      startAt: { $lt: dayEnd.toJSDate() },
      endAt: { $gt: dayStart.toJSDate() },
      ...(excludeAppointmentId ? { _id: { $ne: excludeAppointmentId } } : {})
    }).select('startAt endAt')
  ]);

  const now = Date.now();
  const slots: Slot[] = [];
  for (const block of blocks) {
    const blockEnd = atTime(dayStart, block.endTime).toMillis();
    let start = atTime(dayStart, block.startTime);
    while (start.plus({ minutes: durationMinutes }).toMillis() <= blockEnd) {
      const end = start.plus({ minutes: durationMinutes });
      const taken = appointments.some(
        (appointment) => appointment.startAt.getTime() < end.toMillis() && appointment.endAt.getTime() > start.toMillis()
      );
      if (start.toMillis() > now && !taken) slots.push({ start, end });
      start = end;
    }
  }
  return slots;
}

export async function assertSlotIsBookable(
  professional: SlotOwner,
  durationMinutes: number,
  startAt: DateTime,
  excludeAppointmentId?: string
): Promise<void> {
  const slots = await computeSlots(professional, durationMinutes, startAt, excludeAppointmentId);
  if (!slots.some((slot) => slot.start.toMillis() === startAt.toMillis())) {
    throw new AppError(409, 'SLOT_UNAVAILABLE', 'El horario seleccionado no está disponible');
  }
}

export function serializeSlot(slot: Slot) {
  return { startAt: slot.start.toISO(), endAt: slot.end.toISO(), time: slot.start.toFormat('HH:mm') };
}
