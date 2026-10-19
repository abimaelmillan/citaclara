const token = decodeURIComponent(location.pathname.split('/').pop());
const $ = (id) => document.getElementById(id);
const statusLabels = { scheduled: 'Programada', completed: 'Atendida', cancelled: 'Cancelada', no_show: 'No asistió' };
let appointment = null;

function render() {
  const { professional, appointmentType } = appointment;
  $('type-name').textContent = appointmentType.name;
  $('status').textContent = statusLabels[appointment.status];
  $('status').className = `badge ${appointment.status}`;
  $('when').textContent = formatDateTime(appointment.startAt, professional.timezone);
  $('with').textContent = `${professional.name} · ${professional.specialty}`;
  $('preparation').textContent = appointmentType.preparationNotes ? `Indicaciones: ${appointmentType.preparationNotes}` : '';
  const active = appointment.status === 'scheduled' && new Date(appointment.startAt) > new Date();
  $('actions').classList.toggle('hidden', !active);
  if (!active) $('reschedule').classList.add('hidden');
  $('detail').classList.remove('hidden');
}

async function load() {
  try {
    appointment = await api(`/api/public/appointments/${encodeURIComponent(token)}`);
    render();
  } catch (error) {
    showMessage($('message'), error.message);
  }
}

async function loadSlots() {
  $('slots').innerHTML = '';
  $('slots-hint').textContent = 'Buscando horarios...';
  try {
    const { professional, appointmentType } = appointment;
    const result = await api(`/api/public/professionals/${professional.slug}/slots?appointmentTypeId=${appointmentType.id}&date=${$('date').value}`);
    $('slots-hint').textContent = result.slots.length ? 'Toca un horario para confirmarlo:' : 'No hay horarios disponibles ese día.';
    $('slots').innerHTML = result.slots.map((slot) => `<button class="slot" data-start="${slot.startAt}">${slot.time}</button>`).join('');
  } catch (error) {
    $('slots-hint').textContent = error.message;
  }
}

$('cancel').addEventListener('click', async () => {
  if (!confirm('¿Seguro que quieres cancelar tu cita?')) return;
  try {
    appointment = await api(`/api/public/appointments/${encodeURIComponent(token)}/cancel`, { method: 'PATCH' });
    showMessage($('message'), 'Tu cita fue cancelada.', 'success');
    render();
  } catch (error) {
    showMessage($('message'), error.message);
  }
});

$('show-reschedule').addEventListener('click', () => {
  $('reschedule').classList.remove('hidden');
  $('date').min = todayIso();
  $('date').value = todayIso();
  loadSlots();
});

$('date').addEventListener('change', loadSlots);

$('slots').addEventListener('click', async (event) => {
  const button = event.target.closest('.slot');
  if (!button) return;
  try {
    appointment = await api(`/api/public/appointments/${encodeURIComponent(token)}/reschedule`, {
      method: 'PATCH',
      body: { startAt: button.dataset.start }
    });
    showMessage($('message'), 'Tu cita fue reprogramada.', 'success');
    $('reschedule').classList.add('hidden');
    render();
  } catch (error) {
    showMessage($('message'), error.message);
    loadSlots();
  }
});

load();
