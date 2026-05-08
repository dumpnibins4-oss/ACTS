<?php
    session_start();
    $empID = $_SESSION['user_information']['EmployeeID'] ?? '';
?>

<div class="flex flex-col items-start justify-start w-full h-full gap-6">
    <div class="flex flex-row items-end justify-between w-full h-auto">
        <div class="flex flex-col items-start justify-start w-auto h-auto gap-1">
            <h1 class="text-2xl font-bold text-zinc-800 tracking-wide">Ticket History</h1>
            <p class="text-sm text-zinc-400 font-medium">View your completed and closed tickets</p>
        </div>
        <div class="flex flex-row items-center gap-3">
            <!-- Search -->
            <div class="relative">
                <i class="fa-solid fa-magnifying-glass text-zinc-400 text-xs absolute left-3 top-1/2 -translate-y-1/2"></i>
                <input type="text" id="history-search" placeholder="Search history…"
                    class="text-xs font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg pl-8 pr-3 py-2 w-56 outline-none focus:border-indigo-400 transition-all placeholder:text-zinc-300" />
            </div>
            <!-- Filter -->
            <div class="relative">
                <select id="history-filter" onchange="applyHistoryFilter()"
                    class="text-xs font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg pl-3 pr-8 py-2 outline-none appearance-none cursor-pointer focus:border-indigo-400 transition-all">
                    <option value="all">All History</option>
                    <option value="completed">Completed</option>
                    <option value="closed">Closed</option>
                </select>
                <i class="fa-solid fa-chevron-down text-[9px] text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
            </div>
            <!-- Refresh -->
            <button onclick="loadHistory()" class="flex items-center gap-1.5 text-xs font-medium text-zinc-500 bg-white border border-zinc-200 rounded-lg px-3 py-2 hover:bg-zinc-50 transition-all cursor-pointer">
                <i class="fa-solid fa-rotate text-[10px]"></i> Refresh
            </button>
        </div>
    </div>

    <!-- Summary Row -->
    <div class="flex flex-row gap-3 w-full">
        <div class="flex items-center gap-3 bg-white border border-zinc-200 rounded-xl px-4 py-3 flex-1">
            <div class="flex items-center justify-center w-9 h-9 bg-green-50 rounded-lg">
                <i class="fa-solid fa-circle-check text-green-500 text-sm"></i>
            </div>
            <div>
                <p class="text-lg font-bold text-zinc-800" id="hist-stat-completed">0</p>
                <p class="text-[10px] text-zinc-400 font-medium">Completed</p>
            </div>
        </div>
        <div class="flex items-center gap-3 bg-white border border-zinc-200 rounded-xl px-4 py-3 flex-1">
            <div class="flex items-center justify-center w-9 h-9 bg-zinc-100 rounded-lg">
                <i class="fa-solid fa-lock text-zinc-400 text-sm"></i>
            </div>
            <div>
                <p class="text-lg font-bold text-zinc-800" id="hist-stat-closed">0</p>
                <p class="text-[10px] text-zinc-400 font-medium">Closed</p>
            </div>
        </div>
        <div class="flex items-center gap-3 bg-white border border-zinc-200 rounded-xl px-4 py-3 flex-1">
            <div class="flex items-center justify-center w-9 h-9 bg-indigo-50 rounded-lg">
                <i class="fa-solid fa-list-check text-indigo-500 text-sm"></i>
            </div>
            <div>
                <p class="text-lg font-bold text-zinc-800" id="hist-stat-total">0</p>
                <p class="text-[10px] text-zinc-400 font-medium">Total Records</p>
            </div>
        </div>
    </div>

    <!-- History Table -->
    <div class="flex flex-col w-full flex-1 bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <!-- Table Header -->
        <div class="grid grid-cols-[1fr_120px_100px_140px_140px_80px] items-center w-full h-auto px-5 py-3 bg-zinc-50 border-b border-zinc-200 gap-3">
            <p class="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">Ticket</p>
            <p class="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">Status</p>
            <p class="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">Sections</p>
            <p class="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">Created</p>
            <p class="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">Closed</p>
            <p class="text-[10px] font-bold text-zinc-400 tracking-widest uppercase text-center">Action</p>
        </div>

        <!-- Table Body -->
        <div id="history-body" class="flex flex-col w-full overflow-y-auto flex-1">
            <!-- Loading -->
            <div id="history-loading" class="flex flex-col items-center justify-center w-full py-16 gap-3">
                <i class="fa-solid fa-spinner fa-spin text-indigo-400 text-xl"></i>
                <p class="text-xs text-zinc-400 font-medium">Loading history…</p>
            </div>
            <!-- Empty state -->
            <div id="history-empty" class="hidden flex flex-col items-center justify-center w-full py-16 gap-2">
                <div class="flex items-center justify-center w-12 h-12 bg-zinc-100 rounded-xl">
                    <i class="fa-solid fa-clock-rotate-left text-zinc-300 text-lg"></i>
                </div>
                <p class="text-sm font-semibold text-zinc-400">No history yet</p>
                <p class="text-xs text-zinc-300 font-medium">Completed and closed tickets will appear here</p>
            </div>
        </div>
    </div>
</div>

<!-- History Detail Modal -->
<div id="history-modal" class="fixed inset-0 z-[999] hidden items-center justify-center bg-black/40 backdrop-blur-sm">
    <div class="relative flex flex-col w-[600px] max-h-[80vh] bg-white rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden" style="animation: fadeSlideIn .2s ease both;">
        <!-- Modal Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50">
            <div class="flex items-center gap-3">
                <div class="flex items-center justify-center w-8 h-8 bg-green-50 border border-green-200 rounded-lg">
                    <i class="fa-solid fa-circle-check text-green-500 text-xs"></i>
                </div>
                <div>
                    <p class="text-sm font-semibold text-zinc-800" id="hist-modal-title"></p>
                    <p class="text-[10px] text-zinc-400 font-medium" id="hist-modal-date"></p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <span id="hist-modal-status" class="text-[10px] font-semibold px-2.5 py-1 rounded-full"></span>
                <button onclick="closeHistoryModal()" class="text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer">
                    <i class="fa-solid fa-xmark text-base"></i>
                </button>
            </div>
        </div>
        <!-- Modal Body -->
        <div class="flex flex-col gap-4 px-6 py-5 overflow-y-auto" id="hist-modal-body"></div>
        <!-- Modal Footer -->
        <div class="flex items-center justify-between px-6 py-3 border-t border-zinc-200 bg-zinc-50">
            <div class="flex flex-col" id="hist-modal-footer-info"></div>
        </div>
    </div>
</div>

<script src="./scripts/ticket-history-scripts.js"></script>