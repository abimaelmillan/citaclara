import type { RequestHandler } from 'express';
import { AppError } from '../utils/app-error.js';
import { verifyAccessToken } from '../utils/jwt.js';

// Lee el header "Authorization: Bearer <token>" y deja la identidad en request.auth.
export const authenticate: RequestHandler = (request, _response, next) => {
  const [scheme, token] = (request.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'UNAUTHORIZED', 'Se requiere autenticación');
  }

  try {
    const payload = verifyAccessToken(token);
    request.auth = { userId: payload.sub, role: payload.role };
    next();
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', 'Token inválido o expirado');
  }
};
