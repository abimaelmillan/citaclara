const slug = decodeURIComponent(location.pathname.split('/').pop());
const state = { profile: null, typeId: null, startAt: null };
const $ = (id) => document.getElementById(id);

async function loadProfile() {
  try {
    state.profile = await api(`/api/public/professionals/${encodeURIComponent(slug)}`);
  } catch (error) {
    showMessage($('message'), error.message);
    return;
  }
  $('professional-name').textContent = state.profile.name;
  $('professional-specialty').textContent = state.profile.specialty;
  $('types').innerHTML = state.profile.appointmentTypes.map((type) => `
    <button type="button" class="option" data-id="${type.id}">
      <strong>${escapeHtml(type.name)}</strong><br>
      <span class="muted">${type.durationMinutes} min · $${type.price}</span>
    </button>`).join('');
  $('date').min = todayIso();
  $('date').value = todayIso();
  $('booking').classList.remove('hidden');
}

async function loadSlots() {
  state.startAt = null;
  updateSubmit();
  if (!state.typeId || !$('date').value) return;
  $('slots-hint').textContent = 'Buscando horarios...';
  $('slots').innerHTML = '';
  try {
    const result = await api(`/api/public/professionals/${encodeURIComponent(slug)}/slots?appointmentTypeId=${state.typeId}&date=${$('date').value}`);
    $('slots-hint').textContent = result.slots.length ? 'Horarios disponibles:' : 'No hay horarios disponibles ese día.';
    $('slots').innerHTML = result.slots.map((slot) =>
      `<button type="button" class="slot" data-start="${slot.startAt}">${slot.time}</button>`).join('');
  } catch (error) {
    $('slots-hint').textContent = error.message;
  }
}

function updateSubmit() {
  $('submit').disabled = !(state.typeId && state.startAt);
}

$('types').addEventListener('click', (event) => {
  const button = event.target.closest('.option');
  if (!button) return;
  document.querySelectorAll('.option').forEach((option) => option.classList.toggle('selected', option === button));
  state.typeId = button.dataset.id;
  loadSlots();
});

$('date').addEventListener('change', loadSlots);

$('slots').addEventListener('click', (event) => {
  const button = event.target.closest('.slot');
  if (!button) return;
  document.querySelectorAll('.slot').forEach((slot) => slot.classList.toggle('selected', slot === button));
  state.startAt = button.dataset.start;
  updateSubmit();
});

$('patient-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  $('submit').disabled = true;
  try {
    const result = await api(`/api/public/professionals/${encodeURIComponent(slug)}/appointments`, {
      method: 'POST',
      body: {
        appointmentTypeId: state.typeId,
        startAt: state.startAt,
        patient: { name: $('name').value, email: $('email').value, phone: $('phone').value },
        notes: $('notes').value || undefined
      }
    });
    const { appointment } = result;
    $('confirmation-detail').innerHTML = `<strong>${escapeHtml(appointment.appointmentType.name)}</strong> con ${escapeHtml(appointment.professional.name)}<br>${formatDateTime(appointment.startAt, state.profile.timezone)}`;
    $('confirmation-notes').textContent = appointment.appointmentType.preparationNotes
      ? `Indicaciones: ${appointment.appointmentType.preparationNotes}` : '';
    $('manage-link').href = `/cita/${result.manageToken}`;
    $('booking').classList.add('hidden');
    $('confirmation').classList.remove('hidden');
  } catch (error) {
    showMessage($('message'), error.message);
    if (error.status === 409) loadSlots();
    updateSubmit();
  }
});

loadProfile();
