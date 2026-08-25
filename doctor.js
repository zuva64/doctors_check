const appointmentsRoot = document.querySelector('#doctorAppointments');
const toast = document.querySelector('#toast');

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2400);
}

function renderAppointments(appointments) {
  appointmentsRoot.innerHTML = appointments.map((appointment, index) => `<button class="doctor-appointment ${index === 0 ? 'current' : ''}" data-index="${index}"><span class="doctor-time">${appointment.time}<small>${appointment.duration}</small></span><span class="mini-avatar ${appointment.tone}">${appointment.initials}</span><span class="patient-summary"><strong>${appointment.patient}</strong><small>${appointment.type}</small></span><span class="appointment-status">${appointment.status}</span><span class="chevron">›</span></button>`).join('');
  appointmentsRoot.querySelectorAll('.doctor-appointment').forEach((appointment) => appointment.addEventListener('click', () => {
    appointmentsRoot.querySelectorAll('.doctor-appointment').forEach((item) => item.classList.remove('current'));
    appointment.classList.add('current');
    showToast(`Открыта карта пациента: ${appointment.querySelector('strong').textContent}`);
  }));
}

async function loadProfile() {
  const response = await fetch('/api/doctor/profile');
  if (response.status === 401 || response.status === 403) { window.location.href = '/'; return; }
  const data = await response.json();
  document.querySelectorAll('#doctorName, #profileName').forEach((element) => { element.textContent = data.profile.name; });
  document.querySelector('#doctorSpecialty').textContent = data.profile.specialty;
  document.querySelector('#profileSpecialty').textContent = `Врач-${data.profile.specialty.toLowerCase()}`;
  document.querySelector('#doctorRating').textContent = data.profile.rating;
  document.querySelector('#todayCount').textContent = data.profile.todayAppointments;
  renderAppointments(data.appointments);
}

document.querySelector('#logout').addEventListener('click', async () => { await fetch('/api/logout', { method: 'POST' }); window.location.href = '/'; });
document.querySelector('#startNext').addEventListener('click', () => { window.location.href = '/video.html'; });
document.querySelector('#editProfile').addEventListener('click', () => { window.location.href = '/profile.html'; });
loadProfile().catch(() => { window.location.href = '/'; });
