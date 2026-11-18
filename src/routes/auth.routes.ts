import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import * as googleAuthController from '../controllers/google-auth.controller.js';
import { authenticate } from '../middleware/authenticate.middleware.js';

export const authRouter = Router();

authRouter.post('/register', authController.register);
authRouter.post('/login', authController.login);
authRouter.get('/me', authenticate, authController.me);

// Login con Google (OAuth 2.0) y vinculación de Google Calendar
authRouter.get('/google', googleAuthController.start);
authRouter.post('/google/link', authenticate, googleAuthController.link);
authRouter.get('/google/callback', googleAuthController.callback);
