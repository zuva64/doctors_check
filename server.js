const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const port = Number(process.env.PORT || 8000);
const root = __dirname;
const sessions = new Map();
const seedUsers = [
  { id: 1, name: 'Анна Крылова', email: 'anna.krylova@medlink.ru', role: 'Врач', status: 'Активен', lastLogin: 'Сегодня, 09:42', password: 'DoctorDemo123!' },
  { id: 2, name: 'Дмитрий Орлов', email: 'dmitry.orlov@medlink.ru', role: 'Администратор', status: 'Активен', lastLogin: 'Сегодня, 09:18' },
  { id: 3, name: 'Мария Волкова', email: 'maria.volkova@medlink.ru', role: 'Врач', status: 'Активен', lastLogin: 'Вчера, 18:36' },
  { id: 4, name: 'Ирина Белова', email: 'irina.belova@medlink.ru', role: 'Регистратура', status: 'Ожидает активации', lastLogin: 'Никогда' },
  { id: 5, name: 'Сергей Павлов', email: 'sergey.pavlov@medlink.ru', role: 'Врач', status: 'Заблокирован', lastLogin: '22 апр. 2024' },
  { id: 6, name: 'Ольга Соколова', email: 'olga.sokolova@medlink.ru', role: 'Регистратура', status: 'Активен', lastLogin: '21 апр. 2024' }
];

function hashPassword(password, salt) { return crypto.scryptSync(password, salt, 64).toString('hex'); }
const db = new DatabaseSync(path.join(root, 'medlink.sqlite'));
db.exec(`CREATE TABLE IF NOT EXISTS accounts (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, role TEXT NOT NULL, status TEXT NOT NULL, last_login TEXT NOT NULL, password_hash TEXT NOT NULL, password_salt TEXT NOT NULL); CREATE TABLE IF NOT EXISTS profiles (account_id INTEGER PRIMARY KEY, specialty TEXT, phone TEXT, license TEXT, experience TEXT, rating TEXT, FOREIGN KEY(account_id) REFERENCES accounts(id));`);
const insertAccount = db.prepare('INSERT OR IGNORE INTO accounts (id,name,email,role,status,last_login,password_hash,password_salt) VALUES (?,?,?,?,?,?,?,?)');
const demoAccounts = [
  { ...seedUsers[0], email: 'anna.krylova@medlink.ru', password: process.env.DOCTOR_PASSWORD || 'DoctorDemo123!' },
  { ...seedUsers[1], password: process.env.ADMIN_PASSWORD || 'ChangeMe123!' },
  { ...seedUsers[2] }, { ...seedUsers[3] }, { ...seedUsers[4] }, { ...seedUsers[5] },
  { id: 7, name: 'Елена Смирнова', email: 'elena.smirnova@medlink.ru', role: 'Пациент', status: 'Активен', lastLogin: 'Сегодня, 09:40', password: process.env.PATIENT_PASSWORD || 'PatientDemo123!' }
];
for (const account of demoAccounts) { const salt = `${account.email}-salt`; insertAccount.run(account.id, account.name, account.email, account.role, account.status, account.lastLogin, hashPassword(account.password || crypto.randomBytes(32).toString('hex'), salt), salt); }
db.prepare('INSERT OR IGNORE INTO profiles (account_id,specialty,phone,license,experience,rating) VALUES (1,?,?,?,?,?)').run('Терапевт', '+7 (999) 123-45-67', 'ЛИЦ-77-01-012345', '8 лет', '4.9');
const admin = { email: process.env.ADMIN_EMAIL || 'admin@medlink.ru' };
const doctor = { email: 'anna.krylova@medlink.ru' };
const patient = { email: 'elena.smirnova@medlink.ru' };
const doctorProfile = { name: 'Анна Крылова', specialty: 'Терапевт', email: doctor.email, phone: '+7 (999) 123-45-67', license: 'ЛИЦ-77-01-012345', experience: '8 лет', rating: '4.9', todayAppointments: 4 };
const doctorAppointments = [
  { time: '10:30', duration: '25 мин', patient: 'Елена Смирнова', type: 'Контрольное посещение', status: 'Сейчас', initials: 'ЕС', tone: 'pink' },
  { time: '11:15', duration: '30 мин', patient: 'Илья Петров', type: 'Первичный прием', status: 'Через 45 мин', initials: 'ИП', tone: 'yellow' },
  { time: '12:00', duration: '25 мин', patient: 'Мария Волкова', type: 'Результаты анализов', status: 'Через 1 ч 30 мин', initials: 'МВ', tone: 'blue' },
  { time: '14:30', duration: '40 мин', patient: 'Алексей Соколов', type: 'Консультация', status: 'Через 4 ч', initials: 'АС', tone: 'violet' }
];
const patientProfile = { name: 'Елена Смирнова', email: patient.email, doctor: 'Анна Крылова', specialty: 'Терапевт', appointment: 'Сегодня, 10:30', type: 'Контрольное посещение' };
const videoRoom = { active: false, doctorJoined: false, patientJoined: false, micOn: true, cameraOn: true, startedAt: null };

function sendJson(response, status, body, headers = {}) { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers }); response.end(JSON.stringify(body)); }
function parseCookies(request) { return Object.fromEntries((request.headers.cookie || '').split(';').filter(Boolean).map((item) => item.trim().split('='))); }
function currentSession(request) { const token = parseCookies(request).medlink_session; return token && sessions.get(token); }
function requireAdmin(request, response) { const session = currentSession(request); if (!session || session.role !== 'admin') { sendJson(response, 401, { error: 'Требуется авторизация' }); return null; } return session; }
function readBody(request) { return new Promise((resolve, reject) => { let body = ''; request.on('data', (chunk) => { body += chunk; if (body.length > 100000) request.destroy(); }); request.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch (error) { reject(error); } }); request.on('error', reject); }); }
function safeEqual(left, right) { const a = Buffer.from(left); const b = Buffer.from(right); return a.length === b.length && crypto.timingSafeEqual(a, b); }
function serveStatic(request, response) { const requested = request.url === '/' ? '/index.html' : request.url; const filePath = path.normalize(path.join(root, requested)); if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return sendJson(response, 404, { error: 'Не найдено' }); const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' }; response.writeHead(200, { 'Content-Type': types[path.extname(filePath)] || 'application/octet-stream' }); fs.createReadStream(filePath).pipe(response); }

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === 'POST' && request.url === '/api/login') {
      const body = await readBody(request);
      const email = String(body.email || '').toLowerCase();
      const account = db.prepare('SELECT * FROM accounts WHERE lower(email)=?').get(email);
      if (!account || !safeEqual(hashPassword(String(body.password || ''), account.password_salt), account.password_hash)) return sendJson(response, 401, { error: 'Неверный email или пароль' });
      const role = account.role === 'Администратор' ? 'admin' : account.role === 'Врач' ? 'doctor' : account.role === 'Пациент' ? 'patient' : 'staff';
      const token = crypto.randomBytes(32).toString('hex'); sessions.set(token, { role, email: account.email, accountId: account.id, createdAt: Date.now() });
      return sendJson(response, 200, { email: account.email, role }, { 'Set-Cookie': `medlink_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800` });
    }
    if (request.method === 'POST' && request.url === '/api/logout') { const token = parseCookies(request).medlink_session; sessions.delete(token); return sendJson(response, 200, { ok: true }, { 'Set-Cookie': 'medlink_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' }); }
    if (request.method === 'GET' && request.url === '/api/session') { const session = currentSession(request); return session ? sendJson(response, 200, { email: session.email, role: session.role }) : sendJson(response, 401, { error: 'Требуется авторизация' }); }
    if (request.method === 'GET' && request.url === '/api/users') { if (!requireAdmin(request, response)) return; return sendJson(response, 200, db.prepare('SELECT id,name,email,role,status,last_login AS lastLogin FROM accounts ORDER BY id').all()); }
    if (request.method === 'GET' && request.url === '/api/doctor/profile') {
      const session = currentSession(request);
      if (!session || session.role !== 'doctor') return sendJson(response, 403, { error: 'Доступ только для врача' });
      const profile = db.prepare('SELECT a.name,a.email,p.specialty,p.phone,p.license,p.experience,p.rating FROM accounts a JOIN profiles p ON p.account_id=a.id WHERE a.id=?').get(session.accountId);
      return sendJson(response, 200, { profile: { ...profile, todayAppointments: 4 }, appointments: doctorAppointments });
    }
    if (request.method === 'GET' && request.url === '/api/patient/profile') {
      const session = currentSession(request);
      if (!session || session.role !== 'patient') return sendJson(response, 403, { error: 'Доступ только для пациента' });
      const profile = db.prepare('SELECT name,email FROM accounts WHERE id=?').get(session.accountId);
      return sendJson(response, 200, { profile: { ...patientProfile, ...profile } });
    }
    if (request.method === 'PUT' && request.url === '/api/doctor/profile') {
      const session = currentSession(request); if (!session || session.role !== 'doctor') return sendJson(response, 403, { error: 'Доступ только для врача' });
      const body = await readBody(request); if (!body.name || !body.phone || !body.specialty) return sendJson(response, 400, { error: 'Имя, специальность и телефон обязательны' });
      db.prepare('UPDATE accounts SET name=? WHERE id=?').run(body.name.trim(), session.accountId); db.prepare('UPDATE profiles SET specialty=?,phone=? WHERE account_id=?').run(body.specialty.trim(), body.phone.trim(), session.accountId);
      return sendJson(response, 200, { ok: true });
    }
    if (request.method === 'PUT' && request.url === '/api/patient/profile') {
      const session = currentSession(request); if (!session || session.role !== 'patient') return sendJson(response, 403, { error: 'Доступ только для пациента' });
      const body = await readBody(request); if (!body.name) return sendJson(response, 400, { error: 'Имя обязательно' });
      db.prepare('UPDATE accounts SET name=? WHERE id=?').run(body.name.trim(), session.accountId); return sendJson(response, 200, { ok: true });
    }
    if (request.method === 'GET' && request.url === '/api/video/room') {
      const session = currentSession(request);
      if (!session || !['doctor', 'patient'].includes(session.role)) return sendJson(response, 403, { error: 'Нет доступа к видеоприему' });
      return sendJson(response, 200, { ...videoRoom, viewer: session.role });
    }
    if (request.method === 'POST' && request.url === '/api/video/room') {
      const session = currentSession(request);
      if (!session || !['doctor', 'patient'].includes(session.role)) return sendJson(response, 403, { error: 'Нет доступа к видеоприему' });
      const body = await readBody(request);
      if (body.action === 'join') { videoRoom[`${session.role}Joined`] = true; videoRoom.active = true; videoRoom.startedAt ||= Date.now(); }
      if (body.action === 'leave') { videoRoom[`${session.role}Joined`] = false; if (!videoRoom.doctorJoined && !videoRoom.patientJoined) { videoRoom.active = false; videoRoom.startedAt = null; } }
      if (body.action === 'toggle-mic') videoRoom.micOn = !videoRoom.micOn;
      if (body.action === 'toggle-camera') videoRoom.cameraOn = !videoRoom.cameraOn;
      if (body.action === 'end' && session.role === 'doctor') { videoRoom.active = false; videoRoom.doctorJoined = false; videoRoom.patientJoined = false; videoRoom.startedAt = null; }
      return sendJson(response, 200, { ...videoRoom, viewer: session.role });
    }
    if (request.method === 'POST' && request.url === '/api/users') {
      if (!requireAdmin(request, response)) return;
      const body = await readBody(request);
      if (!body.name || !body.email || !['Врач', 'Администратор', 'Регистратура'].includes(body.role)) return sendJson(response, 400, { error: 'Заполните корректные данные пользователя' });
      if (db.prepare('SELECT id FROM accounts WHERE lower(email)=?').get(body.email.toLowerCase())) return sendJson(response, 409, { error: 'Пользователь с таким email уже существует' });
      const salt = crypto.randomBytes(16).toString('hex'); const id = Number(db.prepare('SELECT COALESCE(MAX(id),0)+1 AS id FROM accounts').get().id);
      insertAccount.run(id, body.name.trim(), body.email.trim().toLowerCase(), body.role, 'Ожидает активации', 'Никогда', hashPassword(crypto.randomBytes(18).toString('base64'), salt), salt);
      return sendJson(response, 201, db.prepare('SELECT id,name,email,role,status,last_login AS lastLogin FROM accounts WHERE id=?').get(id));
    }
    return serveStatic(request, response);
  } catch (error) { console.error(error); sendJson(response, 500, { error: 'Внутренняя ошибка сервера' }); }
});
server.listen(port, () => console.log(`MedLink server listening on http://localhost:${port}`));
