import { DateTime } from 'luxon';
import type { PopulateOptions } from 'mongoose';
import { Appointment, type AppointmentStatus } from '../models/appointment.model.js';
import { AppError } from '../utils/app-error.js';
import { getProfile } from './auth.service.js';

interface ListFilters {
  from?: string;
  to?: string;
  status?: AppointmentStatus;
}

const professionalPopulate: PopulateOptions[] = [
  { path: 'appointmentType', select: 'name durationMinutes price' },
  { path: 'patient', select: 'name email phone' }
];

// Las fechas from/to se interpretan en la zona horaria del profesional.
export async function listAppointments(professionalId: string, filters: ListFilters) {
  const professional = await getProfile(professionalId);
  const startAt: { $gte?: Date; $lt?: Date } = {};
  if (filters.from) {
    startAt.$gte = DateTime.fromISO(filters.from, { zone: professional.timezone }).startOf('day').toJSDate();
  }
  if (filters.to) {
    startAt.$lt = DateTime.fromISO(filters.to, { zone: professional.timezone }).plus({ days: 1 }).startOf('day').toJSDate();
  }

  return Appointment.find({
    professional: professionalId,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.from || filters.to ? { startAt } : {})
  })
    .sort({ startAt: 1 })
    .populate(professionalPopulate);
}

export async function getAppointment(professionalId: string, id: string) {
  const appointment = await Appointment.findOne({ _id: id, professional: professionalId }).populate(professionalPopulate);
  if (!appointment) throw new AppError(404, 'APPOINTMENT_NOT_FOUND', 'La cita no existe');
  return appointment;
}

// Solo una cita programada puede cerrarse. "Atendida" e "inasistencia"
// únicamente tienen sentido cuando la hora de la cita ya llegó.
export async function updateAppointmentStatus(
  professionalId: string,
  id: string,
  status: 'completed' | 'no_show' | 'cancelled'
) {
  const appointment = await getAppointment(professionalId, id);
  if (appointment.status !== 'scheduled') {
    throw new AppError(409, 'INVALID_STATUS_TRANSITION', 'Solo se puede cambiar el estado de una cita programada');
  }
  if (status !== 'cancelled' && appointment.startAt.getTime() > Date.now()) {
    throw new AppError(409, 'APPOINTMENT_NOT_STARTED', 'La cita aún no ocurre');
  }
  appointment.set({ status, ...(status === 'cancelled' ? { cancelledBy: 'professional' } : {}) });
  return appointment.save();
}
