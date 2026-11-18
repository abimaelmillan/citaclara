import { randomBytes } from 'node:crypto';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { GOOGLE_SCOPES, GOOGLE_URLS } from '../config/google.js';
import { AppError } from '../utils/app-error.js';

// Cliente mínimo de las APIs REST de Google (OAuth 2.0, OpenID Connect y Calendar) usando fetch.

export class GoogleApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

export interface GoogleTokens {
  accessToken: string;
  expiresIn: number;
  refreshToken?: string;
  scope: string;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
}

const STATE_AUDIENCE = 'google-oauth';
const STATE_TTL = '10m';

export async function googleRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { error: 'INVALID_RESPONSE', error_description: text.slice(0, 200) };
  }

  if (!response.ok) {
    // OAuth responde { error, error_description }; Calendar responde { error: { status, message } }.
    const error = (body as { error?: unknown; error_description?: string } | null) ?? {};
    const code = typeof error.error === 'string' ? error.error : (error.error as { status?: string })?.status ?? 'GOOGLE_ERROR';
    const message = error.error_description ?? (error.error as { message?: string })?.message ?? `Google respondió ${response.status}`;
    throw new GoogleApiError(response.status, code, message);
  }
  return body as T;
}

// El "state" viaja a Google y regresa en el callback; una copia firmada se guarda en una
// cookie httpOnly para comprobar que el callback pertenece al mismo navegador (protección CSRF).
export function createAuthorization(linkUserId?: string): { url: string; stateCookie: string } {
  const nonce = randomBytes(16).toString('base64url');
  const stateCookie = jwt.sign({ nonce, ...(linkUserId ? { linkUserId } : {}) }, env.jwtSecret, {
    audience: STATE_AUDIENCE,
    expiresIn: STATE_TTL
  });
  const params = new URLSearchParams({
    client_id: env.google.clientId,
    redirect_uri: env.google.redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state: nonce
  });
  return { url: `${GOOGLE_URLS.authorize}?${params}`, stateCookie };
}

export function verifyState(stateCookie: string | undefined, state: string | undefined): { linkUserId?: string } {
  try {
    const payload = jwt.verify(stateCookie ?? '', env.jwtSecret, { audience: STATE_AUDIENCE }) as JwtPayload;
    if (!state || payload.nonce !== state) throw new Error('State mismatch');
    return { linkUserId: typeof payload.linkUserId === 'string' ? payload.linkUserId : undefined };
  } catch {
    throw new AppError(400, 'INVALID_OAUTH_STATE', 'La sesión de inicio con Google expiró o no es válida');
  }
}

export async function exchangeCode(code: string): Promise<GoogleTokens> {
  const body = await googleRequest<{ access_token: string; expires_in: number; refresh_token?: string; scope: string }>(
    GOOGLE_URLS.token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.google.clientId,
        client_secret: env.google.clientSecret,
        redirect_uri: env.google.redirectUri,
        grant_type: 'authorization_code'
      })
    }
  );
  return { accessToken: body.access_token, expiresIn: body.expires_in, refreshToken: body.refresh_token, scope: body.scope };
}

export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
  const body = await googleRequest<{ access_token: string; expires_in: number }>(GOOGLE_URLS.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: env.google.clientId,
      client_secret: env.google.clientSecret,
      grant_type: 'refresh_token'
    })
  });
  return { accessToken: body.access_token, expiresIn: body.expires_in };
}

export function fetchProfile(accessToken: string): Promise<GoogleProfile> {
  return googleRequest<GoogleProfile>(GOOGLE_URLS.userInfo, { headers: { Authorization: `Bearer ${accessToken}` } });
}
