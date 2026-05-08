<?php
    session_start();
    $empID = $_SESSION['user_information']['EmployeeID'] ?? '';
?>

<div class="flex flex-col items-start justify-start w-full h-full gap-6" data-emp-id="<?= $empID ?>">
    <div class="flex flex-row items-end justify-between w-full h-auto">
        <div class="flex flex-col items-start justify-start w-auto h-auto gap-1">
            <h1 class="text-2xl font-bold text-zinc-800 tracking-wide">My Tickets</h1>
            <p class="text-sm text-zinc-400 font-medium">Track and manage your submitted tickets</p>
        </div>
        <div class="flex flex-row items-center gap-3">
            <!-- Search -->
            <div class="relative">
                <i class="fa-solid fa-magnifying-glass text-zinc-400 text-xs absolute left-3 top-1/2 -translate-y-1/2"></i>
                <input type="text" id="my-tickets-search" placeholder="Search tickets…"
                    class="text-xs font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg pl-8 pr-3 py-2 w-56 outline-none focus:border-indigo-400 transition-all placeholder:text-zinc-300" />
            </div>
            <!-- Refresh -->
            <button onclick="loadMyTickets()" class="flex items-center gap-1.5 text-xs font-medium text-zinc-500 bg-white border border-zinc-200 rounded-lg px-3 py-2 hover:bg-zinc-50 transition-all cursor-pointer">
                <i class="fa-solid fa-rotate text-[10px]"></i> Refresh
            </button>
        </div>
    </div>

    <!-- Stats Row -->
    <div class="flex flex-row gap-3 w-full" id="my-tickets-stats">
        <div class="flex items-center gap-3 bg-white border border-zinc-200 rounded-xl px-4 py-3 flex-1">
            <div class="flex items-center justify-center w-9 h-9 bg-indigo-50 rounded-lg">
                <i class="fa-solid fa-ticket text-indigo-500 text-sm"></i>
            </div>
            <div>
                <p class="text-lg font-bold text-zinc-800" id="stat-total">0</p>
                <p class="text-[10px] text-zinc-400 font-medium">Total Active</p>
            </div>
        </div>
        <div class="flex items-center gap-3 bg-white border border-zinc-200 rounded-xl px-4 py-3 flex-1">
            <div class="flex items-center justify-center w-9 h-9 bg-amber-50 rounded-lg">
                <i class="fa-solid fa-clock text-amber-500 text-sm"></i>
            </div>
            <div>
                <p class="text-lg font-bold text-zinc-800" id="stat-waiting">0</p>
                <p class="text-[10px] text-zinc-400 font-medium">Waiting</p>
            </div>
        </div>
        <div class="flex items-center gap-3 bg-white border border-zinc-200 rounded-xl px-4 py-3 flex-1">
            <div class="flex items-center justify-center w-9 h-9 bg-blue-50 rounded-lg">
                <i class="fa-solid fa-spinner text-blue-500 text-sm"></i>
            </div>
            <div>
                <p class="text-lg font-bold text-zinc-800" id="stat-progress">0</p>
                <p class="text-[10px] text-zinc-400 font-medium">Ongoing</p>
            </div>
        </div>
        <div class="flex items-center gap-3 bg-white border border-zinc-200 rounded-xl px-4 py-3 flex-1">
            <div class="flex items-center justify-center w-9 h-9 bg-red-50 rounded-lg">
                <i class="fa-solid fa-bolt text-red-500 text-sm"></i>
            </div>
            <div>
                <p class="text-lg font-bold text-zinc-800" id="stat-urgent">0</p>
                <p class="text-[10px] text-zinc-400 font-medium">Urgent</p>
            </div>
        </div>
    </div>

    <!-- Tickets Table -->
    <div class="flex flex-col w-full flex-1 bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <!-- Table Header -->
        <div class="grid grid-cols-[1fr_120px_100px_100px_140px_80px] items-center w-full h-auto px-5 py-3 bg-zinc-50 border-b border-zinc-200 gap-3">
            <p class="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">Ticket</p>
            <p class="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">Status</p>
            <p class="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">Urgency</p>
            <p class="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">Sections</p>
            <p class="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">Created</p>
            <p class="text-[10px] font-bold text-zinc-400 tracking-widest uppercase text-center">Action</p>
        </div>

        <!-- Table Body -->
        <div id="my-tickets-body" class="flex flex-col w-full overflow-y-auto flex-1">
            <!-- Loading state -->
            <div id="my-tickets-loading" class="flex flex-col items-center justify-center w-full py-16 gap-3">
                <i class="fa-solid fa-spinner fa-spin text-indigo-400 text-xl"></i>
                <p class="text-xs text-zinc-400 font-medium">Loading tickets…</p>
            </div>
            <!-- Empty state (hidden by default) -->
            <div id="my-tickets-empty" class="hidden flex flex-col items-center justify-center w-full py-16 gap-2">
                <div class="flex items-center justify-center w-12 h-12 bg-zinc-100 rounded-xl">
                    <i class="fa-solid fa-ticket text-zinc-300 text-lg"></i>
                </div>
                <p class="text-sm font-semibold text-zinc-400">No active tickets</p>
                <p class="text-xs text-zinc-300 font-medium">Your submitted tickets will appear here</p>
            </div>
        </div>
    </div>
</div>

<!-- Ticket Detail Modal -->
<div id="ticket-modal" class="fixed inset-0 z-[999] hidden items-center justify-center bg-black/40 backdrop-blur-sm">
    <div class="relative flex flex-col w-[600px] max-h-[80vh] bg-white rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden" style="animation: fadeSlideIn .2s ease both;">
        <!-- Modal Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50">
            <div class="flex items-center gap-3">
                <div class="flex items-center justify-center w-8 h-8 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <i class="fa-solid fa-ticket text-indigo-500 text-xs"></i>
                </div>
                <div>
                    <p class="text-sm font-semibold text-zinc-800" id="modal-ticket-title"></p>
                    <p class="text-[10px] text-zinc-400 font-medium" id="modal-ticket-date"></p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <span id="modal-ticket-status" class="text-[10px] font-semibold px-2.5 py-1 rounded-full"></span>
                <button onclick="closeTicketModal()" class="text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer">
                    <i class="fa-solid fa-xmark text-base"></i>
                </button>
            </div>
        </div>
        <!-- Modal Body -->
        <div class="flex flex-col gap-4 px-6 py-5 overflow-y-auto" id="modal-ticket-body"></div>
    </div>
</div>

<script src="./scripts/my-tickets-scripts.js"></script>
