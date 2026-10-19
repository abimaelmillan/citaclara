import { Availability } from '../models/availability.model.js';
import { AppError } from '../utils/app-error.js';

interface AvailabilityInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

function notFound(): AppError {
  return new AppError(404, 'AVAILABILITY_NOT_FOUND', 'El horario no existe');
}

// Los horarios HH:MM se comparan como texto porque tienen ancho fijo.
async function assertNoOverlap(professionalId: string, input: AvailabilityInput, excludeId?: string) {
  const overlapping = await Availability.exists({
    professional: professionalId,
    dayOfWeek: input.dayOfWeek,
    startTime: { $lt: input.endTime },
    endTime: { $gt: input.startTime },
    ...(excludeId ? { _id: { $ne: excludeId } } : {})
  });
  if (overlapping) {
    throw new AppError(409, 'AVAILABILITY_OVERLAP', 'El horario se empalma con otro bloque del mismo día');
  }
}

export function listAvailability(professionalId: string) {
  return Availability.find({ professional: professionalId }).sort({ dayOfWeek: 1, startTime: 1 });
}

export async function getAvailability(professionalId: string, id: string) {
  const availability = await Availability.findOne({ _id: id, professional: professionalId });
  if (!availability) throw notFound();
  return availability;
}

export async function createAvailability(professionalId: string, input: AvailabilityInput) {
  await assertNoOverlap(professionalId, input);
  return Availability.create({ ...input, professional: professionalId });
}

export async function updateAvailability(professionalId: string, id: string, input: Partial<AvailabilityInput>) {
  const availability = await getAvailability(professionalId, id);
  const merged = {
    dayOfWeek: input.dayOfWeek ?? availability.dayOfWeek,
    startTime: input.startTime ?? availability.startTime,
    endTime: input.endTime ?? availability.endTime
  };
  if (merged.startTime >= merged.endTime) {
    throw new AppError(400, 'VALIDATION_ERROR', 'La hora de inicio debe ser menor a la hora de fin');
  }
  await assertNoOverlap(professionalId, merged, id);
  availability.set(merged);
  return availability.save();
}

export async function deleteAvailability(professionalId: string, id: string): Promise<void> {
  const availability = await getAvailability(professionalId, id);
  await availability.deleteOne();
}
