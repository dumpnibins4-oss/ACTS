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
                <div class="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-500 text-white text-xs font-bold select-none overflow-hidden border border-indigo-500">
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
                <span class="text-xs font-semibold px-2.5 py-1 rounded-full border ${roleStyle}">${roleLabel}</span>
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
    if (isSelf) return '<span class="text-xs text-zinc-300">—</span>';

    if (user.role === 'super_admin' && myRole !== 'super_admin') {
        return '<span class="text-xs text-zinc-300">—</span>';
    }

    if (user.role === 'admin' && myRole === 'admin') {
        return '<span class="text-xs text-zinc-300">—</span>';
    }

    let html = '';

    if (user.role !== 'super_admin') {
        const uName = `${(user.FirstName || '')} ${(user.LastName || '')}`.trim().replace(/'/g, "\\'");
        const uInit = `${(user.FirstName?.[0] || '')}${(user.LastName?.[0] || '')}`;
        const uEmpId = (user.EmployeeID || '').replace(/'/g, "\\'");
        if (user.Department !== "Information Technology Department - LRN") {
            html += `<button onclick="changeUserRole(${user.id}, '${user.role}', '${(user.Department || '').replace(/'/g, "\\'")  }', '${uName}', '${uEmpId}', '${uInit}')"
                        class="text-zinc-400 hover:text-indigo-500 transition-colors cursor-pointer" title="Change Role">
                        <i class="fa-solid fa-pen-to-square text-xs"></i>
                     </button>`;
        }
    }

    if (myRole === 'super_admin' && user.role === 'admin' && user.Department === IT_DEPT) {
        html += `<button onclick="transferSuperAdmin(${user.id}, '${(user.FirstName || '')} ${(user.LastName || '')}')"
                    class="text-zinc-400 hover:text-amber-500 transition-colors cursor-pointer" title="Transfer Super Admin">
                    <i class="fa-solid fa-crown text-xs"></i>
                 </button>`;
    }

    if (user.role !== 'super_admin') {
        const dName = `${(user.FirstName || '')} ${(user.LastName || '')}`.trim().replace(/'/g, "\\'");
        const dInit = `${(user.FirstName?.[0] || '')}${(user.LastName?.[0] || '')}`;
        const dEmpId = (user.EmployeeID || '').replace(/'/g, "\\'");
        html += `<button onclick="deleteUser(${user.id}, '${dName}', '${user.role}', '${dEmpId}', '${dInit}')"
                    class="text-zinc-400 hover:text-red-500 transition-colors cursor-pointer" title="Remove User">
                    <i class="fa-solid fa-trash-can text-xs"></i>
                 </button>`;
    }

    return html || '<span class="text-xs text-zinc-300">—</span>';
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
    window.usersCurrentPage = page;
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
                        <p class="text-xs text-zinc-400 font-medium">${emp.Department || '—'}</p>
                    </div>
                </div>
                <p class="text-xs text-zinc-400 font-mono">${emp.EmployeeID}</p>
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
    hint.className   = 'text-xs font-medium';

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
            toast.warning('Restricted', { description: 'Only Super Admin can manage IT Department users.' });
            clearSelectedEmployee();
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
        toast.warning('No Employee Selected', { description: 'Please search and select an employee first.' });
        return;
    }

    const role = document.getElementById('add-user-role').value;
    if (!role) {
        toast.warning('No Role Selected', { description: 'Please select a role for this user.' });
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
            toast.success('User Added', { description: data.message });
            closeAddUserModal();
            loadUsers();
        } else {
            toast.error('Error', { description: data.message });
        }
    } catch (err) {
        toast.error('Error', { description: 'Network error. Please try again.' });
    } finally {
        btn.disabled  = false;
        btn.innerHTML = original;
    }
}

/* ── Change Role ────────────────────────────────────────────── */
async function changeUserRole(userId, currentRole, department, userName, empId, initials) {
    const roleOptions = {};

    if (myRole === 'super_admin') {
        roleOptions.editor = 'Editor';
        roleOptions.user   = 'User';
    }

    delete roleOptions[currentRole];

    if (Object.keys(roleOptions).length === 0) {
        toast.info('No Available Roles', { description: 'There are no other roles you can assign to this user.' });
        return;
    }

    const { value: newRole, isConfirmed } = await actsToastAction({
        user: { name: userName, empId, role: currentRole, initials },
        title: 'Change Role',
        description: 'Select a new role for this user.',
        input: 'select',
        inputOptions: roleOptions,
        inputPlaceholder: 'Select new role',
        confirmButtonText: 'Update',
        inputValidator: (value) => { if (!value) return 'Please select a role.'; }
    });

    if (!isConfirmed || !newRole) return;

    try {
        const formData = new FormData();
        formData.append('action', 'update_role');
        formData.append('id', userId);
        formData.append('role', newRole);

        const res  = await fetch('./API/manage-user-api.php', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success) {
            toast.success('Role Updated', { description: data.message });
            loadUsers();
        } else {
            toast.error('Error', { description: data.message });
        }
    } catch (err) {
        toast.error('Error', { description: 'Network error.' });
    }
}

/* ── Delete User ────────────────────────────────────────────── */
async function deleteUser(userId, userName, userRole, empId, initials) {
    const result = await actsToastAction({
        user: { name: userName, empId, role: userRole, initials },
        title: 'Remove User',
        description: 'They will lose access to the system.',
        confirmButtonText: 'Remove',
        confirmStyle: 'danger',
        cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    try {
        const formData = new FormData();
        formData.append('action', 'delete');
        formData.append('id', userId);

        const res  = await fetch('./API/manage-user-api.php', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success) {
            toast.success('User Removed', { description: data.message });
            loadUsers();
        } else {
            toast.error('Error', { description: data.message });
        }
    } catch (err) {
        toast.error('Error', { description: 'Network error.' });
    }
}

/* ── Transfer Super Admin ───────────────────────────────────── */
async function transferSuperAdmin(userId, userName) {
    const result = await actsDialog({
        title: 'Transfer Super Admin',
        description: `Transfer Super Admin role to <b>${userName}</b>?<br><span style="font-size:11px;color:#ef4444;font-weight:500">You will be demoted to Admin. This cannot be undone.</span>`,
        input: 'text',
        inputPlaceholder: 'Type "CONFIRM" to proceed',
        confirmButtonText: 'Transfer',
        confirmStyle: 'warning',
        inputValidator: (value) => {
            if (value !== 'CONFIRM') return 'Please type CONFIRM to proceed.'
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
            toast.success('Transferred', { description: data.message });
            window.location.reload();
        } else {
            toast.error('Error', { description: data.message });
        }
    } catch (err) {
        toast.error('Error', { description: 'Network error.' });
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