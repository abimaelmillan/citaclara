import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { jsonOptions } from '../utils/json.js';

export const roles = ['professional', 'admin'] as const;
export type Role = (typeof roles)[number];

// Profesional que ofrece citas (médico, nutriólogo, fisioterapeuta...).
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    specialty: { type: String, trim: true, default: '' },
    // Identificador del enlace público de agenda: /p/:slug
    slug: { type: String, required: true, unique: true },
    timezone: { type: String, required: true },
    role: { type: String, enum: roles, default: 'professional' }
  },
  { timestamps: true, toJSON: jsonOptions }
);

export type UserAttributes = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<UserAttributes>;
export const User = model('User', userSchema);
