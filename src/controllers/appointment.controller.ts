import type { Request, Response } from 'express';
import * as appointmentService from '../services/appointment.service.js';
import { listAppointmentsQuerySchema, updateStatusSchema } from '../validators/appointment.schemas.js';
import { idParams } from '../validators/common.schemas.js';

export async function list(request: Request, response: Response): Promise<void> {
  const filters = listAppointmentsQuerySchema.parse(request.query);
  response.json(await appointmentService.listAppointments(request.auth!.userId, filters));
}

export async function getById(request: Request, response: Response): Promise<void> {
  const { id } = idParams.parse(request.params);
  response.json(await appointmentService.getAppointment(request.auth!.userId, id));
}

export async function updateStatus(request: Request, response: Response): Promise<void> {
  const { id } = idParams.parse(request.params);
  const { status } = updateStatusSchema.parse(request.body);
  response.json(await appointmentService.updateAppointmentStatus(request.auth!.userId, id, status));
}
