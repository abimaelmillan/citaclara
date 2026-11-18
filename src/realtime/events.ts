import { DateTime } from 'luxon';
import { agendaRoom, getRealtime, panelRoom } from './socket.js';

export type AppointmentChange = 'created' | 'rescheduled' | 'cancelled' | 'completed' | 'no_show';

export interface AppointmentSnapshot {
  id: string;
  professionalId: string;
  timezone: string;
  status: string;
  startAt: Date;
  endAt: Date;
  patientName: string;
  appointmentTypeName: string;
  calendarSync?: { status?: string | null } | null;
}

// Se llama después de guardar el cambio en MongoDB. Sin servidor de sockets (scripts) no hace nada.
export function emitAppointmentChange(change: AppointmentChange, appointment: AppointmentSnapshot, previousStartAt?: Date): void {
  const io = getRealtime();
  if (!io) return;

  io.of('/panel').to(panelRoom(appointment.professionalId)).emit('appointment:changed', {
    change,
    appointment: {
      id: appointment.id,
      status: appointment.status,
      startAt: appointment.startAt.toISOString(),
      endAt: appointment.endAt.toISOString(),
      patient: { name: appointment.patientName },
      appointmentType: { name: appointment.appointmentTypeName },
      calendarSync: appointment.calendarSync?.status ?? null
    }
  });

  // Atendida o inasistencia no liberan ni ocupan horarios.
  if (change === 'completed' || change === 'no_show') return;
  const toLocalDate = (date: Date) => DateTime.fromJSDate(date, { zone: appointment.timezone }).toISODate();
  const dates = [...new Set([toLocalDate(appointment.startAt), ...(previousStartAt ? [toLocalDate(previousStartAt)] : [])])];
  io.of('/agenda').to(agendaRoom(appointment.professionalId)).emit('slots:changed', { dates });
}
