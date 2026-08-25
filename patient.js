const toast = document.querySelector('#toast');
document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="patient-video.css">');
function showToast(message) { toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2200); }
async function loadPatient() {
  const response = await fetch('/api/patient/profile');
  if (!response.ok) { window.location.href = '/'; return; }
  const { profile } = await response.json();
  document.querySelector('#patientName').textContent = profile.name;
  document.querySelector('#dataName').textContent = profile.name;
  document.querySelector('#dataEmail').textContent = profile.email;
}
document.querySelector('#joinCall').addEventListener('click', () => { window.location.href = '/video.html'; });
document.querySelector('#logout').addEventListener('click', async () => { await fetch('/api/logout', { method: 'POST' }); window.location.href = '/'; });
document.querySelector('#editData').addEventListener('click', async () => {
  const name = window.prompt('Имя и фамилия', document.querySelector('#dataName').textContent);
  if (!name) return;
  const response = await fetch('/api/patient/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
  showToast(response.ok ? 'Данные сохранены' : 'Не удалось сохранить данные');
  if (response.ok) loadPatient();
});
loadPatient();
