import { Appointment } from '../models/appointment.model.js';
import { emitAppointmentChange, type AppointmentChange } from '../realtime/events.js';
import { createEvent, deleteEvent, isCalendarConnected, updateEvent, type CalendarEventInput } from './google-calendar.service.js';

interface PopulatedAppointment {
  id: string;
  status: string;
  startAt: Date;
  endAt: Date;
  notes?: string | null;
  googleEventId?: string | null;
  calendarSync?: { status?: string | null; error?: string | null; syncedAt?: Date | null } | null;
  professional: { _id: { toString(): string }; timezone: string };
  appointmentType: { name: string };
  patient: { name: string; email: string; phone: string };
}

function calendarEvent(appointment: PopulatedAppointment): CalendarEventInput {
  const { patient } = appointment;
  return {
    appointmentId: appointment.id,
    summary: `${appointment.appointmentType.name} · ${patient.name}`,
    description: [
      `Paciente: ${patient.name}`,
      `Teléfono: ${patient.phone}`,
      `Correo: ${patient.email}`,
      ...(appointment.notes ? [`Motivo: ${appointment.notes}`] : []),
      '',
      'Agendada desde CitaClara'
    ].join('\n'),
    startAt: appointment.startAt,
    endAt: appointment.endAt,
    timezone: appointment.professional.timezone
  };
}

// Refleja el cambio en Google Calendar. Un error de Google nunca revierte la cita:
// la cita ya está guardada y el resultado queda registrado en calendarSync.
async function syncCalendar(appointment: PopulatedAppointment, change: AppointmentChange) {
  if (change === 'completed' || change === 'no_show') return null;
  const professionalId = appointment.professional._id.toString();

  if (!appointment.googleEventId && !(await isCalendarConnected(professionalId))) {
    return change === 'created' ? { calendarSync: { status: 'skipped', syncedAt: new Date() } } : null;
  }

  try {
    let googleEventId = appointment.googleEventId ?? undefined;
    let synced = true;
    if (change === 'cancelled') {
      if (googleEventId) synced = await deleteEvent(professionalId, googleEventId);
    } else if (googleEventId) {
      synced = await updateEvent(professionalId, googleEventId, calendarEvent(appointment));
    } else {
      googleEventId = (await createEvent(professionalId, calendarEvent(appointment))) ?? undefined;
      synced = Boolean(googleEventId);
    }
    return {
      ...(googleEventId ? { googleEventId } : {}),
      calendarSync: synced
        ? { status: 'synced', syncedAt: new Date() }
        : { status: 'failed', error: 'Google Calendar ya no está conectado', syncedAt: new Date() }
    };
  } catch (error) {
    console.error('Google Calendar sync failed:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return { calendarSync: { status: 'failed', error: message.slice(0, 200), syncedAt: new Date() } };
  }
}

// Punto único que se ejecuta después de crear, reprogramar, cancelar o cerrar una cita.
export async function afterAppointmentChange(appointmentId: string, change: AppointmentChange, previousStartAt?: Date): Promise<void> {
  const appointment = (await Appointment.findById(appointmentId).populate([
    { path: 'professional', select: 'timezone' },
    { path: 'appointmentType', select: 'name' },
    { path: 'patient', select: 'name email phone' }
  ])) as unknown as PopulatedAppointment | null;
  if (!appointment) return;

  const update = await syncCalendar(appointment, change);
  if (update) await Appointment.updateOne({ _id: appointmentId }, { $set: update });

  emitAppointmentChange(change, {
    id: appointment.id,
    professionalId: appointment.professional._id.toString(),
    timezone: appointment.professional.timezone,
    status: appointment.status,
    startAt: appointment.startAt,
    endAt: appointment.endAt,
    patientName: appointment.patient.name,
    appointmentTypeName: appointment.appointmentType.name,
    calendarSync: update?.calendarSync ?? appointment.calendarSync
  }, previousStartAt);
}
