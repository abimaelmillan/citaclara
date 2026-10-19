import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { Role } from '../models/user.model.js';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
}

export function signAccessToken(userId: string, role: Role): string {
  return jwt.sign({ role }, env.jwtSecret, {
    subject: userId,
    expiresIn: env.jwtTtl as SignOptions['expiresIn']
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.jwtSecret);
  if (typeof payload === 'string' || !payload.sub) throw new Error('Invalid token payload');
  return { sub: payload.sub, role: payload.role as Role };
}
