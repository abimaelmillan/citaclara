import { Router } from 'express';
import * as appointmentController from '../controllers/appointment.controller.js';
import { authenticate } from '../middleware/authenticate.middleware.js';

export const appointmentRouter = Router();

appointmentRouter.use(authenticate);
appointmentRouter.get('/', appointmentController.list);
appointmentRouter.get('/:id', appointmentController.getById);
appointmentRouter.patch('/:id/status', appointmentController.updateStatus);
