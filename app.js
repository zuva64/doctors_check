const patients = [
  { name: 'Елена Смирнова', note: 'Жалобы на периодическую усталость. Рекомендовано контролировать режим сна и питьевой баланс.' },
  { name: 'Илья Петров', note: 'Первичный прием. Заполнить анамнез и уточнить список принимаемых препаратов.' },
  { name: 'Мария Волкова', note: 'Ожидаются результаты общего анализа крови и биохимии.' },
  { name: 'Алексей Соколов', note: 'Консультация по результатам последнего обследования.' }
];

const appointments = document.querySelectorAll('.appointment');
const videoPatient = document.querySelector('#videoPatient');
const stagePatient = document.querySelector('#stagePatient');
const noteText = document.querySelector('#noteText');
const timer = document.querySelector('#timer');
let seconds = 0;
let callActive = true;

appointments.forEach((appointment) => {
  appointment.addEventListener('click', () => {
    const patient = patients[Number(appointment.dataset.patient)];
    appointments.forEach((item) => item.classList.remove('active'));
    appointment.classList.add('active');
    videoPatient.textContent = patient.name;
    stagePatient.textContent = patient.name;
    noteText.textContent = patient.note;
  });
});

setInterval(() => {
  if (!callActive) return;
  seconds += 1;
  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
  const remainder = String(seconds % 60).padStart(2, '0');
  timer.textContent = `${minutes}:${remainder}`;
}, 1000);

document.querySelector('#endCall').addEventListener('click', (event) => {
  callActive = !callActive;
  event.currentTarget.textContent = callActive ? '☎' : '▶';
  document.querySelector('.live-dot').innerHTML = callActive ? '<span></span>Видеоприем' : '<span style="background:#e5a45b"></span>Прием на паузе';
});

document.querySelector('#micButton').addEventListener('click', (event) => {
  event.currentTarget.classList.toggle('muted');
  event.currentTarget.textContent = event.currentTarget.classList.contains('muted') ? '♪' : '♩';
});

document.querySelector('#cameraButton').addEventListener('click', (event) => {
  event.currentTarget.classList.toggle('muted');
  document.querySelector('.patient-photo').style.opacity = event.currentTarget.classList.contains('muted') ? '0.25' : '1';
});

document.querySelector('#editNote').addEventListener('click', () => {
  const nextNote = window.prompt('Изменить заметку', noteText.textContent);
  if (nextNote) noteText.textContent = nextNote;
});

document.querySelector('#saveNote').addEventListener('click', (event) => {
  event.currentTarget.textContent = 'Сохранено';
  setTimeout(() => { event.currentTarget.textContent = 'Сохранить'; }, 1400);
});
