document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="profile.css">');
const form = document.querySelector('#profileForm');
const saveButton = document.querySelector('#save');
const saveStatus = document.querySelector('#saveStatus');
let accountRole = null;

function setStatus(message, error = false) { saveStatus.textContent = message; saveStatus.className = `save-status ${error ? 'error' : ''}`; }
function initials(name) { return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(); }

async function loadProfile() {
  const sessionResponse = await fetch('/api/session');
  if (!sessionResponse.ok) { window.location.href = '/'; return; }
  const session = await sessionResponse.json();
  accountRole = session.role;
  const endpoint = accountRole === 'doctor' ? '/api/doctor/profile' : '/api/patient/profile';
  const response = await fetch(endpoint);
  if (!response.ok) throw new Error('Не удалось загрузить профиль');
  const { profile } = await response.json();
  document.querySelector('#name').value = profile.name || '';
  document.querySelector('#email').value = profile.email || '';
  document.querySelector('#editorAvatar').textContent = initials(profile.name || '');
  document.querySelector('#backLink').href = accountRole === 'doctor' ? '/doctor.html' : '/patient.html';
  document.querySelector('#cancel').href = document.querySelector('#backLink').href;
  if (accountRole === 'doctor') {
    document.querySelector('#specialty').value = profile.specialty || '';
    document.querySelector('#phone').value = profile.phone || '';
    document.querySelector('#license').textContent = profile.license || '—';
    document.querySelector('#experience').textContent = profile.experience || '—';
  } else {
    document.querySelector('.doctor-fields').hidden = true;
    document.querySelector('#profileSubtitle').textContent = 'Обновите имя, которое отображается в вашем кабинете.';
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  saveButton.disabled = true; setStatus('Сохранение...');
  const data = Object.fromEntries(new FormData(form));
  const endpoint = accountRole === 'doctor' ? '/api/doctor/profile' : '/api/patient/profile';
  const response = await fetch(endpoint, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const result = await response.json().catch(() => ({}));
  saveButton.disabled = false;
  if (!response.ok) { setStatus(result.error || 'Не удалось сохранить изменения', true); return; }
  setStatus('Изменения сохранены');
  setTimeout(() => { window.location.href = document.querySelector('#backLink').href; }, 650);
});

document.querySelector('#logout').addEventListener('click', async () => { await fetch('/api/logout', { method: 'POST' }); window.location.href = '/'; });
loadProfile().catch((error) => setStatus(error.message, true));
