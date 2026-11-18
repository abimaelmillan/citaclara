import { Schema, model, type InferSchemaType } from 'mongoose';
import { jsonOptions } from '../utils/json.js';

export const appointmentStatuses = ['scheduled', 'completed', 'cancelled', 'no_show'] as const;
export type AppointmentStatus = (typeof appointmentStatuses)[number];
export const calendarSyncStatuses = ['synced', 'failed', 'skipped'] as const;

const appointmentSchema = new Schema(
  {
    professional: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    appointmentType: { type: Schema.Types.ObjectId, ref: 'AppointmentType', required: true },
    patient: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    status: { type: String, enum: appointmentStatuses, default: 'scheduled' },
    notes: { type: String, trim: true, default: '' },
    cancelledBy: { type: String, enum: ['patient', 'professional'] },
    manageTokenHash: { type: String, required: true, unique: true, select: false },
    // Evento creado en el Google Calendar del profesional y resultado del último intento de sincronización.
    googleEventId: { type: String },
    calendarSync: {
      status: { type: String, enum: calendarSyncStatuses },
      error: { type: String },
      syncedAt: { type: Date }
    }
  },
  { timestamps: true, toJSON: jsonOptions }
);

appointmentSchema.index({ professional: 1, status: 1, startAt: 1 });
// Garantiza a nivel base de datos que dos pacientes no reserven el mismo horario
// al mismo tiempo (solo aplica a citas activas).
appointmentSchema.index(
  { professional: 1, startAt: 1 },
  { unique: true, partialFilterExpression: { status: 'scheduled' }, name: 'unique_active_slot' }
);

export type AppointmentAttributes = InferSchemaType<typeof appointmentSchema>;
export const Appointment = model('Appointment', appointmentSchema);
