import { Router } from 'express';
import mongoose from 'mongoose';

export const healthRouter = Router();

healthRouter.get('/api/health', (_request, response) => {
  const database = mongoose.connection.readyState === mongoose.ConnectionStates.connected ? 'connected' : 'disconnected';
  response.json({ status: 'ok', database });
});
