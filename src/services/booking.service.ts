import { DateTime } from 'luxon';
import type { PopulateOptions } from 'mongoose';
import { env } from '../config/env.js';
import { Appointment } from '../models/appointment.model.js';
import { AppointmentType } from '../models/appointment-type.model.js';
import { Patient } from '../models/patient.model.js';
import { User } from '../models/user.model.js';
import { AppError } from '../utils/app-error.js';
import { createManageToken, hashManageToken } from '../utils/manage-token.js';
import { assertSlotIsBookable, computeSlots, serializeSlot } from './slot.service.js';

interface BookingInput {
  appointmentTypeId: string;
  startAt: string;
  patient: { name: string; email: string; phone: string };
  notes?: string;
}

// Datos que el paciente puede ver de su cita (nunca el correo del profesional).
const publicPopulate: PopulateOptions[] = [
  { path: 'professional', select: 'name specialty slug timezone' },
  { path: 'appointmentType', select: 'name durationMinutes price preparationNotes' },
  { path: 'patient', select: 'name email phone' }
];

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

async function findProfessionalBySlug(slug: string) {
  const professional = await User.findOne({ slug });
  if (!professional) throw new AppError(404, 'PROFESSIONAL_NOT_FOUND', 'El profesional no existe');
  return professional;
}

async function findActiveAppointmentType(professionalId: unknown, appointmentTypeId: string) {
  const appointmentType = await AppointmentType.findOne({ _id: appointmentTypeId, professional: professionalId, active: true });
  if (!appointmentType) throw new AppError(404, 'APPOINTMENT_TYPE_NOT_FOUND', 'El tipo de consulta no existe');
  return appointmentType;
}

async function findByToken(token: string) {
  const appointment = await Appointment.findOne({ manageTokenHash: hashManageToken(token) });
  if (!appointment) throw new AppError(404, 'APPOINTMENT_NOT_FOUND', 'La cita no existe');
  return appointment;
}

function assertCanBeChanged(appointment: { status: string; startAt: Date }): void {
  if (appointment.status !== 'scheduled') {
    throw new AppError(409, 'APPOINTMENT_NOT_ACTIVE', 'La cita ya no está activa');
  }
  if (appointment.startAt.getTime() <= Date.now()) {
    throw new AppError(409, 'APPOINTMENT_ALREADY_STARTED', 'La cita ya pasó y no puede modificarse');
  }
}

export async function getPublicProfile(slug: string) {
  const professional = await findProfessionalBySlug(slug);
  const appointmentTypes = await AppointmentType.find({ professional: professional._id, active: true }).sort({ name: 1 });
  return {
    name: professional.name,
    specialty: professional.specialty,
    slug: professional.slug,
    timezone: professional.timezone,
    appointmentTypes
  };
}

export async function getAvailableSlots(slug: string, appointmentTypeId: string, date: string) {
  const professional = await findProfessionalBySlug(slug);
  const appointmentType = await findActiveAppointmentType(professional._id, appointmentTypeId);
  const day = DateTime.fromISO(date, { zone: professional.timezone });
  if (!day.isValid) throw new AppError(400, 'INVALID_DATE', 'La fecha no es válida');

  const slots = await computeSlots(professional, appointmentType.durationMinutes, day);
  return {
    date,
    timezone: professional.timezone,
    appointmentType: { id: appointmentType.id, name: appointmentType.name, durationMinutes: appointmentType.durationMinutes },
    slots: slots.map(serializeSlot)
  };
}

export async function bookAppointment(slug: string, input: BookingInput) {
  const professional = await findProfessionalBySlug(slug);
  const appointmentType = await findActiveAppointmentType(professional._id, input.appointmentTypeId);
  const start = DateTime.fromISO(input.startAt).setZone(professional.timezone);
  await assertSlotIsBookable(professional, appointmentType.durationMinutes, start);

  const patient = await Patient.findOneAndUpdate(
    { professional: professional._id, email: input.patient.email.toLowerCase() },
    { name: input.patient.name, phone: input.patient.phone },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  const { token, hash } = createManageToken();
  try {
    const appointment = await Appointment.create({
      professional: professional._id,
      appointmentType: appointmentType._id,
      patient: patient._id,
      startAt: start.toJSDate(),
      endAt: start.plus({ minutes: appointmentType.durationMinutes }).toJSDate(),
      notes: input.notes ?? '',
      manageTokenHash: hash
    });
    await appointment.populate(publicPopulate);
    return { appointment, manageToken: token, manageUrl: `${env.appUrl}/cita/${token}` };
  } catch (error) {
    // Otro paciente ganó el mismo horario entre la validación y el guardado.
    if (isDuplicateKeyError(error)) {
      throw new AppError(409, 'SLOT_UNAVAILABLE', 'El horario seleccionado no está disponible');
    }
    throw error;
  }
}

export async function getAppointmentByToken(token: string) {
  const appointment = await findByToken(token);
  return appointment.populate(publicPopulate);
}

export async function cancelByToken(token: string) {
  const appointment = await findByToken(token);
  assertCanBeChanged(appointment);
  appointment.set({ status: 'cancelled', cancelledBy: 'patient' });
  await appointment.save();
  return appointment.populate(publicPopulate);
}

export async function rescheduleByToken(token: string, startAt: string) {
  const appointment = await findByToken(token);
  assertCanBeChanged(appointment);

  const [professional, appointmentType] = await Promise.all([
    User.findById(appointment.professional),
    AppointmentType.findById(appointment.appointmentType)
  ]);
  if (!professional || !appointmentType) throw new AppError(404, 'APPOINTMENT_NOT_FOUND', 'La cita no existe');

  const start = DateTime.fromISO(startAt).setZone(professional.timezone);
  await assertSlotIsBookable(professional, appointmentType.durationMinutes, start, appointment.id);

  appointment.set({
    startAt: start.toJSDate(),
    endAt: start.plus({ minutes: appointmentType.durationMinutes }).toJSDate()
  });
  try {
    await appointment.save();
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(409, 'SLOT_UNAVAILABLE', 'El horario seleccionado no está disponible');
    }
    throw error;
  }
  return appointment.populate(publicPopulate);
}
