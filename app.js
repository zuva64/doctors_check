const defaultUsers = [
	['Анна Крылова', 'anna.krylova@medlink.ru', 'Врач', 'Активен', 'Сегодня, 09:42'],
	['Дмитрий Орлов', 'dmitry.orlov@medlink.ru', 'Администратор', 'Активен', 'Сегодня, 09:18'],
	['Мария Волкова', 'maria.volkova@medlink.ru', 'Врач', 'Активен', 'Вчера, 18:36'],
	['Ирина Белова', 'irina.belova@medlink.ru', 'Регистратура', 'Ожидает активации', 'Никогда'],
	['Сергей Павлов', 'sergey.pavlov@medlink.ru', 'Врач', 'Заблокирован', '22 апр. 2024'],
	['Ольга Соколова', 'olga.sokolova@medlink.ru', 'Регистратура', 'Активен', '21 апр. 2024']
];
const users = JSON.parse(localStorage.getItem('medlink-users') || 'null') || defaultUsers.map((user) => ({ name: user[0], email: user[1], role: user[2], status: user[3], lastLogin: user[4] }));
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
	users.unshift({ name: form.get('name'), email: form.get('email'), role: form.get('role'), status: 'Ожидает активации', lastLogin: 'Никогда' });
	localStorage.setItem('medlink-users', JSON.stringify(users));
	event.target.reset(); closeModal(); renderUsers(); showToast('Пользователь добавлен и приглашение отправлено');
});
document.querySelector('#exportUsers').addEventListener('click', () => {
	const csv = ['Имя,Email,Роль,Статус,Последний вход', ...users.map((user) => [user.name, user.email, user.role, user.status, user.lastLogin].map((value) => `"${value}"`).join(','))].join('\n');
	const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = 'medlink-users.csv'; link.click(); URL.revokeObjectURL(link.href); showToast('CSV-файл подготовлен');
});
renderUsers();
