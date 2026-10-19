import type { Request, Response } from 'express';
import * as authService from '../services/auth.service.js';
import { loginSchema, registerSchema } from '../validators/auth.schemas.js';

export async function register(request: Request, response: Response): Promise<void> {
  const input = registerSchema.parse(request.body);
  const { user, token } = await authService.registerProfessional(input);
  response.status(201).json({ user, token });
}

export async function login(request: Request, response: Response): Promise<void> {
  const { email, password } = loginSchema.parse(request.body);
  const { user, token } = await authService.login(email, password);
  response.json({ user, token });
}

export async function me(request: Request, response: Response): Promise<void> {
  const user = await authService.getProfile(request.auth!.userId);
  response.json(user);
}
