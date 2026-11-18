import type { CookieOptions, Request, Response } from 'express';
import { env } from '../config/env.js';
import { isGoogleConfigured } from '../config/google.js';
import { assertGoogleConfigured, handleGoogleCallback } from '../services/google-auth.service.js';
import { createAuthorization } from '../services/google-oauth.service.js';
import { AppError } from '../utils/app-error.js';
import { parseCookies } from '../utils/cookies.js';

const STATE_COOKIE = 'citaclara_oauth_state';
const stateCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.nodeEnv === 'production',
  path: '/api/auth/google',
  maxAge: 10 * 60 * 1000
};

// El panel recibe el resultado en el fragmento (#) para que el token no quede en logs ni en el historial del servidor.
const panelRedirect = (fragment: string) => `${env.appUrl}/panel#${fragment}`;

export function start(_request: Request, response: Response): void {
  if (!isGoogleConfigured()) {
    response.redirect(panelRedirect('error=GOOGLE_NOT_CONFIGURED'));
    return;
  }
  const { url, stateCookie } = createAuthorization();
  response.cookie(STATE_COOKIE, stateCookie, stateCookieOptions);
  response.redirect(url);
}

export function link(request: Request, response: Response): void {
  assertGoogleConfigured();
  const { url, stateCookie } = createAuthorization(request.auth!.userId);
  response.cookie(STATE_COOKIE, stateCookie, stateCookieOptions);
  response.json({ url });
}

export async function callback(request: Request, response: Response): Promise<void> {
  const query = request.query as Record<string, string | undefined>;
  const stateCookie = parseCookies(request.headers.cookie)[STATE_COOKIE];
  response.clearCookie(STATE_COOKIE, { path: stateCookieOptions.path });

  try {
    const { token } = await handleGoogleCallback({ code: query.code, state: query.state, error: query.error, stateCookie });
    response.redirect(panelRedirect(`token=${encodeURIComponent(token)}`));
  } catch (error) {
    if (!(error instanceof AppError)) console.error('Google login failed:', error);
    const code = error instanceof AppError ? error.code : 'GOOGLE_LOGIN_FAILED';
    response.redirect(panelRedirect(`error=${code}`));
  }
}
