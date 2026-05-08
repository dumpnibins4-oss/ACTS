/* ── Ticket History Scripts ────────────────────────────────── */
(function() {

const HIST_STATUS = {
    completed:   { bg: 'bg-green-50',   text: 'text-green-600',  label: 'Completed'   },
    closed:      { bg: 'bg-zinc-100',   text: 'text-zinc-500',   label: 'Closed'      },
    waiting:     { bg: 'bg-zinc-100',   text: 'text-zinc-600',   label: 'Waiting'     },
    in_progress: { bg: 'bg-blue-50',    text: 'text-blue-600',   label: 'In Progress' },
    pending:     { bg: 'bg-orange-50',  text: 'text-orange-600', label: 'Pending'     },
    resolved:    { bg: 'bg-indigo-50',  text: 'text-indigo-600', label: 'Resolved'    },
};

let allHistoryTickets = [];

async function loadHistory() {
    const body    = document.getElementById('history-body');
    const loading = document.getElementById('history-loading');
    const empty   = document.getElementById('history-empty');

    loading.classList.remove('hidden');
    empty.classList.add('hidden');
    body.querySelectorAll('.hist-row').forEach(r => r.remove());

    try {
        const res  = await fetch(`./API/get-tickets-api.php?filter=history`);
        const data = await res.json();

        loading.classList.add('hidden');

        if (!data.success || data.data.length === 0) {
            empty.classList.remove('hidden');
            empty.classList.add('flex');
            updateHistStats([]);
            return;
        }

        allHistoryTickets = data.data;
        renderHistory(allHistoryTickets);
        updateHistStats(allHistoryTickets);

    } catch (err) {
        loading.classList.add('hidden');
        empty.classList.remove('hidden');
        empty.classList.add('flex');
        console.error('Error loading history:', err);
    }
}

function renderHistory(tickets) {
    const body  = document.getElementById('history-body');
    const empty = document.getElementById('history-empty');

    body.querySelectorAll('.hist-row').forEach(r => r.remove());

    if (tickets.length === 0) {
        empty.classList.remove('hidden');
        empty.classList.add('flex');
        return;
    }

    empty.classList.add('hidden');

    tickets.forEach(ticket => {
        const status       = HIST_STATUS[ticket.status] || HIST_STATUS.closed;
        const createdDate  = new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const closedDate   = ticket.completed_at
            ? new Date(ticket.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '—';
        const sectionCount = ticket.sections ? ticket.sections.length : 0;
        const ticketData   = btoa(JSON.stringify(ticket));

        const row = document.createElement('div');
        row.className = 'hist-row grid grid-cols-[1fr_120px_100px_140px_140px_80px] items-center w-full px-5 py-3 border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors gap-3';
        row.innerHTML = `
            <div class="flex items-center gap-3 min-w-0">
                <div class="flex items-center justify-center w-8 h-8 ${ticket.status === 'completed' ? 'bg-green-50 border-green-200' : 'bg-zinc-100 border-zinc-200'} border rounded-lg flex-shrink-0">
                    <i class="fa-solid ${ticket.status === 'completed' ? 'fa-circle-check text-green-400' : 'fa-lock text-zinc-400'} text-xs"></i>
                </div>
                <div class="flex flex-col min-w-0">
                    <p class="text-xs font-semibold text-zinc-800 truncate">${ticket.title}</p>
                    <p class="text-[10px] text-zinc-400 font-medium">${ticket.FirstName || ''} ${ticket.LastName || ''}</p>
                </div>
            </div>
            <div>
                <span class="text-[10px] font-semibold px-2.5 py-1 rounded-full ${status.bg} ${status.text}">${status.label}</span>
            </div>
            <div>
                <span class="text-xs text-zinc-500 font-medium">${sectionCount} section${sectionCount !== 1 ? 's' : ''}</span>
            </div>
            <div>
                <span class="text-xs text-zinc-500 font-medium">${createdDate}</span>
            </div>
            <div>
                <span class="text-xs text-zinc-500 font-medium">${closedDate}</span>
            </div>
            <div class="flex justify-center">
                <button data-ticket="${ticketData}"
                    class="view-hist-btn text-xs font-medium text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-md px-2 py-1 transition-all cursor-pointer">
                    View
                </button>
            </div>
        `;
        body.appendChild(row);
    });

    // Attach click handlers
    body.querySelectorAll('.view-hist-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const ticket = JSON.parse(atob(btn.dataset.ticket));
            viewHistoryTicket(ticket);
        });
    });
}

function updateHistStats(tickets) {
    document.getElementById('hist-stat-completed').textContent = tickets.filter(t => t.status === 'completed').length;
    document.getElementById('hist-stat-closed').textContent    = tickets.filter(t => t.status === 'closed').length;
    document.getElementById('hist-stat-total').textContent      = tickets.length;
}

// ── Search ──────────────────────────────────────────────────
document.getElementById('history-search')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filterVal = document.getElementById('history-filter')?.value || 'all';
    applyFilters(q, filterVal);
});

function applyFilters(search, statusFilter) {
    let filtered = allHistoryTickets;

    if (statusFilter !== 'all') {
        filtered = filtered.filter(t => t.status === statusFilter);
    }

    if (search) {
        filtered = filtered.filter(t =>
            (t.title || '').toLowerCase().includes(search) ||
            (t.status || '').toLowerCase().includes(search) ||
            (t.FirstName || '').toLowerCase().includes(search) ||
            (t.LastName || '').toLowerCase().includes(search)
        );
    }

    renderHistory(filtered);
}

// ── View History Ticket Modal ───────────────────────────────
function viewHistoryTicket(ticket) {
    const modal  = document.getElementById('history-modal');
    const status = HIST_STATUS[ticket.status] || HIST_STATUS.closed;

    document.getElementById('hist-modal-title').textContent = ticket.title;
    document.getElementById('hist-modal-date').textContent  = 'Created ' + new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const statusEl = document.getElementById('hist-modal-status');
    statusEl.textContent = status.label;
    statusEl.className   = `text-[10px] font-semibold px-2.5 py-1 rounded-full ${status.bg} ${status.text}`;

    const bodyEl = document.getElementById('hist-modal-body');
    bodyEl.innerHTML = '';

    // Meta info
    const initials = (ticket.FirstName || 'U')[0] + (ticket.LastName || '')[0];
    bodyEl.innerHTML += `
        <div class="flex flex-row flex-wrap items-center gap-4">
            <div class="flex items-center gap-2">
                <div class="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-500 overflow-hidden border border-indigo-500">
                    <img src="http://10.2.0.8/lrnph/emp_photos/${ticket.created_by}.jpg" alt="" class="w-full h-full object-cover object-top"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <span style="display:none" class="text-white text-[10px] font-bold flex items-center justify-center w-full h-full">${initials}</span>
                </div>
                <div class="flex flex-col">
                    <p class="text-xs font-semibold text-zinc-700">${ticket.FirstName || ''} ${ticket.LastName || ''}</p>
                    <p class="text-[10px] text-zinc-400">${ticket.Department || ''}</p>
                </div>
            </div>
            <div class="w-px h-6 bg-zinc-200"></div>
            <div class="flex flex-col">
                <p class="text-[10px] text-zinc-400">Urgency</p>
                ${ticket.urgent == 1
                    ? '<span class="text-[10px] font-semibold text-red-500"><i class="fa-solid fa-bolt text-[8px]"></i> Urgent</span>'
                    : '<span class="text-[10px] font-semibold text-zinc-500">Normal</span>'
                }
            </div>
        </div>
        <hr class="border-zinc-200" />
    `;

    if (ticket.sections && ticket.sections.length > 0) {
        ticket.sections.forEach((sec, idx) => {
            let imagesHTML = '';
            if (sec.images && sec.images.length > 0) {
                imagesHTML = `
                    <div class="flex flex-row flex-wrap gap-2 mt-2">
                        ${sec.images.map(img => `
                            <a href="./${img.image}" target="_blank" class="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1.5 hover:bg-indigo-100 transition-all">
                                <i class="fa-solid fa-paperclip text-indigo-400 text-[10px]"></i>
                                <span class="text-[10px] font-medium text-indigo-600 truncate max-w-32">${img.image.split('/').pop()}</span>
                            </a>
                        `).join('')}
                    </div>
                `;
            }

            bodyEl.innerHTML += `
                <div class="flex flex-col gap-2 p-4 bg-zinc-50 border border-zinc-200 rounded-xl">
                    <div class="flex items-center gap-2">
                        <div class="flex items-center justify-center w-5 h-5 bg-indigo-500/10 border border-indigo-300 rounded-md">
                            <i class="fa-regular fa-envelope text-indigo-500 text-[10px]"></i>
                        </div>
                        <p class="text-xs font-semibold text-zinc-600">${sec.sub_title || 'Section ' + (idx + 1)}</p>
                    </div>
                    <p class="text-xs text-zinc-600 font-medium whitespace-pre-wrap leading-relaxed">${sec.body || ''}</p>
                    ${imagesHTML}
                </div>
            `;
        });
    }

    // Footer info
    const footerEl = document.getElementById('hist-modal-footer-info');
    const completedDate = ticket.completed_at
        ? new Date(ticket.completed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : '—';
    footerEl.innerHTML = `
        <p class="text-[10px] text-zinc-400 font-medium">
            ${ticket.status === 'completed' ? 'Completed' : 'Closed'} on <span class="text-zinc-600 font-semibold">${completedDate}</span>
            ${ticket.completed_by ? ' by <span class="text-zinc-600 font-semibold">' + ticket.completed_by + '</span>' : ''}
        </p>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

// Expose needed functions globally
window.loadHistory       = loadHistory;
window.applyHistoryFilter = function() {
    const q = document.getElementById('history-search')?.value?.toLowerCase() || '';
    const filterVal = document.getElementById('history-filter')?.value || 'all';
    applyFilters(q, filterVal);
};
window.closeHistoryModal = function() {
    const modal = document.getElementById('history-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
};

document.getElementById('history-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) window.closeHistoryModal();
});

// ── Initial Load ────────────────────────────────────────────
loadHistory();

})();
