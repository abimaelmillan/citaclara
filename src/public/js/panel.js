const $ = (id) => document.getElementById(id);
const days = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const statusLabels = { scheduled: 'Programada', completed: 'Atendida', cancelled: 'Cancelada', no_show: 'No asistió' };
const calendarLabels = { synced: '✓ En Google Calendar', failed: '⚠ No sincronizada', skipped: '—' };
const changeLabels = { created: 'Nueva cita', rescheduled: 'Cita reprogramada', cancelled: 'Cita cancelada', completed: 'Cita atendida', no_show: 'Inasistencia registrada' };
const googleErrors = {
  GOOGLE_NOT_CONFIGURED: 'El inicio de sesión con Google no está configurado en el servidor.',
  GOOGLE_ACCESS_DENIED: 'Se canceló el inicio de sesión con Google.',
  INVALID_OAUTH_STATE: 'La sesión con Google expiró o no es válida. Intenta de nuevo.',
  INVALID_OAUTH_RESPONSE: 'Google no devolvió un código de autorización. Intenta de nuevo.',
  GOOGLE_EMAIL_NOT_VERIFIED: 'El correo de tu cuenta de Google no está verificado.',
  GOOGLE_ACCOUNT_IN_USE: 'Esa cuenta de Google ya está vinculada con otro profesional.',
  GOOGLE_LOGIN_FAILED: 'No se pudo completar el inicio de sesión con Google.'
};
let user = null;
let socket = null;

function fail(error) {
  if (error.status === 401) {
    setToken(null);
    disconnectLive();
    showAuth();
  }
  showMessage($('message'), error.message);
}

// Resultado del login con Google: el servidor regresa a /panel#token=... o /panel#error=CODIGO
function readGoogleRedirect() {
  const params = new URLSearchParams(location.hash.slice(1));
  if (!params.has('token') && !params.has('error')) return;
  history.replaceState(null, '', location.pathname);
  if (params.get('token')) setToken(params.get('token'));
  if (params.get('error')) showMessage($('message'), googleErrors[params.get('error')] ?? googleErrors.GOOGLE_LOGIN_FAILED);
}

function setLive(online) {
  $('live').textContent = online ? '● En vivo' : '○ Sin conexión';
  $('live').classList.toggle('online', online);
}

function toast(html) {
  const element = document.createElement('div');
  element.className = 'toast';
  element.innerHTML = html;
  $('toasts').append(element);
  setTimeout(() => element.remove(), 8000);
}

// Tiempo real: el servidor avisa cuando una cita se crea, reprograma, cancela o cierra.
function connectLive() {
  if (socket || typeof io !== 'function') return;
  socket = io('/panel', { auth: { token: getToken() } });
  socket.on('connect', () => setLive(true));
  socket.on('disconnect', () => setLive(false));
  socket.on('connect_error', (error) => {
    setLive(false);
    if (error.message === 'UNAUTHORIZED') disconnectLive();
  });
  socket.on('appointment:changed', ({ change, appointment }) => {
    toast(`<strong>${changeLabels[change]}</strong><br>${escapeHtml(appointment.patient.name)} · ${escapeHtml(appointment.appointmentType.name)}<br>${formatDateTime(appointment.startAt, user.timezone)}`);
    loadAppointments();
  });
}

function disconnectLive() {
  socket?.disconnect();
  socket = null;
  setLive(false);
}

function renderGoogle() {
  const google = user.google ?? {};
  if (google.calendarConnected) {
    $('google-status').innerHTML = `Conectado con <strong>${escapeHtml(google.email)}</strong>. Tus citas se agregan, se mueven y se borran solas en tu Google Calendar.`;
  } else if (google.id) {
    $('google-status').textContent = 'Tu cuenta de Google está vinculada, pero sin permiso para tu calendario. Vuelve a conectar y acepta el permiso de Google Calendar.';
  } else {
    $('google-status').textContent = 'Conecta tu cuenta de Google para que cada cita aparezca en tu Google Calendar.';
  }
  $('google-link').classList.toggle('hidden', Boolean(google.calendarConnected));
}

function showAuth() {
  $('auth').classList.remove('hidden');
  $('dashboard').classList.add('hidden');
  $('session').classList.add('hidden');
}

async function showDashboard() {
  try {
    user = await api('/api/auth/me', { auth: true });
  } catch (error) {
    return fail(error);
  }
  $('auth').classList.add('hidden');
  $('dashboard').classList.remove('hidden');
  $('session').classList.remove('hidden');
  $('user-name').textContent = user.email;
  $('greeting').textContent = user.name;
  $('public-link').textContent = `${location.origin}/p/${user.slug}`;
  renderGoogle();
  connectLive();
  await Promise.all([loadAppointments(), loadTypes(), loadAvailability()]);
}

async function loadAppointments() {
  const list = await api(`/api/appointments?from=${todayIso()}`, { auth: true });
  $('appointments').innerHTML = list.length ? `
    <table>
      <tr><th>Fecha</th><th>Paciente</th><th>Consulta</th><th>Estado</th><th>Calendar</th><th></th></tr>
      ${list.map((item) => `
        <tr>
          <td>${formatDateTime(item.startAt, user.timezone)}</td>
          <td>${escapeHtml(item.patient.name)}<br><span class="muted">${escapeHtml(item.patient.phone)}</span></td>
          <td>${escapeHtml(item.appointmentType.name)}</td>
          <td><span class="badge ${item.status}">${statusLabels[item.status]}</span></td>
          <td>${item.calendarSync?.status ? `<span class="cal ${item.calendarSync.status}" title="${escapeHtml(item.calendarSync.error ?? '')}">${calendarLabels[item.calendarSync.status]}</span>` : '<span class="muted">—</span>'}</td>
          <td>${item.status === 'scheduled' ? `<button class="danger small" data-cancel="${item.id}">Cancelar</button>` : ''}</td>
        </tr>`).join('')}
    </table>` : '<p class="muted">Aún no tienes citas próximas.</p>';
}

async function loadTypes() {
  const list = await api('/api/appointment-types', { auth: true });
  $('types').innerHTML = list.length ? `<table>${list.map((type) => `
    <tr>
      <td><strong>${escapeHtml(type.name)}</strong><br><span class="muted">${type.durationMinutes} min · $${type.price}${type.active ? '' : ' · inactivo'}</span></td>
      <td><div class="row">
        <button class="secondary small" data-toggle-type="${type.id}" data-active="${type.active}">${type.active ? 'Desactivar' : 'Activar'}</button>
        <button class="danger small" data-delete-type="${type.id}">Borrar</button>
      </div></td>
    </tr>`).join('')}</table>` : '<p class="muted">Agrega tu primer tipo de consulta.</p>';
}

async function loadAvailability() {
  const list = await api('/api/availability', { auth: true });
  $('availability').innerHTML = list.length ? `<table>${list.map((block) => `
    <tr>
      <td>${days[block.dayOfWeek]}</td><td>${block.startTime} – ${block.endTime}</td>
      <td><button class="danger small" data-delete-availability="${block.id}">Quitar</button></td>
    </tr>`).join('')}</table>` : '<p class="muted">Agrega tus horarios de atención.</p>';
}

document.querySelectorAll('[data-tab]').forEach((tab) => tab.addEventListener('click', () => {
  $('login-form').classList.toggle('hidden', tab.dataset.tab !== 'login');
  $('register-form').classList.toggle('hidden', tab.dataset.tab !== 'register');
}));

$('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const result = await api('/api/auth/login', { method: 'POST', body: { email: $('login-email').value, password: $('login-password').value } });
    setToken(result.token);
    $('message').className = 'hidden';
    showDashboard();
  } catch (error) { fail(error); }
});

$('register-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const result = await api('/api/auth/register', {
      method: 'POST',
      body: { name: $('reg-name').value, specialty: $('reg-specialty').value, email: $('reg-email').value, password: $('reg-password').value }
    });
    setToken(result.token);
    $('message').className = 'hidden';
    showDashboard();
  } catch (error) { fail(error); }
});

$('logout').addEventListener('click', () => { setToken(null); disconnectLive(); showAuth(); });

$('google-link').addEventListener('click', async () => {
  try {
    const { url } = await api('/api/auth/google/link', { method: 'POST', auth: true });
    location.href = url;
  } catch (error) { fail(error); }
});

$('copy-link').addEventListener('click', () => navigator.clipboard?.writeText($('public-link').textContent));

$('type-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await api('/api/appointment-types', {
      method: 'POST', auth: true,
      body: {
        name: $('type-name').value,
        durationMinutes: Number($('type-duration').value),
        price: Number($('type-price').value),
        preparationNotes: $('type-notes').value || undefined
      }
    });
    event.target.reset();
    loadTypes();
  } catch (error) { fail(error); }
});

$('availability-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await api('/api/availability', {
      method: 'POST', auth: true,
      body: { dayOfWeek: Number($('av-day').value), startTime: $('av-start').value, endTime: $('av-end').value }
    });
    loadAvailability();
  } catch (error) { fail(error); }
});

$('dashboard').addEventListener('click', async (event) => {
  const { cancel, toggleType, active, deleteType, deleteAvailability } = event.target.dataset;
  try {
    if (cancel && confirm('¿Cancelar esta cita?')) {
      await api(`/api/appointments/${cancel}/status`, { method: 'PATCH', auth: true, body: { status: 'cancelled' } });
      loadAppointments();
    } else if (toggleType) {
      await api(`/api/appointment-types/${toggleType}`, { method: 'PATCH', auth: true, body: { active: active !== 'true' } });
      loadTypes();
    } else if (deleteType && confirm('¿Borrar este tipo de consulta?')) {
      await api(`/api/appointment-types/${deleteType}`, { method: 'DELETE', auth: true });
      loadTypes();
    } else if (deleteAvailability) {
      await api(`/api/availability/${deleteAvailability}`, { method: 'DELETE', auth: true });
      loadAvailability();
    }
  } catch (error) { fail(error); }
});

$('av-day').innerHTML = days.slice(1).map((day, index) => `<option value="${index + 1}">${day}</option>`).join('');
readGoogleRedirect();
getToken() ? showDashboard() : showAuth();
