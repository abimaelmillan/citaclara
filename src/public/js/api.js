// Cliente HTTP compartido por las páginas. Lanza un Error con el mensaje de la API.
const TOKEN_KEY = 'citaclara.token';

function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

function setToken(token) {
  try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY); } catch { /* sin almacenamiento */ }
}

async function api(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;
  const response = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error?.details?.[0]?.message ?? data.error?.message ?? 'Error inesperado');
    error.status = response.status;
    throw error;
  }
  return data;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function formatDateTime(iso, timeZone) {
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'full', timeStyle: 'short', timeZone }).format(new Date(iso));
}

function showMessage(element, text, type = 'error') {
  element.textContent = text;
  element.className = `message ${type}`;
}

function todayIso() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
