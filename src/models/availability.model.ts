import { Schema, model, type InferSchemaType } from 'mongoose';
import { jsonOptions } from '../utils/json.js';

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// Bloque semanal de atención. dayOfWeek sigue ISO 8601: 1 = lunes ... 7 = domingo.
const availabilitySchema = new Schema(
  {
    professional: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dayOfWeek: { type: Number, required: true, min: 1, max: 7 },
    startTime: { type: String, required: true, match: TIME_PATTERN },
    endTime: { type: String, required: true, match: TIME_PATTERN }
  },
  { timestamps: true, toJSON: jsonOptions }
);

export type AvailabilityAttributes = InferSchemaType<typeof availabilitySchema>;
export const Availability = model('Availability', availabilitySchema);
