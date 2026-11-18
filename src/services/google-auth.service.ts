import { env } from '../config/env.js';
import { CALENDAR_SCOPE, isGoogleConfigured } from '../config/google.js';
import { User, type UserDocument } from '../models/user.model.js';
import { AppError } from '../utils/app-error.js';
import { encrypt } from '../utils/crypto.js';
import { signAccessToken } from '../utils/jwt.js';
import { generateUniqueSlug } from './auth.service.js';
import { exchangeCode, fetchProfile, verifyState, type GoogleProfile, type GoogleTokens } from './google-oauth.service.js';

interface CallbackInput {
  code?: string;
  state?: string;
  error?: string;
  stateCookie?: string;
}

export function assertGoogleConfigured(): void {
  if (!isGoogleConfigured()) {
    throw new AppError(503, 'GOOGLE_NOT_CONFIGURED', 'El inicio de sesión con Google no está configurado');
  }
}

async function createFromGoogle(profile: GoogleProfile): Promise<UserDocument> {
  const name = profile.name?.trim() || profile.email.split('@')[0];
  return User.create({
    name,
    email: profile.email.toLowerCase(),
    slug: await generateUniqueSlug(name),
    timezone: env.defaultTimezone
  });
}

// Decide a qué profesional pertenece la cuenta de Google:
// 1) vinculación explícita desde el panel, 2) cuenta ya vinculada, 3) mismo correo verificado, 4) cuenta nueva.
async function resolveUser(profile: GoogleProfile, linkUserId?: string): Promise<UserDocument> {
  const owner = await User.findOne({ 'google.id': profile.sub });

  if (linkUserId) {
    if (owner && owner.id !== linkUserId) {
      throw new AppError(409, 'GOOGLE_ACCOUNT_IN_USE', 'Esa cuenta de Google ya está vinculada con otro profesional');
    }
    const user = await User.findById(linkUserId);
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'El usuario no existe');
    return user;
  }

  if (owner) return owner;

  const byEmail = await User.findOne({ email: profile.email.toLowerCase() });
  if (byEmail?.google?.id && byEmail.google.id !== profile.sub) {
    throw new AppError(409, 'GOOGLE_ACCOUNT_IN_USE', 'Tu cuenta ya está vinculada con otra cuenta de Google');
  }
  return byEmail ?? createFromGoogle(profile);
}

async function saveGoogleConnection(user: UserDocument, profile: GoogleProfile, tokens: GoogleTokens): Promise<void> {
  const calendarGranted = tokens.scope.split(' ').includes(CALENDAR_SCOPE);
  user.set({
    'google.id': profile.sub,
    'google.email': profile.email,
    'google.connectedAt': new Date(),
    'google.accessToken': encrypt(tokens.accessToken),
    'google.accessTokenExpiresAt': new Date(Date.now() + tokens.expiresIn * 1000),
    // Sin refresh token no es posible sincronizar después, aunque el permiso se haya otorgado.
    'google.calendarConnected': calendarGranted && Boolean(tokens.refreshToken),
    ...(tokens.refreshToken ? { 'google.refreshToken': encrypt(tokens.refreshToken) } : {})
  });
  await user.save();
}

export async function handleGoogleCallback(input: CallbackInput): Promise<{ user: UserDocument; token: string }> {
  assertGoogleConfigured();
  if (input.error) {
    throw new AppError(403, 'GOOGLE_ACCESS_DENIED', 'Se canceló el inicio de sesión con Google');
  }
  const { linkUserId } = verifyState(input.stateCookie, input.state);
  if (!input.code) throw new AppError(400, 'INVALID_OAUTH_RESPONSE', 'Google no devolvió un código de autorización');

  const tokens = await exchangeCode(input.code);
  const profile = await fetchProfile(tokens.accessToken);
  if (!profile.email_verified) {
    throw new AppError(403, 'GOOGLE_EMAIL_NOT_VERIFIED', 'El correo de tu cuenta de Google no está verificado');
  }

  const user = await resolveUser(profile, linkUserId);
  await saveGoogleConnection(user, profile, tokens);
  return { user, token: signAccessToken(user.id, user.role) };
}
