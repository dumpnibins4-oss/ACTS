<?php
    session_start();
    $empID = $_SESSION['user_information']['EmployeeID'] ?? '';
?>

<div class="flex flex-col items-start justify-start w-full h-full gap-6" data-emp-id="<?= $empID ?>">
    <input type="hidden" id="user-pos-title" value="<?php echo $_SESSION['user_information']['PositionTitle']; ?>">
    <div class="flex flex-row items-end justify-between w-full h-auto">
        <div class="flex flex-col items-start justify-start w-auto h-auto gap-1">
            <h1 class="text-2xl font-bold text-zinc-800 tracking-wide">Tickets</h1>
            <p class="text-xs text-zinc-400 font-medium">Track and manage active system tickets</p>
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
                <i class="fa-solid fa-rotate text-xs"></i> Refresh
            </button>
            <!-- Export Dropdown -->
            <?php if ($_SESSION['user_role'] === 'editor') : ?>
                <div class="relative" id="my-tickets-export-dropdown-wrapper">
                    <button id="my-tickets-export-toggle-btn" onclick="toggleMyTicketsExportDropdown()" class="flex items-center gap-1.5 text-xs font-medium text-white bg-indigo-500 border border-indigo-500 rounded-lg px-3 py-2 hover:bg-indigo-600 transition-all cursor-pointer">
                        <i class="fa-solid fa-file-export text-xs"></i> Export
                        <i class="fa-solid fa-chevron-down text-[8px] ml-0.5"></i>
                    </button>
                    <div id="my-tickets-export-dropdown" class="hidden absolute right-0 top-full mt-1 z-50 bg-white border border-zinc-200 rounded-lg shadow-lg overflow-hidden w-56">
                        <!-- Date Range -->
                        <div class="flex flex-col gap-2 px-3 py-3 border-b border-zinc-100">
                            <p class="text-xs font-bold text-zinc-400 uppercase tracking-wider">Date Range</p>
                            <div class="flex items-center gap-1.5">
                                <span class="text-xs font-medium text-zinc-400 w-7">From</span>
                                <input type="date" id="my-tickets-export-date-from"
                                    class="flex-1 text-[11px] font-medium text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1.5 outline-none focus:border-indigo-400 transition-all" />
                            </div>
                            <div class="flex items-center gap-1.5">
                                <span class="text-xs font-medium text-zinc-400 w-7">To</span>
                                <input type="date" id="my-tickets-export-date-to"
                                    class="flex-1 text-[11px] font-medium text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1.5 outline-none focus:border-indigo-400 transition-all" />
                            </div>
                        </div>
                        <!-- Export Buttons -->
                        <button onclick="exportMyTickets('all')" class="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-medium text-zinc-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all cursor-pointer">
                            <i class="fa-solid fa-table-list text-xs text-zinc-400"></i> Export Active Tickets
                        </button>
                        <hr class="border-zinc-100" />
                        <button onclick="exportMyTickets('waiting')" class="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-medium text-zinc-600 hover:bg-amber-50 hover:text-amber-600 transition-all cursor-pointer">
                            <i class="fa-solid fa-clock text-xs text-zinc-400"></i> Export Waiting Only
                        </button>
                        <hr class="border-zinc-100" />
                        <button onclick="exportMyTickets('in_progress')" class="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-medium text-zinc-600 hover:bg-blue-50 hover:text-blue-600 transition-all cursor-pointer">
                            <i class="fa-solid fa-spinner text-xs text-zinc-400"></i> Export Ongoing Only
                        </button>
                    </div>
                </div>
            <?php endif; ?>
        </div>
    </div>

    <!-- Filters Row -->
    <div class="flex flex-row items-center gap-3 w-full">
        <!-- Status Filter -->
        <div class="relative">
            <select id="my-tickets-filter-status" onchange="applyMyTicketsFilters()"
                class="text-xs font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg pl-3 pr-8 py-2 outline-none appearance-none cursor-pointer focus:border-indigo-400 transition-all">
                <option value="all">All Status</option>
                <option value="waiting">Waiting</option>
                <option value="in_progress">Ongoing</option>
                <option value="pending">Pending</option>
            </select>
            <i class="fa-solid fa-chevron-down text-[9px] text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
        </div>
        <!-- Urgency Filter -->
        <div class="relative">
            <select id="my-tickets-filter-urgency" onchange="applyMyTicketsFilters()"
                class="text-xs font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg pl-3 pr-8 py-2 outline-none appearance-none cursor-pointer focus:border-indigo-400 transition-all">
                <option value="all">All Urgency</option>
                <option value="1">Urgent</option>
                <option value="0">Non-Urgent</option>
            </select>
            <i class="fa-solid fa-chevron-down text-[9px] text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
        </div>
        <!-- Creator Filter -->
        <div class="relative">
            <select id="my-tickets-filter-creator" onchange="applyMyTicketsFilters()"
                class="text-xs font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg pl-3 pr-8 py-2 outline-none appearance-none cursor-pointer focus:border-indigo-400 transition-all max-w-[150px]">
                <option value="all">All Creators</option>
            </select>
            <i class="fa-solid fa-chevron-down text-[9px] text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
        </div>
        <!-- Date Range -->
        <div class="flex items-center gap-1.5">
            <span class="text-xs font-medium text-zinc-400">From</span>
            <input type="date" id="my-tickets-date-from" onchange="applyMyTicketsFilters()"
                class="text-xs font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-400 transition-all" />
            <span class="text-xs font-medium text-zinc-400">To</span>
            <input type="date" id="my-tickets-date-to" onchange="applyMyTicketsFilters()"
                class="text-xs font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-400 transition-all" />
        </div>
        <!-- Clear Filters -->
        <button onclick="clearMyTicketsFilters()" class="px-2.5 py-1.5 text-xs bg-zinc-100 border border-zinc-300 rounded-lg font-medium text-zinc-400 hover:text-white hover:bg-indigo-500 transition-all cursor-pointer flex items-center gap-1">
            <i class="fa-solid fa-broom"></i>
            Clear Filters
        </button>
    </div>

    <!-- Stats Row -->
    <div class="flex flex-row gap-3 w-full" id="my-tickets-stats">
        <div class="flex items-center gap-3 bg-white border border-zinc-200 rounded-xl px-4 py-3 flex-1">
            <div class="flex items-center justify-center w-9 h-9 bg-indigo-50 rounded-lg">
                <i class="fa-solid fa-ticket text-indigo-500 text-xs"></i>
            </div>
            <div>
                <p class="text-lg font-bold text-zinc-800" id="stat-total">0</p>
                <p class="text-xs text-zinc-400 font-medium">Total Active</p>
            </div>
        </div>
        <div class="flex items-center gap-3 bg-white border border-zinc-200 rounded-xl px-4 py-3 flex-1">
            <div class="flex items-center justify-center w-9 h-9 bg-amber-50 rounded-lg">
                <i class="fa-solid fa-clock text-amber-500 text-xs"></i>
            </div>
            <div>
                <p class="text-lg font-bold text-zinc-800" id="stat-waiting">0</p>
                <p class="text-xs text-zinc-400 font-medium">Waiting</p>
            </div>
        </div>
        <div class="flex items-center gap-3 bg-white border border-zinc-200 rounded-xl px-4 py-3 flex-1">
            <div class="flex items-center justify-center w-9 h-9 bg-blue-50 rounded-lg">
                <i class="fa-solid fa-spinner text-blue-500 text-xs"></i>
            </div>
            <div>
                <p class="text-lg font-bold text-zinc-800" id="stat-progress">0</p>
                <p class="text-xs text-zinc-400 font-medium">Ongoing</p>
            </div>
        </div>
        <div class="flex items-center gap-3 bg-white border border-zinc-200 rounded-xl px-4 py-3 flex-1">
            <div class="flex items-center justify-center w-9 h-9 bg-orange-50 rounded-lg">
                <i class="fa-solid fa-pause text-orange-500 text-xs"></i>
            </div>
            <div>
                <p class="text-lg font-bold text-zinc-800" id="stat-pending">0</p>
                <p class="text-xs text-zinc-400 font-medium">Pending</p>
            </div>
        </div>
        <div class="flex items-center gap-3 bg-white border border-zinc-200 rounded-xl px-4 py-3 flex-1">
            <div class="flex items-center justify-center w-9 h-9 bg-red-50 rounded-lg">
                <i class="fa-solid fa-bolt text-red-500 text-xs"></i>
            </div>
            <div>
                <p class="text-lg font-bold text-zinc-800" id="stat-urgent">0</p>
                <p class="text-xs text-zinc-400 font-medium">Urgent</p>
            </div>
        </div>
    </div>

    <!-- Tickets Table -->
    <div class="flex flex-col w-full flex-1 bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <!-- Table Header -->
        <div class="grid grid-cols-[1fr_120px_100px_100px_140px_80px] items-center w-full h-auto px-5 py-3 bg-zinc-50 border-b border-zinc-200 gap-3">
            <p class="text-xs font-bold text-zinc-400 tracking-widest uppercase">Ticket</p>
            <p class="text-xs font-bold text-zinc-400 tracking-widest uppercase">Status</p>
            <p class="text-xs font-bold text-zinc-400 tracking-widest uppercase">Urgency</p>
            <p class="text-xs font-bold text-zinc-400 tracking-widest uppercase">Sections</p>
            <p class="text-xs font-bold text-zinc-400 tracking-widest uppercase">Created</p>
            <p class="text-xs font-bold text-zinc-400 tracking-widest uppercase text-center">Action</p>
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
                <p class="text-xs font-semibold text-zinc-400">No active tickets</p>
                <p class="text-xs text-zinc-300 font-medium">Your submitted tickets will appear here</p>
            </div>
        </div>
    </div>

    <!-- Pagination -->
    <div id="my-tickets-pagination" class="hidden flex items-center justify-between w-full">
        <p class="text-[11px] text-zinc-400 font-medium" id="my-tickets-page-info"></p>
        <div class="flex items-center gap-1">
            <button id="my-tickets-prev" onclick="myTicketsPageChange(-1)" class="flex items-center justify-center w-8 h-8 text-xs text-zinc-500 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                <i class="fa-solid fa-chevron-left text-xs"></i>
            </button>
            <div id="my-tickets-page-btns" class="flex items-center gap-1"></div>
            <button id="my-tickets-next" onclick="myTicketsPageChange(1)" class="flex items-center justify-center w-8 h-8 text-xs text-zinc-500 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                <i class="fa-solid fa-chevron-right text-xs"></i>
            </button>
        </div>
    </div>
</div>

<!-- Ticket Detail Modal -->
<div id="ticket-modal" class="fixed inset-0 z-[999] hidden items-center justify-center bg-black/40 backdrop-blur-sm p-4">
    <div class="relative flex flex-col w-full max-w-[800px] max-h-[90vh] bg-white rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden" style="animation: fadeSlideIn .2s ease both;">
        <!-- Modal Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-white z-10 shrink-0">
            <div class="flex items-center gap-4">
                <div class="flex items-center justify-center w-10 h-10 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                    <i class="fa-solid fa-ticket text-indigo-500 text-sm"></i>
                </div>
                <div>
                    <p class="text-[15px] font-bold text-zinc-800" id="modal-ticket-title"></p>
                    <p class="text-[11px] text-zinc-400 font-medium tracking-wide uppercase mt-0.5" id="modal-ticket-date"></p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <span id="modal-ticket-status" class="text-xs font-bold px-3 py-1.5 rounded-full mr-2"></span>
                <button id="modal-ticket-edit-btn" class="flex items-center justify-center text-xs font-semibold text-zinc-600 bg-white border border-zinc-200 rounded-lg px-3 py-2 hover:bg-zinc-50 hover:text-indigo-600 transition-all cursor-pointer shadow-sm">
                    <i class="fa-solid fa-pen text-xs mr-1.5"></i> Edit
                </button>
                <button id="modal-ticket-logs-btn" class="flex items-center justify-center text-xs font-semibold text-zinc-600 bg-white border border-zinc-200 rounded-lg px-3 py-2 hover:bg-zinc-50 hover:text-indigo-600 transition-all cursor-pointer shadow-sm">
                    <i class="fa-solid fa-clock-rotate-left text-xs mr-1.5"></i> Logs
                </button>
                <div class="w-px h-6 bg-zinc-200 mx-1"></div>
                <button onclick="closeTicketModal()" class="flex items-center justify-center w-8 h-8 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>
        </div>
        <!-- Modal Body -->
        <div class="flex flex-col gap-6 px-8 py-6 overflow-y-auto bg-zinc-50/30 flex-1 relative" id="modal-ticket-body"></div>
        <!-- Modal Footer -->
        <div class="flex items-center justify-between px-6 py-4 border-t border-zinc-100 bg-white/95 backdrop-blur-md z-10 shrink-0" id="modal-ticket-footer">
            <div class="flex flex-col" id="modal-ticket-footer-info"></div>
            <div id="modal-ticket-action" class="flex gap-2"></div>
        </div>
    </div>
</div>

<script src="./scripts/my-tickets-scripts.js"></script>
