import { Appointment } from '../models/appointment.model.js';
import { AppointmentType, type AppointmentTypeAttributes } from '../models/appointment-type.model.js';
import { AppError } from '../utils/app-error.js';

type AppointmentTypeInput = Partial<Omit<AppointmentTypeAttributes, 'professional'>>;

function notFound(): AppError {
  return new AppError(404, 'APPOINTMENT_TYPE_NOT_FOUND', 'El tipo de consulta no existe');
}

export function listAppointmentTypes(professionalId: string) {
  return AppointmentType.find({ professional: professionalId }).sort({ name: 1 });
}

export async function getAppointmentType(professionalId: string, id: string) {
  const appointmentType = await AppointmentType.findOne({ _id: id, professional: professionalId });
  if (!appointmentType) throw notFound();
  return appointmentType;
}

export async function createAppointmentType(professionalId: string, input: AppointmentTypeInput) {
  if (await AppointmentType.exists({ professional: professionalId, name: input.name })) {
    throw new AppError(409, 'APPOINTMENT_TYPE_EXISTS', 'Ya tienes un tipo de consulta con ese nombre');
  }
  return AppointmentType.create({ ...input, professional: professionalId });
}

export async function updateAppointmentType(professionalId: string, id: string, input: AppointmentTypeInput) {
  const appointmentType = await AppointmentType.findOneAndUpdate(
    { _id: id, professional: professionalId },
    input,
    { new: true, runValidators: true }
  );
  if (!appointmentType) throw notFound();
  return appointmentType;
}

// Un tipo de consulta con citas registradas no se borra para no perder historial;
// en ese caso se debe desactivar (active: false).
export async function deleteAppointmentType(professionalId: string, id: string): Promise<void> {
  const appointmentType = await getAppointmentType(professionalId, id);
  if (await Appointment.exists({ appointmentType: appointmentType._id })) {
    throw new AppError(409, 'APPOINTMENT_TYPE_IN_USE', 'Tiene citas registradas; desactívalo en lugar de borrarlo');
  }
  await appointmentType.deleteOne();
}
