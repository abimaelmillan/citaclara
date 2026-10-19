import type { Request, Response } from 'express';
import * as bookingService from '../services/booking.service.js';
import {
  bookAppointmentSchema,
  rescheduleSchema,
  slotsQuerySchema,
  slugParams,
  tokenParams
} from '../validators/public.schemas.js';

export async function getProfessional(request: Request, response: Response): Promise<void> {
  const { slug } = slugParams.parse(request.params);
  response.json(await bookingService.getPublicProfile(slug));
}

export async function getSlots(request: Request, response: Response): Promise<void> {
  const { slug } = slugParams.parse(request.params);
  const { appointmentTypeId, date } = slotsQuerySchema.parse(request.query);
  response.json(await bookingService.getAvailableSlots(slug, appointmentTypeId, date));
}

export async function book(request: Request, response: Response): Promise<void> {
  const { slug } = slugParams.parse(request.params);
  const input = bookAppointmentSchema.parse(request.body);
  response.status(201).json(await bookingService.bookAppointment(slug, input));
}

export async function getByToken(request: Request, response: Response): Promise<void> {
  const { token } = tokenParams.parse(request.params);
  response.json(await bookingService.getAppointmentByToken(token));
}

export async function cancel(request: Request, response: Response): Promise<void> {
  const { token } = tokenParams.parse(request.params);
  response.json(await bookingService.cancelByToken(token));
}

export async function reschedule(request: Request, response: Response): Promise<void> {
  const { token } = tokenParams.parse(request.params);
  const { startAt } = rescheduleSchema.parse(request.body);
  response.json(await bookingService.rescheduleByToken(token, startAt));
}
