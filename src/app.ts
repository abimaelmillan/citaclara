import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { errorHandler, notFound } from './middleware/error.middleware.js';
import { appointmentTypeRouter } from './routes/appointment-type.routes.js';
import { appointmentRouter } from './routes/appointment.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { availabilityRouter } from './routes/availability.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { publicRouter } from './routes/public.routes.js';

const publicFolder = process.env.NODE_ENV === 'production' ? 'dist/public' : 'src/public';
const publicDirectory = path.join(process.cwd(), publicFolder);
const page = (file: string) => path.join(publicDirectory, file);

export const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());

// API REST
app.use(healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/appointment-types', appointmentTypeRouter);
app.use('/api/availability', availabilityRouter);
app.use('/api/appointments', appointmentRouter);
app.use('/api/public', publicRouter);

// Interfaz web mínima que consume la API
app.get('/', (_request, response) => response.redirect('/panel'));
app.get('/panel', (_request, response) => response.sendFile(page('panel.html')));
app.get('/p/:slug', (_request, response) => response.sendFile(page('booking.html')));
app.get('/cita/:token', (_request, response) => response.sendFile(page('appointment.html')));
app.use(express.static(publicDirectory));

app.use(notFound);
app.use(errorHandler);
