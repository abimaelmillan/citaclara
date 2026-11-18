import { env } from './env.js';

export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
export const GOOGLE_SCOPES = ['openid', 'email', 'profile', CALENDAR_SCOPE];

export const GOOGLE_URLS = {
  authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
  token: 'https://oauth2.googleapis.com/token',
  userInfo: 'https://openidconnect.googleapis.com/v1/userinfo',
  calendarEvents: 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
};

export function isGoogleConfigured(): boolean {
  return Boolean(env.google.clientId && env.google.clientSecret);
}
