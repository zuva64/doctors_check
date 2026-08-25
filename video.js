document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="patient-video.css">');
const connectionText = document.querySelector('#connectionText');
const stateText = document.querySelector('#participantState');
const roomTimer = document.querySelector('#roomTimer');
let viewer = 'patient';
let currentRoom = null;
let timer = null;
function api(action) { return fetch('/api/video/room', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) }).then((response) => response.json()); }
function renderRoom(room) {
  currentRoom = room;
  const both = room.doctorJoined && room.patientJoined;
  connectionText.textContent = both ? 'Врач и пациент подключены к видеоприему' : room.doctorJoined ? 'Врач уже в комнате, подключитесь к приему' : 'Ожидание подключения врача';
  stateText.textContent = both ? 'Оба участника видят этот экран одновременно' : 'Видеоприем начнется после подключения обоих участников';
  document.querySelector('#mic').classList.toggle('muted', !room.micOn);
  document.querySelector('#camera').classList.toggle('muted', !room.cameraOn);
  if (room.startedAt && !timer) { timer = setInterval(() => { roomTimer.textContent = new Date(Math.max(0, Date.now() - room.startedAt)).toISOString().substring(14, 19); }, 1000); }
}
async function init() {
  const session = await fetch('/api/session');
  if (!session.ok) { window.location.href = '/'; return; }
  const data = await session.json(); viewer = data.role;
  const room = await (await fetch('/api/video/room')).json(); renderRoom(room);
  await renderRoom(await api('join'));
  setInterval(async () => renderRoom(await (await fetch('/api/video/room')).json()), 1500);
}
document.querySelector('#mic').addEventListener('click', async () => renderRoom(await api('toggle-mic')));
document.querySelector('#camera').addEventListener('click', async () => renderRoom(await api('toggle-camera')));
document.querySelector('#end').addEventListener('click', async () => { await api('end'); window.location.href = viewer === 'doctor' ? '/doctor.html' : '/patient.html'; });
document.querySelector('#leave').addEventListener('click', async () => { await api('leave'); window.location.href = viewer === 'doctor' ? '/doctor.html' : '/patient.html'; });
init().catch(() => { window.location.href = '/'; });
