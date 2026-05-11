<?php
    session_start();
    $empID = $_SESSION['user_information']['EmployeeID'] ?? '';
?>

<div class="flex flex-col items-start justify-start w-full h-full gap-6">
    <!-- Hidden Role -->
    <input type="hidden" id="user-role" value="<?php echo $_SESSION['user_role']; ?>">
    
    <div class="flex flex-row items-end justify-between w-full h-auto">
        <div class="flex flex-col items-start justify-start w-auto h-auto gap-1">
            <h1 class="text-2xl font-bold text-zinc-800 tracking-wide">Ticket History</h1>
            <p class="text-sm text-zinc-400 font-medium">View and manage all tickets across the system</p>
        </div>
        <div class="flex flex-row items-center gap-3">
            <!-- Search -->
            <div class="relative">
                <i class="fa-solid fa-magnifying-glass text-zinc-400 text-xs absolute left-3 top-1/2 -translate-y-1/2"></i>
                <input type="text" id="history-search" placeholder="Search tickets…"
                    class="text-xs font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg pl-8 pr-3 py-2 w-56 outline-none focus:border-indigo-400 transition-all placeholder:text-zinc-300" />
            </div>
            <!-- Refresh -->
            <button onclick="loadHistory()" class="flex items-center gap-1.5 text-xs font-medium text-zinc-500 bg-white border border-zinc-200 rounded-lg px-3 py-2 hover:bg-zinc-50 transition-all cursor-pointer">
                <i class="fa-solid fa-rotate text-[10px]"></i> Refresh
            </button>
            <!-- Export Dropdown -->
            <?php if ($_SESSION['user_role'] === 'editor') : ?>
                <div class="relative" id="export-dropdown-wrapper">
                    <button id="export-toggle-btn" onclick="toggleExportDropdown()" class="flex items-center gap-1.5 text-xs font-medium text-white bg-indigo-500 border border-indigo-500 rounded-lg px-3 py-2 hover:bg-indigo-600 transition-all cursor-pointer">
                        <i class="fa-solid fa-file-export text-[10px]"></i> Export
                        <i class="fa-solid fa-chevron-down text-[8px] ml-0.5"></i>
                    </button>
                    <div id="export-dropdown" class="hidden absolute right-0 top-full mt-1 z-50 bg-white border border-zinc-200 rounded-lg shadow-lg overflow-hidden w-48">
                        <button onclick="exportTickets('all')" class="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-medium text-zinc-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all cursor-pointer">
                            <i class="fa-solid fa-table-list text-[10px] text-zinc-400"></i> Export All Tickets
                        </button>
                        <hr class="border-zinc-100" />
                        <button onclick="exportTickets('enroute')" class="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-medium text-zinc-600 hover:bg-violet-50 hover:text-violet-600 transition-all cursor-pointer">
                            <i class="fa-solid fa-paper-plane text-[10px] text-zinc-400"></i> Export Enroute Only
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
            <select id="history-filter-status" onchange="applyHistoryFilters()"
                class="text-xs font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg pl-3 pr-8 py-2 outline-none appearance-none cursor-pointer focus:border-indigo-400 transition-all">
                <option value="all">All Status</option>
                <option value="waiting">Waiting</option>
                <option value="in_progress">Ongoing</option>
                <option value="completed">Done</option>
                <option value="enroute">Enroute for Signature</option>
            </select>
            <i class="fa-solid fa-chevron-down text-[9px] text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
        </div>
        <!-- Urgency Filter -->
        <div class="relative">
            <select id="history-filter-urgency" onchange="applyHistoryFilters()"
                class="text-xs font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg pl-3 pr-8 py-2 outline-none appearance-none cursor-pointer focus:border-indigo-400 transition-all">
                <option value="all">All Urgency</option>
                <option value="1">Urgent</option>
                <option value="0">Non-Urgent</option>
            </select>
            <i class="fa-solid fa-chevron-down text-[9px] text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
        </div>
        <!-- Date Range -->
        <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-medium text-zinc-400">From</span>
            <input type="date" id="history-date-from" onchange="applyHistoryFilters()"
                class="text-xs font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-400 transition-all" />
            <span class="text-[10px] font-medium text-zinc-400">To</span>
            <input type="date" id="history-date-to" onchange="applyHistoryFilters()"
                class="text-xs font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-400 transition-all" />
        </div>
        <!-- Clear Filters -->
        <button onclick="clearHistoryFilters()" class="text-[10px] font-medium text-zinc-400 hover:text-indigo-500 transition-colors cursor-pointer">
            Clear Filters
        </button>
    </div>

    <!-- Summary Row -->
    <div class="flex flex-row gap-3 w-full">
        <div class="flex items-center gap-3 bg-white border border-zinc-200 rounded-xl px-4 py-3 flex-1">
            <div class="flex items-center justify-center w-9 h-9 bg-indigo-50 rounded-lg">
                <i class="fa-solid fa-list-check text-indigo-500 text-sm"></i>
            </div>
            <div>
                <p class="text-lg font-bold text-zinc-800" id="hist-stat-total">0</p>
                <p class="text-[10px] text-zinc-400 font-medium">Total Records</p>
            </div>
        </div>
        <div class="flex items-center gap-3 bg-white border border-zinc-200 rounded-xl px-4 py-3 flex-1">
            <div class="flex items-center justify-center w-9 h-9 bg-amber-50 rounded-lg">
                <i class="fa-solid fa-clock text-amber-500 text-sm"></i>
            </div>
            <div>
                <p class="text-lg font-bold text-zinc-800" id="hist-stat-waiting">0</p>
                <p class="text-[10px] text-zinc-400 font-medium">Waiting</p>
            </div>
        </div>
        <div class="flex items-center gap-3 bg-white border border-zinc-200 rounded-xl px-4 py-3 flex-1">
            <div class="flex items-center justify-center w-9 h-9 bg-blue-50 rounded-lg">
                <i class="fa-solid fa-spinner text-blue-500 text-sm"></i>
            </div>
            <div>
                <p class="text-lg font-bold text-zinc-800" id="hist-stat-ongoing">0</p>
                <p class="text-[10px] text-zinc-400 font-medium">Ongoing</p>
            </div>
        </div>
        <div class="flex items-center gap-3 bg-white border border-zinc-200 rounded-xl px-4 py-3 flex-1">
            <div class="flex items-center justify-center w-9 h-9 bg-green-50 rounded-lg">
                <i class="fa-solid fa-circle-check text-green-500 text-sm"></i>
            </div>
            <div>
                <p class="text-lg font-bold text-zinc-800" id="hist-stat-done">0</p>
                <p class="text-[10px] text-zinc-400 font-medium">Done</p>
            </div>
        </div>
        <div class="flex items-center gap-3 bg-white border border-zinc-200 rounded-xl px-4 py-3 flex-1">
            <div class="flex items-center justify-center w-9 h-9 bg-violet-50 rounded-lg">
                <i class="fa-solid fa-paper-plane text-violet-500 text-sm"></i>
            </div>
            <div>
                <p class="text-lg font-bold text-zinc-800" id="hist-stat-enroute">0</p>
                <p class="text-[10px] text-zinc-400 font-medium">Enroute</p>
            </div>
        </div>
    </div>

    <!-- History Table -->
    <div class="flex flex-col w-full flex-1 bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <!-- Table Header -->
        <div class="grid grid-cols-[1fr_130px_100px_100px_140px_80px] items-center w-full h-auto px-5 py-3 bg-zinc-50 border-b border-zinc-200 gap-3">
            <p class="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">Ticket</p>
            <p class="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">Status</p>
            <p class="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">Urgency</p>
            <p class="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">Sections</p>
            <p class="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">Created</p>
            <p class="text-[10px] font-bold text-zinc-400 tracking-widest uppercase text-center">Action</p>
        </div>

        <!-- Table Body -->
        <div id="history-body" class="flex flex-col w-full overflow-y-auto flex-1">
            <!-- Loading -->
            <div id="history-loading" class="flex flex-col items-center justify-center w-full py-16 gap-3">
                <i class="fa-solid fa-spinner fa-spin text-indigo-400 text-xl"></i>
                <p class="text-xs text-zinc-400 font-medium">Loading tickets…</p>
            </div>
            <!-- Empty state -->
            <div id="history-empty" class="hidden flex flex-col items-center justify-center w-full py-16 gap-2">
                <div class="flex items-center justify-center w-12 h-12 bg-zinc-100 rounded-xl">
                    <i class="fa-solid fa-clock-rotate-left text-zinc-300 text-lg"></i>
                </div>
                <p class="text-sm font-semibold text-zinc-400">No tickets found</p>
                <p class="text-xs text-zinc-300 font-medium">Try adjusting your filters</p>
            </div>
        </div>
    </div>

    <!-- Pagination -->
    <div id="history-pagination" class="hidden flex items-center justify-between w-full">
        <p class="text-[11px] text-zinc-400 font-medium" id="history-page-info"></p>
        <div class="flex items-center gap-1">
            <button id="history-prev" onclick="historyPageChange(-1)" class="flex items-center justify-center w-8 h-8 text-xs text-zinc-500 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                <i class="fa-solid fa-chevron-left text-[10px]"></i>
            </button>
            <div id="history-page-btns" class="flex items-center gap-1"></div>
            <button id="history-next" onclick="historyPageChange(1)" class="flex items-center justify-center w-8 h-8 text-xs text-zinc-500 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                <i class="fa-solid fa-chevron-right text-[10px]"></i>
            </button>
        </div>
    </div>
</div>

<!-- History Detail Modal -->
<div id="history-modal" class="fixed inset-0 z-[999] hidden items-center justify-center bg-black/40 backdrop-blur-sm">
    <div class="relative flex flex-col w-[600px] max-h-[80vh] bg-white rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden" style="animation: fadeSlideIn .2s ease both;">
        <!-- Modal Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50">
            <div class="flex items-center gap-3">
                <div class="flex items-center justify-center w-8 h-8 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <i class="fa-solid fa-ticket text-indigo-500 text-xs"></i>
                </div>
                <div>
                    <p class="text-sm font-semibold text-zinc-800" id="hist-modal-title"></p>
                    <p class="text-[10px] text-zinc-400 font-medium" id="hist-modal-date"></p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <span id="hist-modal-status" class="text-[10px] font-semibold px-2.5 py-1 rounded-full"></span>
                <button id="hist-modal-logs-btn" class="flex items-center justify-center text-xs font-medium text-zinc-500 bg-white border border-zinc-200 rounded-lg px-3 py-2 hover:bg-zinc-50 transition-all cursor-pointer">
                    <i class="fa-solid fa-clock-rotate-left text-[10px] mr-1"></i> Logs
                </button>
                <button onclick="closeHistoryModal()" class="text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer">
                    <i class="fa-solid fa-xmark text-base"></i>
                </button>
            </div>
        </div>
        <!-- Modal Body -->
        <div class="flex flex-col gap-4 px-6 py-5 overflow-y-auto" id="hist-modal-body"></div>
        <!-- Modal Footer -->
        <div class="flex items-center justify-between px-6 py-3 border-t border-zinc-200 bg-zinc-50" id="hist-modal-footer">
            <div class="flex flex-col" id="hist-modal-footer-info"></div>
            <div id="hist-modal-action"></div>
        </div>
    </div>
</div>

<script src="./scripts/ticket-history-scripts.js"></script>