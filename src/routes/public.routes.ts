import { Router } from 'express';
import * as publicController from '../controllers/public.controller.js';

// Rutas sin autenticación: las usa el paciente desde el enlace que comparte el profesional.
export const publicRouter = Router();

publicRouter.get('/professionals/:slug', publicController.getProfessional);
publicRouter.get('/professionals/:slug/slots', publicController.getSlots);
publicRouter.post('/professionals/:slug/appointments', publicController.book);
publicRouter.get('/appointments/:token', publicController.getByToken);
publicRouter.patch('/appointments/:token/cancel', publicController.cancel);
publicRouter.patch('/appointments/:token/reschedule', publicController.reschedule);
