import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { Appointment } from '../models/appointment.model.js';
import { AppointmentType } from '../models/appointment-type.model.js';
import { Availability } from '../models/availability.model.js';
import { Patient } from '../models/patient.model.js';
import { User } from '../models/user.model.js';
import { hashPassword } from '../utils/password.js';

// Crea (o reinicia) un profesional de demostración con tipos de consulta y horarios.
// Credenciales solo para desarrollo local.
const DEMO_EMAIL = 'demo@citaclara.test';
const DEMO_PASSWORD = 'Demo12345';

async function seed(): Promise<void> {
  await connectDatabase();

  const previous = await User.findOne({ email: DEMO_EMAIL });
  if (previous) {
    await Promise.all([
      Appointment.deleteMany({ professional: previous._id }),
      AppointmentType.deleteMany({ professional: previous._id }),
      Availability.deleteMany({ professional: previous._id }),
      Patient.deleteMany({ professional: previous._id })
    ]);
    await previous.deleteOne();
  }

  const professional = await User.create({
    name: 'Dr. Juan Pérez',
    email: DEMO_EMAIL,
    passwordHash: await hashPassword(DEMO_PASSWORD),
    specialty: 'Cirugía general',
    slug: 'dr-juan-perez',
    timezone: env.defaultTimezone
  });

  await AppointmentType.insertMany([
    {
      professional: professional._id,
      name: 'Consulta de primera vez',
      description: 'Valoración inicial del padecimiento.',
      durationMinutes: 30,
      price: 800,
      preparationNotes: 'Trae estudios previos e identificación.'
    },
    {
      professional: professional._id,
      name: 'Valoración prequirúrgica',
      description: 'Revisión de estudios y plan quirúrgico.',
      durationMinutes: 45,
      price: 1000,
      preparationNotes: 'Trae laboratorios recientes (máximo 30 días).'
    },
    {
      professional: professional._id,
      name: 'Revisión post-operatoria',
      description: 'Seguimiento de la recuperación y retiro de puntos.',
      durationMinutes: 20,
      price: 500
    }
  ]);

  const weekdays = [1, 2, 3, 4, 5];
  await Availability.insertMany([
    ...weekdays.map((dayOfWeek) => ({ professional: professional._id, dayOfWeek, startTime: '09:00', endTime: '14:00' })),
    ...[1, 3].map((dayOfWeek) => ({ professional: professional._id, dayOfWeek, startTime: '16:00', endTime: '19:00' }))
  ]);

  console.log(`Profesional demo listo: ${env.appUrl}/p/${professional.slug}`);
  console.log(`Inicia sesión en ${env.appUrl}/panel con ${DEMO_EMAIL}`);
  await disconnectDatabase();
}

seed().catch(async (error: unknown) => {
  console.error('No se pudo cargar la información demo:', error);
  await disconnectDatabase();
  process.exit(1);
});
