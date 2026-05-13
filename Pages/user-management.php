<?php
    session_start();
    $empID = $_SESSION['user_information']['EmployeeID'] ?? '';
    $role  = $_SESSION['user_role'] ?? 'user';
?>

<div class="flex flex-col items-start justify-start w-full h-full gap-6" data-emp-id="<?= $empID ?>" data-role="<?= $role ?>">
    <div class="flex flex-row items-end justify-between w-full h-auto">
        <div class="flex flex-col items-start justify-start w-auto h-auto gap-1">
            <h1 class="text-2xl font-bold text-zinc-800 tracking-wide">User Management</h1>
            <p class="text-sm text-zinc-400 font-medium">Manage user accounts and permissions</p>
        </div>
        <div class="flex flex-row items-center gap-3">
            <!-- Search -->
            <div class="relative">
                <i class="fa-solid fa-magnifying-glass text-zinc-400 text-xs absolute left-3 top-1/2 -translate-y-1/2"></i>
                <input type="text" id="users-search" placeholder="Search users…"
                    class="text-xs font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg pl-8 pr-3 py-2 w-56 outline-none focus:border-indigo-400 transition-all placeholder:text-zinc-300" />
            </div>
            <button id="add-user-btn"
                class="flex items-center gap-1.5 text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600 border border-indigo-500 rounded-lg px-3 py-2 cursor-pointer transition-colors"
                onclick="openAddUserModal()">
                <i class="fa-solid fa-plus text-[10px]"></i> Add User
            </button>
            <button onclick="loadUsers()"
                class="flex items-center gap-1.5 text-xs font-medium text-zinc-500 bg-white border border-zinc-200 rounded-lg px-3 py-2 hover:bg-zinc-50 transition-all cursor-pointer">
                <i class="fa-solid fa-rotate text-[10px]"></i> Refresh
            </button>
        </div>
    </div>

    <!-- Users Table -->
    <div class="flex flex-col w-full flex-1 bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <!-- Table Header -->
        <div class="grid grid-cols-12 items-center w-full h-auto px-5 py-3 bg-zinc-50 border-b border-zinc-200 gap-3">
            <p class="text-[10px] font-bold text-zinc-400 tracking-widest uppercase col-span-2">Employee ID</p>
            <p class="text-[10px] font-bold text-zinc-400 tracking-widest uppercase col-span-3">Name</p>
            <p class="text-[10px] font-bold text-zinc-400 tracking-widest uppercase col-span-4">Department</p>
            <p class="text-[10px] font-bold text-zinc-400 tracking-widest uppercase col-span-2">Role</p>
            <p class="text-[10px] font-bold text-zinc-400 tracking-widest uppercase text-right col-span-1">Actions</p>
        </div>

        <!-- Table Body -->
        <div id="users-table-body" class="flex flex-col w-full overflow-y-auto flex-1">
            <!-- Loading state -->
            <div id="users-table-loading" class="flex flex-col items-center justify-center w-full py-16 gap-3">
                <i class="fa-solid fa-spinner fa-spin text-indigo-400 text-xl"></i>
                <p class="text-xs text-zinc-400 font-medium">Loading users…</p>
            </div>
            <!-- Empty state -->
            <div id="users-table-empty" class="hidden flex-col items-center justify-center w-full py-16 gap-2">
                <div class="flex items-center justify-center w-12 h-12 bg-zinc-100 rounded-xl">
                    <i class="fa-solid fa-users text-zinc-300 text-lg"></i>
                </div>
                <p class="text-sm font-semibold text-zinc-400">No users found</p>
            </div>
        </div>
    </div>

    <!-- Pagination -->
    <div id="users-pagination" class="hidden items-center justify-between w-full">
        <p class="text-[11px] text-zinc-400 font-medium" id="users-page-info"></p>
        <div class="flex items-center gap-1">
            <button id="users-prev" onclick="usersPageChange(usersCurrentPage - 1)"
                class="flex items-center justify-center w-8 h-8 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
                <i class="fa-solid fa-chevron-left text-[10px]"></i>
            </button>
            <div id="users-page-btns" class="flex items-center gap-1"></div>
            <button id="users-next" onclick="usersPageChange(usersCurrentPage + 1)"
                class="flex items-center justify-center w-8 h-8 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
                <i class="fa-solid fa-chevron-right text-[10px]"></i>
            </button>
        </div>
    </div>
</div>

<!-- Add User Modal -->
<div id="add-user-modal" class="fixed inset-0 bg-black/40 backdrop-blur-sm hidden items-center justify-center z-50">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden" onclick="event.stopPropagation()">
        <!-- Modal Header -->
        <div class="flex items-center justify-between bg-zinc-50 border-b border-zinc-200 px-6 py-4">
            <div>
                <h2 class="text-sm font-bold text-zinc-800">Add New User</h2>
                <p class="text-xs text-zinc-400 font-medium">Search an employee to add to the system</p>
            </div>
            <button onclick="closeAddUserModal()" class="text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer">
                <i class="fa-solid fa-xmark text-sm"></i>
            </button>
        </div>

        <!-- Modal Body -->
        <div class="flex flex-col gap-4 px-6 py-5">
            <!-- Employee Search -->
            <div class="flex flex-col gap-1.5 relative">
                <label class="text-[10px] font-bold text-zinc-400 tracking-wide uppercase">Search Employee (QA/Sales/IT Department) <span class="text-red-500">*</span></label>
                <div class="relative">
                    <i class="fa-solid fa-magnifying-glass text-zinc-300 text-[10px] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                    <input type="text" id="emp-search-input" placeholder="Search by name or employee ID…" autocomplete="off"
                        class="w-full text-xs font-medium text-zinc-600 bg-transparent border border-zinc-200 rounded-lg pl-8 pr-3 py-2.5 outline-none focus:border-indigo-400 transition-all placeholder:text-zinc-300" />
                </div>
                <div id="emp-search-dropdown" class="hidden absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"></div>
            </div>

            <!-- Selected Employee Info -->
            <div id="selected-emp-info" class="hidden flex flex-col gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3">
                <div class="flex items-center justify-between">
                    <p class="text-xs font-bold text-indigo-700" id="selected-emp-name"></p>
                    <button onclick="clearSelectedEmployee()" class="text-indigo-300 hover:text-red-400 transition-colors cursor-pointer">
                        <i class="fa-solid fa-xmark text-xs"></i>
                    </button>
                </div>
                <div class="flex items-center gap-3">
                    <p class="text-[10px] text-indigo-500 font-medium"><i class="fa-solid fa-id-badge text-[9px]"></i> <span id="selected-emp-id"></span></p>
                    <p class="text-[10px] text-indigo-500 font-medium"><i class="fa-solid fa-building text-[9px]"></i> <span id="selected-emp-dept"></span></p>
                </div>
                <input type="hidden" id="selected-emp-biometrics" />
            </div>

            <!-- Role Selection -->
            <div class="flex flex-col gap-1.5">
                <label class="text-[10px] font-bold text-zinc-400 tracking-wide uppercase">Role <span class="text-red-500">*</span></label>
                <div class="relative flex items-center">
                    <select id="add-user-role"
                        class="w-full text-xs font-medium text-zinc-600 bg-transparent border border-zinc-200 rounded-lg pl-3 pr-8 py-2.5 outline-none appearance-none cursor-pointer focus:border-indigo-400 transition-all">
                        <option value="">Select a role…</option>
                    </select>
                    <i class="fa-solid fa-chevron-down text-[9px] text-zinc-400 absolute right-3 pointer-events-none"></i>
                </div>
                <p id="role-hint" class="text-[10px] text-zinc-300 font-medium"></p>
            </div>
        </div>

        <!-- Modal Footer -->
        <div class="flex items-center justify-end gap-2 px-6 py-4 bg-zinc-50 border-t border-zinc-200">
            <button onclick="closeAddUserModal()" class="text-xs font-medium text-zinc-500 border border-zinc-200 rounded-lg px-4 py-2 hover:bg-zinc-100 transition-all cursor-pointer">Cancel</button>
            <button id="add-user-submit-btn" onclick="submitAddUser()" class="flex items-center gap-1.5 text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg px-4 py-2 transition-all cursor-pointer">
                <i class="fa-solid fa-plus text-[10px]"></i> Add User
            </button>
        </div>
    </div>
</div>

<script src="./scripts/user-management-scripts.js"></script>