import { Router } from 'express';
import * as appointmentTypeController from '../controllers/appointment-type.controller.js';
import { authenticate } from '../middleware/authenticate.middleware.js';

export const appointmentTypeRouter = Router();

appointmentTypeRouter.use(authenticate);
appointmentTypeRouter.get('/', appointmentTypeController.list);
appointmentTypeRouter.post('/', appointmentTypeController.create);
appointmentTypeRouter.get('/:id', appointmentTypeController.getById);
appointmentTypeRouter.patch('/:id', appointmentTypeController.update);
appointmentTypeRouter.delete('/:id', appointmentTypeController.remove);
