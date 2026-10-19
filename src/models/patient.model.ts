import { Schema, model, type InferSchemaType } from 'mongoose';
import { jsonOptions } from '../utils/json.js';

// Paciente de un profesional. Se crea o actualiza automáticamente al agendar.
const patientSchema = new Schema(
  {
    professional: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true }
  },
  { timestamps: true, toJSON: jsonOptions }
);

patientSchema.index({ professional: 1, email: 1 }, { unique: true });

export type PatientAttributes = InferSchemaType<typeof patientSchema>;
export const Patient = model('Patient', patientSchema);
