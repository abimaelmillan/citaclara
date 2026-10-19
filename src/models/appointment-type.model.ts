import { Schema, model, type InferSchemaType } from 'mongoose';
import { jsonOptions } from '../utils/json.js';

// Tipo de consulta que ofrece un profesional (primera vez, valoración, post-operatorio...).
const appointmentTypeSchema = new Schema(
  {
    professional: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    durationMinutes: { type: Number, required: true, min: 10, max: 480 },
    price: { type: Number, min: 0, default: 0 },
    // Indicaciones que el paciente debe conocer antes de la cita (ayuno, estudios...).
    preparationNotes: { type: String, trim: true, default: '' },
    active: { type: Boolean, default: true }
  },
  { timestamps: true, toJSON: jsonOptions }
);

appointmentTypeSchema.index({ professional: 1, name: 1 }, { unique: true });

export type AppointmentTypeAttributes = InferSchemaType<typeof appointmentTypeSchema>;
export const AppointmentType = model('AppointmentType', appointmentTypeSchema);
