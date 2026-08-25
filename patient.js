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
document.querySelector('#editData').addEventListener('click', () => showToast('Редактирование будет доступно после подключения медицинской БД'));
loadPatient();
