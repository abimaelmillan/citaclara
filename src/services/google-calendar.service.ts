import { DateTime } from 'luxon';
import { GOOGLE_URLS, isGoogleConfigured } from '../config/google.js';
import { User } from '../models/user.model.js';
import { decrypt, encrypt } from '../utils/crypto.js';
import { GoogleApiError, googleRequest, refreshAccessToken } from './google-oauth.service.js';

export interface CalendarEventInput {
  appointmentId: string;
  summary: string;
  description: string;
  startAt: Date;
  endAt: Date;
  timezone: string;
}

// Devuelve un access token vigente del profesional, o null si no tiene Google Calendar conectado.
// Si Google rechaza el refresh token (permiso revocado o expirado), se marca el calendario como desconectado.
async function getAccessToken(professionalId: string): Promise<string | null> {
  if (!isGoogleConfigured()) return null;
  const user = await User.findById(professionalId)
    .select('+google.refreshToken +google.accessToken +google.accessTokenExpiresAt');
  const google = user?.google;
  if (!user || !google?.calendarConnected || !google.refreshToken) return null;

  const expiresAt = google.accessTokenExpiresAt?.getTime() ?? 0;
  if (google.accessToken && expiresAt - Date.now() > 60_000) return decrypt(google.accessToken);

  try {
    const { accessToken, expiresIn } = await refreshAccessToken(decrypt(google.refreshToken));
    user.set({
      'google.accessToken': encrypt(accessToken),
      'google.accessTokenExpiresAt': new Date(Date.now() + expiresIn * 1000)
    });
    await user.save();
    return accessToken;
  } catch (error) {
    if (error instanceof GoogleApiError && error.code === 'invalid_grant') {
      user.set({ 'google.calendarConnected': false });
      await user.save();
    }
    throw error;
  }
}

function eventBody(input: CalendarEventInput) {
  const toGoogle = (date: Date) => ({
    dateTime: DateTime.fromJSDate(date, { zone: input.timezone }).toISO({ suppressMilliseconds: true }),
    timeZone: input.timezone
  });
  return {
    summary: input.summary,
    description: input.description,
    start: toGoogle(input.startAt),
    end: toGoogle(input.endAt),
    extendedProperties: { private: { citaclaraAppointmentId: input.appointmentId } }
  };
}

export async function isCalendarConnected(professionalId: string): Promise<boolean> {
  if (!isGoogleConfigured()) return false;
  const user = await User.findById(professionalId).select('google.calendarConnected');
  return Boolean(user?.google?.calendarConnected);
}

export async function createEvent(professionalId: string, input: CalendarEventInput): Promise<string | null> {
  const accessToken = await getAccessToken(professionalId);
  if (!accessToken) return null;
  const event = await googleRequest<{ id: string }>(GOOGLE_URLS.calendarEvents, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(eventBody(input))
  });
  return event.id;
}

export async function updateEvent(professionalId: string, eventId: string, input: CalendarEventInput): Promise<boolean> {
  const accessToken = await getAccessToken(professionalId);
  if (!accessToken) return false;
  await googleRequest(`${GOOGLE_URLS.calendarEvents}/${encodeURIComponent(eventId)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(eventBody(input))
  });
  return true;
}

export async function deleteEvent(professionalId: string, eventId: string): Promise<boolean> {
  const accessToken = await getAccessToken(professionalId);
  if (!accessToken) return false;
  try {
    await googleRequest(`${GOOGLE_URLS.calendarEvents}/${encodeURIComponent(eventId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  } catch (error) {
    // Si el profesional ya borró el evento desde Google Calendar, no es un error.
    if (!(error instanceof GoogleApiError && (error.status === 404 || error.status === 410))) throw error;
  }
  return true;
}
