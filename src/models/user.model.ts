import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { jsonOptions } from '../utils/json.js';

export const roles = ['professional', 'admin'] as const;
export type Role = (typeof roles)[number];

// Profesional que ofrece citas (médico, nutriólogo, fisioterapeuta...).
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Opcional: las cuentas creadas con Google no tienen contraseña.
    passwordHash: { type: String, select: false },
    specialty: { type: String, trim: true, default: '' },
    // Identificador del enlace público de agenda: /p/:slug
    slug: { type: String, required: true, unique: true },
    timezone: { type: String, required: true },
    role: { type: String, enum: roles, default: 'professional' },
    // Cuenta de Google vinculada. Los tokens se guardan cifrados y nunca se devuelven.
    google: {
      id: { type: String },
      email: { type: String },
      calendarConnected: { type: Boolean, default: false },
      connectedAt: { type: Date },
      refreshToken: { type: String, select: false },
      accessToken: { type: String, select: false },
      accessTokenExpiresAt: { type: Date, select: false }
    }
  },
  { timestamps: true, toJSON: jsonOptions }
);

userSchema.index({ 'google.id': 1 }, { unique: true, sparse: true });

export type UserAttributes = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<UserAttributes>;
export const User = model('User', userSchema);
