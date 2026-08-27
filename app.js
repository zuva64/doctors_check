
let users = [];
const table = document.querySelector('#userTable');
const emptyState = document.querySelector('#emptyState');
const search = document.querySelector('#search');
const roleFilter = document.querySelector('#roleFilter');
const statusFilter = document.querySelector('#statusFilter');
const modal = document.querySelector('#modal');
const toast = document.querySelector('#toast');

function initials(name) {
	return name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function escapeHtml(value) {
	return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function csvCell(value) {
	let text = String(value ?? '');
	if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
	return `"${text.replace(/"/g, '""')}"`;
}

function renderUsers() {
	const query = search.value.toLowerCase().trim();
	const filtered = users.filter((user) => {
		const matchesText = `${user.name} ${user.email}`.toLowerCase().includes(query);
		return matchesText && (roleFilter.value === 'all' || user.role === roleFilter.value) && (statusFilter.value === 'all' || user.status === statusFilter.value);
	});
	table.innerHTML = filtered.map((user, index) => {
		const name = escapeHtml(user.name);
		const email = escapeHtml(user.email);
		const role = escapeHtml(user.role);
		const status = escapeHtml(user.status);
		const lastLogin = escapeHtml(user.lastLogin);
		return `<tr><td><input type="checkbox" aria-label="Выбрать ${name}"></td><td class="user-cell"><span class="user-avatar avatar-${index % 5}">${escapeHtml(initials(user.name))}</span><span>${name}<small>${email}</small></span></td><td class="role">${role}</td><td><span class="status ${user.status === 'Ожидает активации' ? 'pending' : user.status === 'Заблокирован' ? 'blocked' : ''}">${status}</span></td><td>${lastLogin}</td><td><button class="row-menu" aria-label="Действия для ${name}">•••</button></td></tr>`;
	}).join('');
	emptyState.style.display = filtered.length ? 'none' : 'block';
	document.querySelector('#resultCount').textContent = `Показано ${filtered.length} из ${users.length} пользователей`;
	document.querySelector('#userCount').textContent = users.length;
	document.querySelector('#totalUsers').textContent = users.length;
	document.querySelector('#pendingUsers').textContent = users.filter((user) => user.status === 'Ожидает активации').length;
	document.querySelector('#blockedUsers').textContent = users.filter((user) => user.status === 'Заблокирован').length;
}

function showToast(message) { toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2200); }
function closeModal() { modal.classList.remove('open'); }

[search, roleFilter, statusFilter].forEach((control) => control.addEventListener('input', renderUsers));
document.querySelector('#resetFilters').addEventListener('click', () => { search.value = ''; roleFilter.value = 'all'; statusFilter.value = 'all'; renderUsers(); });
document.querySelector('#selectAll').addEventListener('change', (event) => { table.querySelectorAll('input[type="checkbox"]').forEach((box) => { box.checked = event.target.checked; }); });
document.querySelector('#addUser').addEventListener('click', () => modal.classList.add('open'));
document.querySelector('#closeModal').addEventListener('click', closeModal);
document.querySelector('#cancelModal').addEventListener('click', closeModal);
modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
document.querySelector('#userForm').addEventListener('submit', (event) => {
	event.preventDefault();
	const form = new FormData(event.target);
	fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.get('name'), email: form.get('email'), role: form.get('role') }) }).then(async (response) => {
		if (!response.ok) throw new Error((await response.json()).error || 'Не удалось создать пользователя');
		users = await (await fetch('/api/users')).json();
		event.target.reset(); closeModal(); renderUsers(); showToast('Пользователь добавлен и приглашение отправлено');
	}).catch((error) => showToast(error.message));
});
document.querySelector('#exportUsers').addEventListener('click', () => {
	const csv = ['Имя,Email,Роль,Статус,Последний вход', ...users.map((user) => [user.name, user.email, user.role, user.status, user.lastLogin].map(csvCell).join(','))].join('\n');
	const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
	const link = document.createElement('a'); link.href = url; link.download = 'medlink-users.csv'; link.click(); URL.revokeObjectURL(url); showToast('CSV-файл подготовлен');
});

async function loadUsers() {
	const response = await fetch('/api/users');
	if (response.status === 401 || response.status === 403) throw new Error('Нет доступа');
	if (!response.ok) throw new Error('Не удалось загрузить пользователей');
	users = await response.json();
	renderUsers();
}

async function checkSession() {
	const response = await fetch('/api/session');
	if (!response.ok) return;
	const account = await response.json();
	if (account.role === 'doctor') { window.location.href = '/doctor.html'; return; }
	if (account.role === 'patient') { window.location.href = '/patient.html'; return; }
	if (account.role !== 'admin') { await fetch('/api/logout', { method: 'POST' }); return; }
	document.querySelector('#authScreen').classList.add('hidden');
	await loadUsers();
}

document.querySelector('#loginForm').addEventListener('submit', async (event) => {
	event.preventDefault();
	const form = new FormData(event.target);
	const response = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) });
	if (!response.ok) { const payload = await response.json().catch(() => ({})); document.querySelector('#authError').textContent = payload.error || 'Неверный email или пароль'; return; }
	const account = await response.json();
	if (account.role === 'doctor') { window.location.href = '/doctor.html'; return; }
	if (account.role === 'patient') { window.location.href = '/patient.html'; return; }
	if (account.role !== 'admin') { document.querySelector('#authError').textContent = 'Нет доступа к административной панели'; await fetch('/api/logout', { method: 'POST' }); return; }
	document.querySelector('#authError').textContent = '';
	document.querySelector('#authScreen').classList.add('hidden');
	await loadUsers();
});
document.querySelector('#logout').addEventListener('click', async () => { await fetch('/api/logout', { method: 'POST' }); window.location.reload(); });
checkSession().catch((error) => { document.querySelector('#authError').textContent = error.message; document.querySelector('#authScreen').classList.remove('hidden'); });
