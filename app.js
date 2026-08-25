
let users = [];
const table = document.querySelector('#userTable');
const emptyState = document.querySelector('#emptyState');
const search = document.querySelector('#search');
const roleFilter = document.querySelector('#roleFilter');
const statusFilter = document.querySelector('#statusFilter');
const modal = document.querySelector('#modal');
const toast = document.querySelector('#toast');

function initials(name) {
	return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function renderUsers() {
	const query = search.value.toLowerCase().trim();
	const filtered = users.filter((user) => {
		const matchesText = `${user.name} ${user.email}`.toLowerCase().includes(query);
		return matchesText && (roleFilter.value === 'all' || user.role === roleFilter.value) && (statusFilter.value === 'all' || user.status === statusFilter.value);
	});
	table.innerHTML = filtered.map((user, index) => `<tr><td><input type="checkbox" aria-label="Выбрать ${user.name}"></td><td class="user-cell"><span class="user-avatar avatar-${index % 5}">${initials(user.name)}</span><span>${user.name}<small>${user.email}</small></span></td><td class="role">${user.role}</td><td><span class="status ${user.status === 'Ожидает активации' ? 'pending' : user.status === 'Заблокирован' ? 'blocked' : ''}">${user.status}</span></td><td>${user.lastLogin}</td><td><button class="row-menu" aria-label="Действия для ${user.name}">•••</button></td></tr>`).join('');
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
	const csv = ['Имя,Email,Роль,Статус,Последний вход', ...users.map((user) => [user.name, user.email, user.role, user.status, user.lastLogin].map((value) => `"${value}"`).join(','))].join('\n');
	const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = 'medlink-users.csv'; link.click(); URL.revokeObjectURL(link.href); showToast('CSV-файл подготовлен');
});

async function loadUsers() {
	const response = await fetch('/api/users');
	if (response.status === 401 || response.status === 403) throw new Error('Нет доступа');
	users = await response.json();
	renderUsers();
}

async function checkSession() {
	const response = await fetch('/api/session');
	if (response.ok) {
		document.querySelector('#authScreen').classList.add('hidden');
		await loadUsers();
	}
}

document.querySelector('#loginForm').addEventListener('submit', async (event) => {
	event.preventDefault();
	const form = new FormData(event.target);
	const response = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) });
	if (!response.ok) { document.querySelector('#authError').textContent = 'Неверный email или пароль'; return; }
	const account = await response.json();
	if (account.role === 'doctor') { window.location.href = '/doctor.html'; return; }
	if (account.role === 'patient') { window.location.href = '/patient.html'; return; }
	document.querySelector('#authError').textContent = '';
	document.querySelector('#authScreen').classList.add('hidden');
	await loadUsers();
});
document.querySelector('#logout').addEventListener('click', async () => { await fetch('/api/logout', { method: 'POST' }); window.location.reload(); });
checkSession().catch(() => document.querySelector('#authScreen').classList.remove('hidden'));
