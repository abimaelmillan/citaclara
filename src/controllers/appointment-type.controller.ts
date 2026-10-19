import type { Request, Response } from 'express';
import * as appointmentTypeService from '../services/appointment-type.service.js';
import { createAppointmentTypeSchema, updateAppointmentTypeSchema } from '../validators/appointment-type.schemas.js';
import { idParams } from '../validators/common.schemas.js';

export async function list(request: Request, response: Response): Promise<void> {
  response.json(await appointmentTypeService.listAppointmentTypes(request.auth!.userId));
}

export async function getById(request: Request, response: Response): Promise<void> {
  const { id } = idParams.parse(request.params);
  response.json(await appointmentTypeService.getAppointmentType(request.auth!.userId, id));
}

export async function create(request: Request, response: Response): Promise<void> {
  const input = createAppointmentTypeSchema.parse(request.body);
  const appointmentType = await appointmentTypeService.createAppointmentType(request.auth!.userId, input);
  response.status(201).json(appointmentType);
}

export async function update(request: Request, response: Response): Promise<void> {
  const { id } = idParams.parse(request.params);
  const input = updateAppointmentTypeSchema.parse(request.body);
  response.json(await appointmentTypeService.updateAppointmentType(request.auth!.userId, id, input));
}

export async function remove(request: Request, response: Response): Promise<void> {
  const { id } = idParams.parse(request.params);
  await appointmentTypeService.deleteAppointmentType(request.auth!.userId, id);
  response.status(204).end();
}
