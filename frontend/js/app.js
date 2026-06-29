const state = {
  user: null,
  sanggahan: [],
  stats: null,
  adminFilters: {
    month: '',
    status: '',
    search: ''
  }
};

const qs = (selector) => document.querySelector(selector);
const qsa = (selector) => [...document.querySelectorAll(selector)];

function showToast(message, type = 'info') {
  const toast = qs('#toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  setTimeout(() => toast.classList.add('hidden'), 3600);
}

function statusClass(status) {
  return String(status || '').toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
}

function safeText(value) {
  return String(value ?? '').replace(/[&<>"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  }[char]));
}

function shortText(value, length = 90) {
  const text = String(value || '-');
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

function fileLinks(item) {
  const bukti = item.buktiDukungUrl
    ? `<a href="${safeText(item.buktiDukungUrl)}" target="_blank" rel="noopener">Bukti</a>`
    : '-';
  const surat = item.suratPernyataanUrl
    ? `<a href="${safeText(item.suratPernyataanUrl)}" target="_blank" rel="noopener">Surat</a>`
    : '-';
  return `${bukti}<br>${surat}`;
}

function showPage(isLoggedIn) {
  qs('#loginPage').classList.toggle('hidden', isLoggedIn);
  qs('#appPage').classList.toggle('hidden', !isLoggedIn);
}

function updateShellForUser() {
  const user = state.user;
  if (!user) return;
  qs('#currentUserName').textContent = user.fullName || user.username;
  qs('#currentUserRole').textContent = user.role;
  qs('#welcomeTitle').textContent = user.role === 'admin' ? 'Dashboard Admin' : 'Dashboard User';
  qs('#userMenuButton').classList.toggle('hidden', user.role !== 'user');
  qs('#adminMenuButton').classList.toggle('hidden', user.role !== 'admin');

  if (user.role === 'admin') {
    activateSection('dashboardSection');
  } else {
    activateSection('userSection');
  }
}

function activateSection(sectionId) {
  qsa('.content-section').forEach((section) => section.classList.remove('active'));
  qsa('.nav-link').forEach((button) => button.classList.remove('active'));
  qs(`#${sectionId}`).classList.add('active');
  const button = qsa('.nav-link').find((item) => item.dataset.target === sectionId);
  if (button) button.classList.add('active');
}

async function login(event) {
  event.preventDefault();
  const payload = {
    username: qs('#loginUsername').value.trim(),
    password: qs('#loginPassword').value,
    role: qs('#loginRole').value
  };

  try {
    const result = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    setSession(result.token, result.user);
    state.user = result.user;
    showPage(true);
    updateShellForUser();
    await loadInitialData();
    showToast('Login berhasil.');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function logout() {
  clearSession();
  state.user = null;
  state.sanggahan = [];
  showPage(false);
  qs('#loginForm').reset();
}

async function restoreSession() {
  const token = getToken();
  const storedUser = getStoredUser();
  if (!token || !storedUser) return showPage(false);

  try {
    const result = await apiRequest('/auth/me');
    state.user = result.user;
    setSession(token, result.user);
    showPage(true);
    updateShellForUser();
    await loadInitialData();
  } catch (error) {
    clearSession();
    showPage(false);
  }
}

async function loadInitialData() {
  if (state.user.role === 'admin') {
    await Promise.all([loadAdminStats(), loadAdminTable()]);
  } else {
    await Promise.all([loadUserTable(), loadUserStats()]);
  }
}

async function loadUserStats() {
  const result = await apiRequest('/sanggah');
  const records = result.data || [];
  const menunggu = records.filter((item) => item.status === 'Menunggu').length;
  const disetujui = records.filter((item) => item.status === 'Disetujui').length;
  const ditolak = records.filter((item) => item.status === 'Ditolak').length;
  renderStats([
    ['Total Sanggahan Saya', records.length],
    ['Menunggu', menunggu],
    ['Disetujui', disetujui],
    ['Ditolak', ditolak]
  ]);
  qs('#systemInfo').textContent = 'User dapat membuat sanggahan baru serta mengedit atau menghapus data selama status masih Menunggu.';
}

async function loadAdminStats() {
  const month = state.adminFilters.month || new Date().toISOString().slice(0, 7);
  const result = await apiRequest(`/admin/dashboard?month=${encodeURIComponent(month)}`);
  state.stats = result;
  renderStats([
    ['Total Semua Data', result.total],
    [`Total Bulan ${result.month}`, result.monthlyTotal],
    ['Menunggu Bulan Ini', result.monthlyStatusCounts?.Menunggu || 0],
    ['Disetujui Bulan Ini', result.monthlyStatusCounts?.Disetujui || 0]
  ]);
  qs('#systemInfo').textContent = result.googleSheetsEnabled
    ? 'Google Sheets aktif. Setiap bulan akan dibuat sebagai tab/sheet tersendiri saat ada data pada bulan tersebut.'
    : 'Google Sheets belum dikonfigurasi. Data tetap tersimpan lokal dan file upload masuk folder storage/uploads.';
}

function renderStats(items) {
  qs('#dashboardCards').innerHTML = items.map(([label, value]) => `
    <article class="stat-card">
      <span>${safeText(label)}</span>
      <strong>${safeText(value)}</strong>
    </article>
  `).join('');
}

async function submitSanggahan(event) {
  event.preventDefault();
  const form = qs('#sanggahForm');
  const editId = qs('#editId').value;
  const formData = new FormData();

  ['namaLengkap', 'nip', 'hariDisanggah', 'tanggalDisanggah', 'alasanSanggahan'].forEach((field) => {
    formData.append(field, qs(`#${field}`).value.trim());
  });

  const buktiFile = qs('#buktiDukung').files[0];
  const suratFile = qs('#suratPernyataan').files[0];
  if (buktiFile) formData.append('buktiDukung', buktiFile);
  if (suratFile) formData.append('suratPernyataan', suratFile);

  try {
    const path = editId ? `/sanggah/${editId}` : '/sanggah';
    const method = editId ? 'PUT' : 'POST';
    await apiRequest(path, { method, body: formData });
    showToast(editId ? 'Data berhasil diperbarui.' : 'Sanggahan berhasil dikirim.');
    resetSanggahForm();
    await Promise.all([loadUserTable(), loadUserStats()]);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function resetSanggahForm() {
  qs('#sanggahForm').reset();
  qs('#editId').value = '';
  qs('#formTitle').textContent = 'Form Sanggahan Absensi';
  qs('#submitSanggahButton').textContent = 'Kirim Sanggahan';
  qs('#cancelEditButton').classList.add('hidden');
  qs('#buktiDukung').required = true;
  qs('#suratPernyataan').required = true;
}

async function loadUserTable() {
  const result = await apiRequest('/sanggah');
  state.sanggahan = result.data || [];
  const tbody = qs('#userTableBody');
  if (state.sanggahan.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Belum ada sanggahan.</td></tr>`;
    return;
  }

  tbody.innerHTML = state.sanggahan.map((item) => `
    <tr>
      <td>${safeText(item.id)}</td>
      <td>${safeText(item.tanggalDisanggah)}</td>
      <td>${safeText(item.hariDisanggah)}</td>
      <td title="${safeText(item.alasanSanggahan)}">${safeText(shortText(item.alasanSanggahan))}</td>
      <td>${fileLinks(item)}</td>
      <td><span class="status ${statusClass(item.status)}">${safeText(item.status)}</span></td>
      <td>
        <div class="row-actions">
          <button class="btn ghost" data-action="edit-user" data-id="${safeText(item.id)}" ${item.status !== 'Menunggu' ? 'disabled' : ''}>Edit</button>
          <button class="btn danger" data-action="delete" data-id="${safeText(item.id)}" ${item.status !== 'Menunggu' ? 'disabled' : ''}>Hapus</button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function loadAdminTable() {
  const params = new URLSearchParams();
  if (state.adminFilters.month) params.set('month', state.adminFilters.month);
  if (state.adminFilters.status) params.set('status', state.adminFilters.status);
  if (state.adminFilters.search) params.set('search', state.adminFilters.search);

  const result = await apiRequest(`/sanggah?${params.toString()}`);
  state.sanggahan = result.data || [];
  const tbody = qs('#adminTableBody');
  if (state.sanggahan.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="empty-state">Tidak ada data sesuai filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = state.sanggahan.map((item) => `
    <tr>
      <td>${safeText(item.id)}</td>
      <td>${safeText(item.namaLengkap)}</td>
      <td>${safeText(item.nip)}</td>
      <td>${safeText(item.hariDisanggah)}</td>
      <td>${safeText(item.tanggalDisanggah)}</td>
      <td title="${safeText(item.alasanSanggahan)}">${safeText(shortText(item.alasanSanggahan, 70))}</td>
      <td>${fileLinks(item)}</td>
      <td><span class="status ${statusClass(item.status)}">${safeText(item.status)}</span></td>
      <td>${safeText(shortText(item.catatanAdmin || '-', 70))}</td>
      <td>
        <div class="row-actions">
          <button class="btn ghost" data-action="status" data-id="${safeText(item.id)}">Status</button>
          <button class="btn danger" data-action="delete" data-id="${safeText(item.id)}">Hapus</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function fillUserEditForm(id) {
  const item = state.sanggahan.find((record) => record.id === id);
  if (!item) return;

  qs('#editId').value = item.id;
  qs('#namaLengkap').value = item.namaLengkap || '';
  qs('#nip').value = item.nip || '';
  qs('#hariDisanggah').value = item.hariDisanggah || '';
  qs('#tanggalDisanggah').value = item.tanggalDisanggah || '';
  qs('#alasanSanggahan').value = item.alasanSanggahan || '';
  qs('#formTitle').textContent = `Edit Sanggahan ${item.id}`;
  qs('#submitSanggahButton').textContent = 'Simpan Perubahan';
  qs('#cancelEditButton').classList.remove('hidden');
  qs('#buktiDukung').required = false;
  qs('#suratPernyataan').required = false;
  activateSection('userSection');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openStatusDialog(id) {
  const item = state.sanggahan.find((record) => record.id === id);
  if (!item) return;
  qs('#statusEditId').value = item.id;
  qs('#statusInput').value = item.status || 'Menunggu';
  qs('#catatanAdminInput').value = item.catatanAdmin || '';
  qs('#statusDialog').showModal();
}

async function saveStatus(event) {
  event.preventDefault();
  const id = qs('#statusEditId').value;
  const payload = {
    status: qs('#statusInput').value,
    catatanAdmin: qs('#catatanAdminInput').value.trim()
  };

  try {
    await apiRequest(`/sanggah/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    qs('#statusDialog').close();
    showToast('Status berhasil diperbarui.');
    await Promise.all([loadAdminStats(), loadAdminTable()]);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function deleteRecord(id) {
  const confirmed = window.confirm('Hapus data sanggahan ini?');
  if (!confirmed) return;

  try {
    await apiRequest(`/sanggah/${id}`, { method: 'DELETE' });
    showToast('Data berhasil dihapus.');
    if (state.user.role === 'admin') await Promise.all([loadAdminStats(), loadAdminTable()]);
    else await Promise.all([loadUserTable(), loadUserStats()]);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function downloadExcel() {
  const params = new URLSearchParams();
  if (state.adminFilters.month) params.set('month', state.adminFilters.month);
  if (state.adminFilters.status) params.set('status', state.adminFilters.status);
  if (state.adminFilters.search) params.set('search', state.adminFilters.search);

  try {
    const response = await apiRequest(`/admin/export?${params.toString()}`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const suffix = state.adminFilters.month || 'semua-data';
    link.href = url;
    link.download = `rekap-e-sanggah-${suffix}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function applyAdminFilter() {
  state.adminFilters = {
    month: qs('#filterMonth').value,
    status: qs('#filterStatus').value,
    search: qs('#filterSearch').value.trim()
  };
  Promise.all([loadAdminStats(), loadAdminTable()]).catch((error) => showToast(error.message, 'error'));
}

function setupEvents() {
  qs('#loginForm').addEventListener('submit', login);
  qs('#logoutButton').addEventListener('click', logout);
  qs('#sanggahForm').addEventListener('submit', submitSanggahan);
  qs('#cancelEditButton').addEventListener('click', resetSanggahForm);
  qs('#refreshUserButton').addEventListener('click', () => Promise.all([loadUserTable(), loadUserStats()]));
  qs('#applyFilterButton').addEventListener('click', applyAdminFilter);
  qs('#downloadButton').addEventListener('click', downloadExcel);
  qs('#statusForm').addEventListener('submit', saveStatus);
  qs('#closeDialogButton').addEventListener('click', () => qs('#statusDialog').close());

  qsa('.nav-link').forEach((button) => {
    button.addEventListener('click', () => activateSection(button.dataset.target));
  });

  document.body.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    const id = button.dataset.id;
    if (action === 'edit-user') fillUserEditForm(id);
    if (action === 'status') openStatusDialog(id);
    if (action === 'delete') deleteRecord(id);
  });
}

function initDefaults() {
  qs('#filterMonth').value = new Date().toISOString().slice(0, 7);
  state.adminFilters.month = qs('#filterMonth').value;
}

document.addEventListener('DOMContentLoaded', () => {
  setupEvents();
  initDefaults();
  restoreSession();
});
