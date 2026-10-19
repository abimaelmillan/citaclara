import { Router } from 'express';
import * as availabilityController from '../controllers/availability.controller.js';
import { authenticate } from '../middleware/authenticate.middleware.js';

export const availabilityRouter = Router();

availabilityRouter.use(authenticate);
availabilityRouter.get('/', availabilityController.list);
availabilityRouter.post('/', availabilityController.create);
availabilityRouter.get('/:id', availabilityController.getById);
availabilityRouter.patch('/:id', availabilityController.update);
availabilityRouter.delete('/:id', availabilityController.remove);
