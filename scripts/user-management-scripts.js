(function() {

/* ── State ──────────────────────────────────────────────────── */
const PAGE_SIZE = 10;
let usersCurrentPage = 1;
let allUsers   = [];
let filteredUsers = [];

const container  = document.querySelector('[data-emp-id]');
const myEmpId    = container?.dataset.empId || '';
const myRole     = container?.dataset.role  || 'user';

const IT_DEPT = 'Information Technology Department - LRN';

const ROLE_LABELS = {
    super_admin: 'Super Admin',
    admin:       'Admin',
    editor:      'Editor',
    user:        'User'
};

const ROLE_STYLES = {
    super_admin: 'text-amber-700 bg-amber-50 border-amber-200',
    admin:       'text-indigo-700 bg-indigo-50 border-indigo-200',
    editor:      'text-violet-700 bg-violet-50 border-violet-200',
    user:        'text-zinc-600 bg-zinc-50 border-zinc-200'
};

/* ── Load Users ─────────────────────────────────────────────── */
async function loadUsers() {
    const body    = document.getElementById('users-table-body');
    const loading = document.getElementById('users-table-loading');
    const empty   = document.getElementById('users-table-empty');

    loading.classList.remove('hidden');
    loading.classList.add('flex');
    empty.classList.add('hidden');
    empty.classList.remove('flex');

    body.querySelectorAll('.user-row').forEach(r => r.remove());

    try {
        const res  = await fetch('./API/get-users-api.php');
        const data = await res.json();

        loading.classList.add('hidden');
        loading.classList.remove('flex');

        if (!data.success || !data.data.length) {
            empty.classList.remove('hidden');
            empty.classList.add('flex');
            allUsers = [];
            filteredUsers = [];
            updatePagination([]);
            return;
        }

        allUsers = data.data;
        applySearch();

    } catch (err) {
        console.error('Error loading users:', err);
        loading.classList.add('hidden');
        loading.classList.remove('flex');
        empty.classList.remove('hidden');
        empty.classList.add('flex');
    }
}

/* ── Search ─────────────────────────────────────────────────── */
function applySearch() {
    const q = (document.getElementById('users-search')?.value || '').toLowerCase().trim();
    if (!q) {
        filteredUsers = [...allUsers];
    } else {
        filteredUsers = allUsers.filter(u => {
            const name = `${u.FirstName || ''} ${u.MiddleName || ''} ${u.LastName || ''}`.toLowerCase();
            const id   = (u.biometrics_id || '').toLowerCase();
            const dept = (u.Department || '').toLowerCase();
            const role = (ROLE_LABELS[u.role] || u.role || '').toLowerCase();
            return name.includes(q) || id.includes(q) || dept.includes(q) || role.includes(q);
        });
    }
    usersCurrentPage = 1;
    renderUsers(filteredUsers);
}

document.getElementById('users-search')?.addEventListener('input', applySearch);

/* ── Render ─────────────────────────────────────────────────── */
function renderUsers(users) {
    const body  = document.getElementById('users-table-body');
    const empty = document.getElementById('users-table-empty');

    body.querySelectorAll('.user-row').forEach(r => r.remove());

    const start = (usersCurrentPage - 1) * PAGE_SIZE;
    const page  = users.slice(start, start + PAGE_SIZE);

    if (page.length === 0) {
        empty.classList.remove('hidden');
        empty.classList.add('flex');
        updatePagination(users);
        return;
    }

    empty.classList.add('hidden');
    empty.classList.remove('flex');

    page.forEach(u => {
        const name      = `${u.FirstName || ''} ${u.LastName || ''}`.trim() || '—';
        const dept      = u.Department || '—';
        const roleLabel = ROLE_LABELS[u.role] || u.role;
        const roleStyle = ROLE_STYLES[u.role] || ROLE_STYLES.user;
        const isSelf    = (u.biometrics_id == myEmpId);

        const row = document.createElement('div');
        row.className = 'user-row grid grid-cols-12 items-center w-full px-5 py-3 border-b border-zinc-100 gap-3 hover:bg-zinc-50/50 transition-colors';

        row.innerHTML = `
            <div class="col-span-2 flex items-center gap-2">
                <div class="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-500 text-white text-[10px] font-bold select-none overflow-hidden border border-indigo-500">
                    <img src="http://10.2.0.8/lrnph/emp_photos/${u.EmployeeID}.jpg" alt=""
                         onerror="this.style.display='none'; this.parentElement.textContent='${(u.FirstName?.[0] || '') + (u.LastName?.[0] || '')}'">
                </div>
                <p class="text-xs font-mono font-medium text-zinc-500">${u.biometrics_id || '—'}</p>
            </div>
            <div class="col-span-3">
                <p class="text-xs font-semibold text-zinc-700">${name}${isSelf ? ' <span class="text-[9px] text-indigo-400 font-medium">(You)</span>' : ''}</p>
            </div>
            <div class="col-span-4">
                <p class="text-xs font-medium text-zinc-500 truncate">${dept}</p>
            </div>
            <div class="col-span-2">
                <span class="text-[10px] font-semibold px-2.5 py-1 rounded-full border ${roleStyle}">${roleLabel}</span>
            </div>
            <div class="col-span-1 flex items-center justify-end gap-3">
                ${buildActionButtons(u, isSelf)}
            </div>
        `;
        body.appendChild(row);
    });

    updatePagination(users);
}

/* ── Action Buttons ─────────────────────────────────────────── */
function buildActionButtons(user, isSelf) {
    if (isSelf) return '<span class="text-[10px] text-zinc-300">—</span>';

    if (user.role === 'super_admin' && myRole !== 'super_admin') {
        return '<span class="text-[10px] text-zinc-300">—</span>';
    }

    if (user.role === 'admin' && myRole === 'admin') {
        return '<span class="text-[10px] text-zinc-300">—</span>';
    }

    let html = '';

    if (user.role !== 'super_admin') {
        html += `<button onclick="changeUserRole(${user.id}, '${user.role}', '${(user.Department || '').replace(/'/g, "\\'")}')"
                    class="text-zinc-400 hover:text-indigo-500 transition-colors cursor-pointer" title="Change Role">
                    <i class="fa-solid fa-pen-to-square text-xs"></i>
                 </button>`;
    }

    if (myRole === 'super_admin' && user.role === 'admin' && user.Department === IT_DEPT) {
        html += `<button onclick="transferSuperAdmin(${user.id}, '${(user.FirstName || '')} ${(user.LastName || '')}')"
                    class="text-zinc-400 hover:text-amber-500 transition-colors cursor-pointer" title="Transfer Super Admin">
                    <i class="fa-solid fa-crown text-xs"></i>
                 </button>`;
    }

    if (user.role !== 'super_admin') {
        html += `<button onclick="deleteUser(${user.id}, '${(user.FirstName || '')} ${(user.LastName || '')}')"
                    class="text-zinc-400 hover:text-red-500 transition-colors cursor-pointer" title="Remove User">
                    <i class="fa-solid fa-trash-can text-xs"></i>
                 </button>`;
    }

    return html || '<span class="text-[10px] text-zinc-300">—</span>';
}

/* ── Pagination ─────────────────────────────────────────────── */
function updatePagination(users) {
    const pag = document.getElementById('users-pagination');
    if (users.length <= PAGE_SIZE) {
        pag.classList.add('hidden');
        pag.classList.remove('flex');
        return;
    }
    pag.classList.remove('hidden');
    pag.classList.add('flex');

    const total      = users.length;
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const start      = (usersCurrentPage - 1) * PAGE_SIZE + 1;
    const end        = Math.min(usersCurrentPage * PAGE_SIZE, total);

    document.getElementById('users-page-info').textContent = `Showing ${start}–${end} of ${total}`;
    document.getElementById('users-prev').disabled = usersCurrentPage <= 1;
    document.getElementById('users-next').disabled = usersCurrentPage >= totalPages;

    const btnsEl = document.getElementById('users-page-btns');
    btnsEl.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = i === usersCurrentPage
            ? 'flex items-center justify-center w-8 h-8 text-xs font-bold text-white bg-indigo-500 rounded-lg cursor-pointer'
            : 'flex items-center justify-center w-8 h-8 text-xs font-medium text-zinc-500 hover:bg-zinc-100 rounded-lg cursor-pointer';
        btn.addEventListener('click', () => usersPageChange(i));
        btnsEl.appendChild(btn);
    }
}

function usersPageChange(page) {
    const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);
    if (page < 1 || page > totalPages) return;
    usersCurrentPage = page;
    renderUsers(filteredUsers);
}

/* ── Add User Modal ─────────────────────────────────────────── */
let selectedEmployee = null;
let empSearchTimer   = null;

function openAddUserModal() {
    selectedEmployee = null;
    document.getElementById('emp-search-input').value = '';
    document.getElementById('emp-search-dropdown').classList.add('hidden');
    document.getElementById('selected-emp-info').classList.add('hidden');
    document.getElementById('role-hint').textContent = '';

    // Always populate all available roles upfront — selectEmployee will filter later
    const roleSelect = document.getElementById('add-user-role');
    roleSelect.innerHTML = '<option value="">Select a role…</option>';

    if (myRole === 'super_admin') {
        roleSelect.innerHTML += '<option value="admin">Admin</option>';
        roleSelect.innerHTML += '<option value="editor">Editor</option>';
        roleSelect.innerHTML += '<option value="user">User</option>';
    } else if (myRole === 'admin') {
        roleSelect.innerHTML += '<option value="editor">Editor</option>';
        roleSelect.innerHTML += '<option value="user">User</option>';
    }

    const modal = document.getElementById('add-user-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    setTimeout(() => document.getElementById('emp-search-input').focus(), 100);
}

function closeAddUserModal() {
    const modal = document.getElementById('add-user-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    selectedEmployee = null;
}

/* ── Employee Search Dropdown ───────────────────────────────── */
document.getElementById('emp-search-input')?.addEventListener('input', (e) => {
    clearTimeout(empSearchTimer);
    const query = e.target.value.trim();
    if (query.length < 2) {
        document.getElementById('emp-search-dropdown').classList.add('hidden');
        return;
    }
    empSearchTimer = setTimeout(() => searchEmployees(query), 300);
});

async function searchEmployees(query) {
    const dropdown = document.getElementById('emp-search-dropdown');
    try {
        const res  = await fetch(`./API/search-employees-api.php?search=${encodeURIComponent(query)}`);
        const data = await res.json();

        if (!data.success || !data.data.length) {
            dropdown.innerHTML = '<div class="px-4 py-3 text-xs text-zinc-400 font-medium">No employees found</div>';
            dropdown.classList.remove('hidden');
            return;
        }

        dropdown.innerHTML = '';
        data.data.forEach(emp => {
            const name = `${emp.LastName}, ${emp.FirstName}${emp.MiddleName ? ' ' + emp.MiddleName[0] + '.' : ''}`;
            const opt  = document.createElement('div');
            opt.className = 'flex items-center justify-between px-4 py-2.5 hover:bg-indigo-50 cursor-pointer transition-colors';
            opt.innerHTML = `
                <div class="flex items-center gap-2">
                    <div class="flex items-center h-8 w-8 rounded-full bg-indigo-500 overflow-hidden border border-indigo-500">
                        <img src="http://10.2.0.8/lrnph/emp_photos/${emp.EmployeeID}.jpg" alt=""
                            onerror="this.style.display='none'; this.parentElement.textContent='${(emp.FirstName?.[0] || '') + (emp.LastName?.[0] || '')}'">
                    </div>
                    <div class="flex flex-col">
                        <p class="text-xs font-semibold text-zinc-700">${name}</p>
                        <p class="text-[10px] text-zinc-400 font-medium">${emp.Department || '—'}</p>
                    </div>
                </div>
                <p class="text-[10px] text-zinc-400 font-mono">${emp.EmployeeID}</p>
            `;
            opt.addEventListener('click', () => selectEmployee(emp));
            dropdown.appendChild(opt);
        });
        dropdown.classList.remove('hidden');

    } catch (err) {
        console.error('Employee search error:', err);
    }
}

function selectEmployee(emp) {
    selectedEmployee = emp;
    const name = `${emp.FirstName} ${emp.LastName}`;
    document.getElementById('selected-emp-name').textContent = name;
    document.getElementById('selected-emp-id').textContent   = emp.EmployeeID;
    document.getElementById('selected-emp-dept').textContent = emp.Department || '—';
    document.getElementById('selected-emp-biometrics').value = emp.BiometricsID;

    document.getElementById('selected-emp-info').classList.remove('hidden');
    document.getElementById('emp-search-dropdown').classList.add('hidden');
    document.getElementById('emp-search-input').value = name;

    const hint       = document.getElementById('role-hint');
    const roleSelect = document.getElementById('add-user-role');

    // Reset all options and hint
    Array.from(roleSelect.options).forEach(opt => opt.disabled = false);
    roleSelect.value = '';
    hint.textContent = '';
    hint.className   = 'text-[10px] font-medium';

    // Only super_admin has department-based restrictions
    if (myRole === 'super_admin') {
        if (emp.Department === IT_DEPT) {
            // IT dept — Admin only
            Array.from(roleSelect.options).forEach(opt => {
                if (opt.value === 'editor' || opt.value === 'user') opt.disabled = true;
            });
            hint.textContent = 'IT Department — Admin role only.';
            hint.classList.add('text-green-400');
        } else {
            // Non-IT dept — Editor and User only
            Array.from(roleSelect.options).forEach(opt => {
                if (opt.value === 'admin') opt.disabled = true;
            });
            hint.textContent = 'Non-IT Department — Editor or User role only.';
            hint.classList.add('text-amber-400');
        }
    } else if (myRole === 'admin') {
        // Admin cannot change roles for IT dept employees at all
        if (emp.Department === IT_DEPT) {
            Swal.fire({ icon: 'warning', title: 'Restricted', text: 'Only Super Admin can manage IT Department users.' }).then(() => {
                clearSelectedEmployee();
            });
            return;
        }
        roleOptions.editor = 'Editor';
        roleOptions.user   = 'User';
    }
}

function clearSelectedEmployee() {
    selectedEmployee = null;
    document.getElementById('selected-emp-info').classList.add('hidden');
    document.getElementById('emp-search-input').value = '';
    document.getElementById('role-hint').textContent  = '';

    // Reset role options
    const roleSelect = document.getElementById('add-user-role');
    Array.from(roleSelect.options).forEach(opt => opt.disabled = false);
    roleSelect.value = '';

    document.getElementById('emp-search-input').focus();
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
    if (!e.target.closest('#emp-search-input') && !e.target.closest('#emp-search-dropdown')) {
        document.getElementById('emp-search-dropdown')?.classList.add('hidden');
    }
});

/* ── Submit Add User ────────────────────────────────────────── */
async function submitAddUser() {
    if (!selectedEmployee) {
        Swal.fire({ icon: 'warning', title: 'No Employee Selected', text: 'Please search and select an employee first.' });
        return;
    }

    const role = document.getElementById('add-user-role').value;
    if (!role) {
        Swal.fire({ icon: 'warning', title: 'No Role Selected', text: 'Please select a role for this user.' });
        return;
    }

    const btn      = document.getElementById('add-user-submit-btn');
    const original = btn.innerHTML;
    btn.disabled   = true;
    btn.innerHTML  = '<i class="fa-solid fa-spinner fa-spin text-xs"></i> Adding...';

    try {
        const formData = new FormData();
        formData.append('action', 'add');
        formData.append('biometrics_id', selectedEmployee.BiometricsID);
        formData.append('role', role);

        const res  = await fetch('./API/manage-user-api.php', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success) {
            Swal.fire({ icon: 'success', title: 'User Added', text: data.message, confirmButtonColor: '#6366f1', timer: 1500, showConfirmButton: false });
            closeAddUserModal();
            loadUsers();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: data.message });
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Network error. Please try again.' });
    } finally {
        btn.disabled  = false;
        btn.innerHTML = original;
    }
}

/* ── Change Role ────────────────────────────────────────────── */
async function changeUserRole(userId, currentRole, department) {
    const roleOptions = {};

    if (myRole === 'super_admin') {
        // Department restriction applies for super_admin
        if (department === IT_DEPT) {
            roleOptions.admin = 'Admin';
        } else {
            roleOptions.editor = 'Editor';
            roleOptions.user   = 'User';
        }
    } else if (myRole === 'admin') {
        // No department restriction for admin
        roleOptions.editor = 'Editor';
        roleOptions.user   = 'User';
    }

    // Remove current role from options
    delete roleOptions[currentRole];

    if (Object.keys(roleOptions).length === 0) {
        Swal.fire({ icon: 'info', title: 'No Available Roles', text: 'There are no other roles you can assign to this user.' });
        return;
    }

    const { value: newRole } = await Swal.fire({
        title: 'Change Role',
        input: 'select',
        inputOptions: roleOptions,
        inputPlaceholder: 'Select new role',
        showCancelButton: true,
        confirmButtonText: 'Update',
        confirmButtonColor: '#6366f1',
        inputValidator: (value) => { if (!value) return 'Please select a role.'; }
    });

    if (!newRole) return;

    try {
        const formData = new FormData();
        formData.append('action', 'update_role');
        formData.append('id', userId);
        formData.append('role', newRole);

        const res  = await fetch('./API/manage-user-api.php', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success) {
            Swal.fire({ icon: 'success', title: 'Role Updated', text: data.message, confirmButtonColor: '#6366f1', timer: 1500, showConfirmButton: false });
            loadUsers();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: data.message });
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Network error.' });
    }
}

/* ── Delete User ────────────────────────────────────────────── */
async function deleteUser(userId, userName) {
    const result = await Swal.fire({
        title: 'Remove User',
        html: `Are you sure you want to remove <b>${userName}</b>?<br><span class="text-xs text-zinc-400">They will lose access to the system.</span>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Remove',
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280'
    });

    if (!result.isConfirmed) return;

    try {
        const formData = new FormData();
        formData.append('action', 'delete');
        formData.append('id', userId);

        const res  = await fetch('./API/manage-user-api.php', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success) {
            Swal.fire({ icon: 'success', title: 'User Removed', text: data.message, confirmButtonColor: '#6366f1', timer: 1500, showConfirmButton: false });
            loadUsers();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: data.message });
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Network error.' });
    }
}

/* ── Transfer Super Admin ───────────────────────────────────── */
async function transferSuperAdmin(userId, userName) {
    const result = await Swal.fire({
        title: 'Transfer Super Admin',
        html: `Transfer Super Admin role to <b>${userName}</b>?<br><span class="text-xs text-red-400 font-medium">You will be demoted to Admin. This cannot be undone.</span>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Transfer',
        confirmButtonColor: '#f59e0b',
        cancelButtonColor: '#6b7280',
        input: 'text',
        inputPlaceholder: 'Type "CONFIRM" to proceed',
        inputValidator: (value) => {
            if (value !== 'CONFIRM') return 'Please type CONFIRM to proceed.';
        }
    });

    if (!result.isConfirmed) return;

    try {
        const formData = new FormData();
        formData.append('action', 'transfer');
        formData.append('id', userId);

        const res  = await fetch('./API/manage-user-api.php', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success) {
            await Swal.fire({ icon: 'success', title: 'Transferred', text: data.message, confirmButtonColor: '#6366f1' });
            window.location.reload();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: data.message });
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Network error.' });
    }
}

/* ── Expose Globals ─────────────────────────────────────────── */
window.loadUsers             = loadUsers;
window.usersPageChange       = usersPageChange;
window.openAddUserModal      = openAddUserModal;
window.closeAddUserModal     = closeAddUserModal;
window.clearSelectedEmployee = clearSelectedEmployee;
window.submitAddUser         = submitAddUser;
window.changeUserRole        = changeUserRole;
window.deleteUser            = deleteUser;
window.transferSuperAdmin    = transferSuperAdmin;
window.usersCurrentPage      = usersCurrentPage;

// Close modal on backdrop click
document.getElementById('add-user-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeAddUserModal();
});

/* ── Initial Load ───────────────────────────────────────────── */
loadUsers();

})();