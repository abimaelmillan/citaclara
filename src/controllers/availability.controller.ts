import type { Request, Response } from 'express';
import * as availabilityService from '../services/availability.service.js';
import { createAvailabilitySchema, updateAvailabilitySchema } from '../validators/availability.schemas.js';
import { idParams } from '../validators/common.schemas.js';

export async function list(request: Request, response: Response): Promise<void> {
  response.json(await availabilityService.listAvailability(request.auth!.userId));
}

export async function getById(request: Request, response: Response): Promise<void> {
  const { id } = idParams.parse(request.params);
  response.json(await availabilityService.getAvailability(request.auth!.userId, id));
}

export async function create(request: Request, response: Response): Promise<void> {
  const input = createAvailabilitySchema.parse(request.body);
  const availability = await availabilityService.createAvailability(request.auth!.userId, input);
  response.status(201).json(availability);
}

export async function update(request: Request, response: Response): Promise<void> {
  const { id } = idParams.parse(request.params);
  const input = updateAvailabilitySchema.parse(request.body);
  response.json(await availabilityService.updateAvailability(request.auth!.userId, id, input));
}

export async function remove(request: Request, response: Response): Promise<void> {
  const { id } = idParams.parse(request.params);
  await availabilityService.deleteAvailability(request.auth!.userId, id);
  response.status(204).end();
}
