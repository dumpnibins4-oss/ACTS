/* ── My Tickets Scripts ────────────────────────────────────── */
(function() {

const STATUS = {
    waiting:     { bg: 'bg-zinc-100',   text: 'text-zinc-600',   label: 'Waiting'     },
    in_progress: { bg: 'bg-blue-50',    text: 'text-blue-600',   label: 'Ongoing'     },
    completed:   { bg: 'bg-green-50',   text: 'text-green-600',  label: 'Done'        },
    enroute:     { bg: 'bg-violet-50',  text: 'text-violet-600', label: 'Enroute'     },
    closed:      { bg: 'bg-zinc-100',   text: 'text-zinc-500',   label: 'Closed'      },
};

const NEXT_STATUS = {
    waiting:     { value: 'in_progress', label: 'Mark as Ongoing',              icon: 'fa-play',        color: 'bg-blue-500 hover:bg-blue-600'   },
    in_progress: { value: 'completed',   label: 'Mark as Done',                 icon: 'fa-check',       color: 'bg-green-500 hover:bg-green-600' },
    completed:   { value: 'enroute',     label: 'Mark as Enroute for Signature', icon: 'fa-paper-plane', color: 'bg-violet-500 hover:bg-violet-600' },
};

let allMyTickets = [];
let myTicketsCurrentPage = 1;
const MY_TICKETS_PAGE_SIZE = 10;
let myTicketsFilteredCache = [];

/* ── Fetch ───────────────────────────────────────────────── */
async function loadMyTickets() {
    const body    = document.getElementById('my-tickets-body');
    const loading = document.getElementById('my-tickets-loading');
    const empty   = document.getElementById('my-tickets-empty');

    loading.classList.remove('hidden');
    empty.classList.add('hidden');
    body.querySelectorAll('.ticket-row').forEach(r => r.remove());

    try {
        const res  = await fetch('./API/get-my-tickets-api.php');
        const data = await res.json();

        loading.classList.add('hidden');

        if (!data.success || data.data.length === 0) {
            empty.classList.remove('hidden');
            empty.classList.add('flex');
            updateStats([]);
            updateMyTicketsPagination([]);
            return;
        }

        allMyTickets = data.data;
        myTicketsCurrentPage = 1;
        myTicketsFilteredCache = allMyTickets;
        renderMyTickets(allMyTickets);
        updateStats(allMyTickets);

    } catch (err) {
        loading.classList.add('hidden');
        empty.classList.remove('hidden');
        empty.classList.add('flex');
        console.error('Error loading tickets:', err);
    }
}

/* ── Render Table ────────────────────────────────────────── */
function renderMyTickets(tickets) {
    const body  = document.getElementById('my-tickets-body');
    const empty = document.getElementById('my-tickets-empty');

    body.querySelectorAll('.ticket-row').forEach(r => r.remove());

    if (tickets.length === 0) {
        empty.classList.remove('hidden');
        empty.classList.add('flex');
        updateMyTicketsPagination([]);
        return;
    }
    empty.classList.add('hidden');

    myTicketsFilteredCache = tickets;
    const totalPages = Math.ceil(tickets.length / MY_TICKETS_PAGE_SIZE);
    if (myTicketsCurrentPage > totalPages) myTicketsCurrentPage = totalPages;
    const start = (myTicketsCurrentPage - 1) * MY_TICKETS_PAGE_SIZE;
    const pageTickets = tickets.slice(start, start + MY_TICKETS_PAGE_SIZE);

    pageTickets.forEach(ticket => {
        const status = STATUS[ticket.status] || STATUS.waiting;
        const date   = new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const sectionCount = ticket.sections ? ticket.sections.length : 0;
        const ticketData   = btoa(unescape(encodeURIComponent(JSON.stringify(ticket))));

        const row = document.createElement('div');
        row.className = 'ticket-row grid grid-cols-[1fr_120px_100px_100px_140px_80px] items-center w-full px-5 py-3 border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors gap-3';
        row.innerHTML = `
            <div class="flex items-center gap-3 min-w-0">
                <div class="flex items-center justify-center w-8 h-8 bg-indigo-50 border border-indigo-200 rounded-lg flex-shrink-0">
                    <i class="fa-solid fa-file-lines text-indigo-400 text-xs"></i>
                </div>
                <div class="flex flex-col min-w-0">
                    <p class="text-xs font-semibold text-zinc-800 truncate">${ticket.title}</p>
                    <p class="text-[10px] text-zinc-400 font-medium truncate">${ticket.customer || ''} ${ticket.email_title ? '— ' + ticket.email_title : ''}</p>
                </div>
            </div>
            <div>
                <span class="text-[10px] font-semibold px-2.5 py-1 rounded-full ${status.bg} ${status.text}">${status.label}</span>
            </div>
            <div>
                ${ticket.urgent == 1
                    ? '<span class="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-500"><i class="fa-solid fa-bolt text-[8px] mr-0.5"></i> Urgent</span>'
                    : '<span class="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-500">Non-Urgent</span>'
                }
            </div>
            <div>
                <span class="text-xs text-zinc-500 font-medium">${sectionCount} section${sectionCount !== 1 ? 's' : ''}</span>
            </div>
            <div>
                <span class="text-xs text-zinc-500 font-medium">${date}</span>
            </div>
            <div class="flex justify-center">
                <button data-ticket="${ticketData}"
                    class="view-ticket-btn text-xs font-medium text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-md px-2 py-1 transition-all cursor-pointer">
                    View
                </button>
            </div>
        `;
        body.appendChild(row);
    });

    // Attach click handlers
    body.querySelectorAll('.view-ticket-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const ticket = JSON.parse(decodeURIComponent(escape(atob(btn.dataset.ticket))));
            viewTicket(ticket);
        });
    });

    updateMyTicketsPagination(tickets);
}

/* ── Pagination ─────────────────────────────────────────── */
function updateMyTicketsPagination(tickets) {
    const pag = document.getElementById('my-tickets-pagination');
    if (tickets.length <= MY_TICKETS_PAGE_SIZE) {
        pag.classList.add('hidden');
        return;
    }
    pag.classList.remove('hidden');
    pag.classList.add('flex');

    const total      = tickets.length;
    const totalPages = Math.ceil(total / MY_TICKETS_PAGE_SIZE);
    const start      = (myTicketsCurrentPage - 1) * MY_TICKETS_PAGE_SIZE + 1;
    const end        = Math.min(myTicketsCurrentPage * MY_TICKETS_PAGE_SIZE, total);

    document.getElementById('my-tickets-page-info').textContent = `Showing ${start}–${end} of ${total}`;
    document.getElementById('my-tickets-prev').disabled = myTicketsCurrentPage <= 1;
    document.getElementById('my-tickets-next').disabled = myTicketsCurrentPage >= totalPages;

    // Page number buttons
    const btnsEl = document.getElementById('my-tickets-page-btns');
    btnsEl.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = `flex items-center justify-center w-8 h-8 text-xs font-medium rounded-lg border transition-all cursor-pointer ${i === myTicketsCurrentPage ? 'bg-indigo-500 text-white border-indigo-500' : 'text-zinc-500 bg-white border-zinc-200 hover:bg-zinc-50'}`;
        btn.textContent = i;
        btn.addEventListener('click', () => { myTicketsCurrentPage = i; renderMyTickets(myTicketsFilteredCache); });
        btnsEl.appendChild(btn);
    }
}

function myTicketsPageChange(dir) {
    myTicketsCurrentPage += dir;
    renderMyTickets(myTicketsFilteredCache);
}

/* ── Stats ───────────────────────────────────────────────── */
function updateStats(tickets) {
    document.getElementById('stat-total').textContent   = tickets.length;
    document.getElementById('stat-waiting').textContent  = tickets.filter(t => t.status === 'waiting').length;
    document.getElementById('stat-progress').textContent = tickets.filter(t => t.status === 'in_progress').length;
    document.getElementById('stat-urgent').textContent   = tickets.filter(t => t.urgent == 1).length;
}

/* ── Search ──────────────────────────────────────────────── */
document.getElementById('my-tickets-search')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = allMyTickets.filter(t =>
        (t.title || '').toLowerCase().includes(q) ||
        (t.customer || '').toLowerCase().includes(q) ||
        (t.email_title || '').toLowerCase().includes(q) ||
        (t.status || '').toLowerCase().includes(q)
    );
    myTicketsCurrentPage = 1;
    renderMyTickets(filtered);
});

/* ── Current ticket reference for edit mode ──────────────── */
let currentTicket = null;

/* ── View Ticket Modal ───────────────────────────────────── */
function viewTicket(ticket) {
    currentTicket = ticket;
    const modal  = document.getElementById('ticket-modal');
    const status = STATUS[ticket.status] || STATUS.waiting;

    document.getElementById('modal-ticket-title').textContent = ticket.title;
    document.getElementById('modal-ticket-date').textContent  = 'Created ' + new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const statusEl = document.getElementById('modal-ticket-status');
    statusEl.textContent = status.label;
    statusEl.className   = `text-[10px] font-semibold px-2.5 py-1 rounded-full ${status.bg} ${status.text}`;

    // Show/hide Edit button based on status
    const editBtn = document.getElementById('modal-ticket-edit-btn');
    if (ticket.status === 'waiting') {
        editBtn.classList.remove('hidden');
        editBtn.onclick = () => enterEditMode(ticket);
    } else {
        editBtn.classList.add('hidden');
        editBtn.onclick = null;
    }

    // Logs button
    const logsBtn = document.getElementById('modal-ticket-logs-btn');
    logsBtn.classList.remove('hidden');
    logsBtn.onclick = () => showTicketLogs(ticket);

    const bodyEl = document.getElementById('modal-ticket-body');
    bodyEl.innerHTML = '';

    // ── Ticket detail cards ──
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

    bodyEl.innerHTML += `
        <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-0.5 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
                <p class="text-[10px] text-zinc-400 font-bold tracking-wide">SUBMITTER</p>
                <p class="text-xs font-semibold text-zinc-700">${ticket.submitter || '—'}</p>
            </div>
            <div class="flex flex-col gap-0.5 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
                <p class="text-[10px] text-zinc-400 font-bold tracking-wide">CUSTOMER</p>
                <p class="text-xs font-semibold text-zinc-700">${ticket.customer || '—'}</p>
            </div>
            <div class="flex flex-col gap-0.5 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
                <p class="text-[10px] text-zinc-400 font-bold tracking-wide">TICKET TITLE</p>
                <p class="text-xs font-semibold text-zinc-700">${ticket.email_title || '—'}</p>
            </div>
            <div class="flex flex-col gap-0.5 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
                <p class="text-[10px] text-zinc-400 font-bold tracking-wide">SALES IN CHARGE</p>
                <p class="text-xs font-semibold text-zinc-700">${ticket.sales_in_charge || '—'}</p>
            </div>
            <div class="flex flex-col gap-0.5 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
                <p class="text-[10px] text-zinc-400 font-bold tracking-wide">EMAIL DATE & TIME</p>
                <p class="text-xs font-semibold text-zinc-700">${fmtDate(ticket.date_and_time_of_email)}</p>
            </div>
            <div class="flex flex-col gap-0.5 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
                <p class="text-[10px] text-zinc-400 font-bold tracking-wide">DEADLINE</p>
                <p class="text-xs font-semibold text-zinc-700">${fmtDate(ticket.deadline)}</p>
            </div>
            <div class="flex flex-col gap-0.5 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
                <p class="text-[10px] text-zinc-400 font-bold tracking-wide">CLASSIFICATION</p>
                ${ticket.urgent == 1
                    ? '<span class="text-xs font-semibold text-red-500"><i class="fa-solid fa-bolt text-[8px]"></i> Urgent</span>'
                    : '<span class="text-xs font-semibold text-zinc-600">Non-Urgent</span>'
                }
            </div>
            <div class="flex flex-col gap-0.5 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
                <p class="text-[10px] text-zinc-400 font-bold tracking-wide">TIMELY RESPONSE</p>
                ${ticket.timely_response == null
                    ? '<span class="text-xs font-medium text-zinc-400">—</span>'
                    : ticket.timely_response == 1
                        ? '<span class="text-xs font-semibold text-green-600"><i class="fa-solid fa-circle-check text-[10px]"></i> Yes</span>'
                        : '<span class="text-xs font-semibold text-red-500"><i class="fa-solid fa-circle-xmark text-[10px]"></i> No</span>'
                }
            </div>
        </div>
    `;

    // Remarks
    if (ticket.remarks) {
        bodyEl.innerHTML += `
            <div class="flex flex-col gap-0.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <p class="text-[10px] text-amber-500 font-bold tracking-wide">REMARKS</p>
                <p class="text-xs font-medium text-amber-700">${ticket.remarks}</p>
            </div>
        `;
    }

    // ── Sections ──
    if (ticket.sections && ticket.sections.length > 0) {
        bodyEl.innerHTML += `<hr class="border-zinc-200" />`;

        ticket.sections.forEach((sec, idx) => {
            let imagesHTML = '';
            if (sec.images && sec.images.length > 0) {
                const imgExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];

                imagesHTML = `<div class="flex flex-col gap-2 mt-2">`;

                // Image previews
                const imageFiles = sec.images.filter(img => {
                    const ext = img.image.split('.').pop().toLowerCase();
                    return imgExts.includes(ext);
                });
                const otherFiles = sec.images.filter(img => {
                    const ext = img.image.split('.').pop().toLowerCase();
                    return !imgExts.includes(ext);
                });

                if (imageFiles.length > 0) {
                    imagesHTML += `<div class="flex flex-row flex-wrap gap-2">`;
                    imageFiles.forEach(img => {
                        imagesHTML += `
                            <div class="img-lightbox-trigger group relative rounded-lg overflow-hidden border border-zinc-200 hover:border-indigo-300 transition-all w-24 h-24 flex-shrink-0 cursor-pointer"
                                 data-src="./${img.image}">
                                <img src="./${img.image}" alt="" class="w-full h-full object-cover" />
                                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                                    <i class="fa-solid fa-expand text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"></i>
                                </div>
                            </div>
                        `;
                    });
                    imagesHTML += `</div>`;
                }

                if (otherFiles.length > 0) {
                    imagesHTML += `<div class="flex flex-row flex-wrap gap-2">`;
                    otherFiles.forEach(img => {
                        imagesHTML += `
                            <a href="./${img.image}" target="_blank" class="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1.5 hover:bg-indigo-100 transition-all">
                                <i class="fa-solid fa-paperclip text-indigo-400 text-[10px]"></i>
                                <span class="text-[10px] font-medium text-indigo-600 truncate max-w-32">${img.image.split('/').pop()}</span>
                            </a>
                        `;
                    });
                    imagesHTML += `</div>`;
                }

                imagesHTML += `</div>`;
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

    // ── Footer info ──
    const footerInfo = document.getElementById('modal-ticket-footer-info');
    if (ticket.updated_at) {
        footerInfo.innerHTML = `<p class="text-[10px] text-zinc-400 font-medium">Last updated <span class="text-zinc-600 font-semibold">${fmtDate(ticket.updated_at)}</span></p>`;
    } else {
        footerInfo.innerHTML = '';
    }

    // ── Status action button ──
    const actionEl = document.getElementById('modal-ticket-action');
    const next = NEXT_STATUS[ticket.status];
    if (next) {
        actionEl.innerHTML = `
            <button id="my-status-btn" data-ticket-id="${ticket.id}" data-new-status="${next.value}"
                class="flex items-center gap-1.5 text-xs font-medium text-white ${next.color} rounded-lg px-4 py-2 transition-all cursor-pointer">
                <i class="fa-solid ${next.icon} text-[10px]"></i> ${next.label}
            </button>
        `;
        document.getElementById('my-status-btn').addEventListener('click', handleStatusChange);
    } else {
        actionEl.innerHTML = `
            <span class="text-[10px] font-semibold text-violet-500 bg-violet-50 border border-violet-200 rounded-lg px-3 py-1.5">
                <i class="fa-solid fa-check-double text-[9px]"></i> Final Status
            </span>
        `;
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

/* ── Status Change Handler ───────────────────────────────── */
async function handleStatusChange(e) {
    const btn       = e.currentTarget;
    const ticketId  = btn.dataset.ticketId;
    const newStatus = btn.dataset.newStatus;
    const original  = btn.innerHTML;

    // Prompt for remarks when transitioning to enroute
    if (newStatus === 'enroute') {
        const { value: remarks, isConfirmed } = await Swal.fire({
            title: 'Enroute for Signature',
            input: 'textarea',
            inputLabel: 'Remarks',
            inputPlaceholder: 'Enter remarks for this ticket…',
            inputAttributes: { 'aria-label': 'Remarks' },
            showCancelButton: true,
            confirmButtonText: 'Confirm',
            confirmButtonColor: '#6366f1',
            inputValidator: (value) => {
                if (!value || !value.trim()) return 'Please provide remarks before proceeding.';
            }
        });
        if (!isConfirmed) return;

        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs"></i> Updating...';

        try {
            const formData = new FormData();
            formData.append('ticket_id', ticketId);
            formData.append('new_status', newStatus);
            formData.append('remarks', remarks.trim());

            const res  = await fetch('./API/update-ticket-status-api.php', { method: 'POST', body: formData });
            const data = await res.json();

            if (data.success) {
                Swal.fire({ icon: 'success', title: 'Status Updated', text: data.message, confirmButtonColor: '#6366f1', timer: 1500, showConfirmButton: false });
                window.closeTicketModal();
                loadMyTickets();
            } else {
                Swal.fire({ icon: 'error', title: 'Error', text: data.message });
                btn.disabled = false; btn.innerHTML = original;
            }
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Network error. Please try again.' });
            btn.disabled = false; btn.innerHTML = original;
        }
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs"></i> Updating...';

    try {
        const formData = new FormData();
        formData.append('ticket_id', ticketId);
        formData.append('new_status', newStatus);

        const res  = await fetch('./API/update-ticket-status-api.php', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: 'Status Updated',
                text: data.message,
                confirmButtonColor: '#6366f1',
                timer: 1500,
                showConfirmButton: false
            });
            window.closeTicketModal();
            loadMyTickets();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: data.message });
            btn.disabled = false;
            btn.innerHTML = original;
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Network error. Please try again.' });
        btn.disabled = false;
        btn.innerHTML = original;
    }
}

/* ── Edit Mode ───────────────────────────────────────────── */
function enterEditMode(ticket) {
    const bodyEl   = document.getElementById('modal-ticket-body');
    const footerEl = document.getElementById('modal-ticket-footer');
    const editBtn  = document.getElementById('modal-ticket-edit-btn');

    // Hide edit button while editing
    editBtn.classList.add('hidden');

    // Helper to format datetime-local value
    const toLocal = (d) => {
        if (!d) return '';
        const dt = new Date(d);
        if (isNaN(dt)) return '';
        const pad = n => String(n).padStart(2, '0');
        return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    };

    const inputCls = 'w-full text-xs font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 transition-all placeholder:text-zinc-300';
    const labelCls = 'text-[10px] text-zinc-400 font-bold tracking-wide';

    // Build editable form
    bodyEl.innerHTML = `
        <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
                <label class="${labelCls}">CUSTOMER <span class="text-red-500">*</span></label>
                <input type="text" id="edit-customer" value="${ticket.customer || ''}" placeholder="Customer name" class="${inputCls}" />
            </div>
            <div class="flex flex-col gap-1">
                <label class="${labelCls}">TICKET TITLE <span class="text-red-500">*</span></label>
                <input type="text" id="edit-email-title" value="${ticket.email_title || ''}" placeholder="Ticket title" class="${inputCls}" />
            </div>
            <div class="flex flex-col gap-1 relative">
                <label class="${labelCls}">SALES IN CHARGE <span class="text-red-500">*</span></label>
                <input type="text" id="edit-sales-search" value="${ticket.sales_in_charge || ''}" placeholder="Search sales employee…" autocomplete="off" class="${inputCls}" />
                <input type="hidden" id="edit-sales-value" value="${ticket.sales_in_charge || ''}" />
                <div id="edit-sales-dropdown" class="hidden absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"></div>
            </div>
            <div class="flex flex-col gap-1">
                <label class="${labelCls}">CLASSIFICATION <span class="text-red-500">*</span></label>
                <div class="relative flex items-center">
                    <select id="edit-urgent" class="${inputCls} appearance-none cursor-pointer pr-8">
                        <option value="0" ${ticket.urgent != 1 ? 'selected' : ''}>Non-Urgent</option>
                        <option value="1" ${ticket.urgent == 1 ? 'selected' : ''}>Urgent</option>
                    </select>
                    <i class="fa-solid fa-chevron-down text-[9px] text-zinc-400 absolute right-3 pointer-events-none"></i>
                </div>
            </div>
            <div class="flex flex-col gap-1">
                <label class="${labelCls}">EMAIL DATE & TIME <span class="text-red-500">*</span></label>
                <input type="text" id="edit-email-datetime" value="${toLocal(ticket.date_and_time_of_email)}" placeholder="Select date and time" class="${inputCls}" />
            </div>
            <div class="flex flex-col gap-1">
                <label class="${labelCls}">DEADLINE</label>
                <input type="text" id="edit-deadline" value="${toLocal(ticket.deadline)}" placeholder="Select deadline" class="${inputCls}" />
            </div>
        </div>
        <div class="flex flex-col gap-1">
            <label class="${labelCls}">REMARKS</label>
            <input type="text" id="edit-remarks" value="${ticket.remarks || ''}" placeholder="Optional remarks" class="${inputCls}" />
        </div>
        <hr class="border-zinc-200" />
        <div class="flex items-center justify-between">
            <p class="text-xs font-bold text-zinc-500 tracking-wide">EMAIL SECTIONS</p>
            <button type="button" id="edit-add-section-btn" class="flex items-center gap-1.5 text-xs font-medium text-indigo-600 border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 rounded-md px-3 py-1.5 transition-all cursor-pointer">
                <i class="fa-solid fa-plus text-[10px]"></i> Add Section
            </button>
        </div>
        <div id="edit-sections-container" class="flex flex-col gap-3"></div>
    `;

    // Populate existing sections
    const secContainer = document.getElementById('edit-sections-container');
    const sections = ticket.sections || [];
    if (sections.length === 0) {
        addEditSection(secContainer, 1, '', []);
    } else {
        sections.forEach((sec, idx) => {
            addEditSection(secContainer, idx + 1, sec.body || '', sec.images || []);
        });
    }

    document.getElementById('edit-add-section-btn').addEventListener('click', () => {
        const count = secContainer.children.length + 1;
        addEditSection(secContainer, count, '', []);
    });

    // Wire up sales search dropdown
    initEditSalesDropdown();

    // Initialize Flatpickr on edit date fields
    if (typeof flatpickr !== 'undefined') {
        flatpickr('#edit-email-datetime', { enableTime: true, dateFormat: "Y-m-d H:i" });
        flatpickr('#edit-deadline', { enableTime: true, dateFormat: "Y-m-d H:i" });
    }

    // Replace footer with Save / Cancel buttons
    const footerInfo   = document.getElementById('modal-ticket-footer-info');
    const footerAction = document.getElementById('modal-ticket-action');
    footerInfo.innerHTML = '';
    footerAction.innerHTML = `
        <div class="flex items-center gap-2">
            <button id="edit-cancel-btn" class="text-xs font-medium text-zinc-500 border border-zinc-200 rounded-lg px-4 py-2 hover:bg-zinc-50 transition-all cursor-pointer">Cancel</button>
            <button id="edit-save-btn" class="flex items-center gap-1.5 text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg px-4 py-2 transition-all cursor-pointer">
                <i class="fa-solid fa-check text-[10px]"></i> Save Changes
            </button>
        </div>
    `;

    document.getElementById('edit-cancel-btn').addEventListener('click', () => viewTicket(ticket));
    document.getElementById('edit-save-btn').addEventListener('click', () => saveTicketEdit(ticket));
}

/* ── Add editable section ────────────────────────────────── */
function addEditSection(container, num, body, existingImages) {
    const id  = 'esec-' + Date.now();
    const div = document.createElement('div');
    div.id    = id;
    div.className = 'flex flex-col w-full border border-zinc-200 rounded-xl bg-white overflow-hidden';
    div.style.cssText = 'animation: fadeSlideIn .25s ease both;';

    // Track which existing image IDs to keep (all kept initially)
    div._keptImageIds = (existingImages || []).map(img => img.id);

    div.innerHTML = `
        <div class="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
            <div class="flex items-center gap-2">
                <div class="flex items-center justify-center w-5 h-5 bg-indigo-500/10 border border-indigo-300 rounded-md">
                    <i class="fa-regular fa-envelope text-indigo-500 text-[10px]"></i>
                </div>
                <p class="text-xs font-semibold text-zinc-600">Section ${num}</p>
            </div>
            <button type="button" class="edit-remove-sec flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-red-400 hover:bg-red-50 rounded-md px-2 py-1 transition-all cursor-pointer">
                <i class="fa-solid fa-trash-can text-[10px]"></i> Remove
            </button>
        </div>
        <div class="flex flex-col gap-1 px-4 pt-3 pb-2">
            <p class="text-[10px] text-zinc-400 font-bold tracking-wide">Email Body <span class="text-red-500">*</span></p>
            <textarea data-edit-body rows="3" placeholder="Paste or type the email body…"
                class="w-full bg-transparent border border-zinc-200 rounded-md pt-2 px-2 pb-1 outline-none text-zinc-500 text-xs font-medium resize-none focus:border-indigo-400 transition-all placeholder:text-zinc-300">${body}</textarea>
        </div>
        <div class="flex flex-col gap-1 px-4 pb-3">
            <p class="text-[10px] text-zinc-400 font-bold tracking-wide">Attachments</p>
            <div class="existing-images-container flex flex-row flex-wrap gap-2 mt-1"></div>
            <div class="relative flex flex-col items-center justify-center w-full min-h-16 border-2 border-dashed border-zinc-300 rounded-lg bg-zinc-50 hover:border-indigo-400 transition-all cursor-pointer gap-1 py-3 mt-1">
                <input type="file" class="edit-file-input absolute inset-0 opacity-0 cursor-pointer w-full h-full" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
                <p class="text-[10px] font-medium text-zinc-500">Drop files or <span class="text-indigo-500">browse</span></p>
            </div>
            <div class="edit-file-list flex flex-col gap-1 mt-1"></div>
        </div>
    `;
    container.appendChild(div);

    // Render existing images with remove buttons
    const imgExts = ['jpg','jpeg','png','gif','webp','bmp','svg'];
    const imgContainer = div.querySelector('.existing-images-container');

    if (existingImages && existingImages.length > 0) {
        existingImages.forEach(img => {
            const fname = img.image.split('/').pop();
            const ext   = fname.split('.').pop().toLowerCase();
            const isImg = imgExts.includes(ext);

            const wrapper = document.createElement('div');
            wrapper.className = 'group relative flex-shrink-0';
            wrapper.dataset.imageId = img.id;

            if (isImg) {
                wrapper.innerHTML = `
                    <div class="relative w-16 h-16 rounded-lg border border-zinc-200 overflow-hidden">
                        <img src="./${img.image}" class="w-full h-full object-cover" />
                        <button type="button" class="remove-existing-img absolute top-0.5 right-0.5 flex items-center justify-center w-4 h-4 bg-red-500 hover:bg-red-600 rounded-full text-white text-[8px] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-sm">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>`;
            } else {
                wrapper.innerHTML = `
                    <div class="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1.5">
                        <i class="fa-solid fa-paperclip text-indigo-400 text-[8px]"></i>
                        <span class="text-[10px] font-medium text-indigo-600 truncate max-w-24">${fname}</span>
                        <button type="button" class="remove-existing-img text-zinc-300 hover:text-red-400 text-sm leading-none ml-1 cursor-pointer">&times;</button>
                    </div>`;
            }

            // Remove handler — just hides visually and removes ID from kept list
            wrapper.querySelector('.remove-existing-img').addEventListener('click', () => {
                const idx = div._keptImageIds.indexOf(img.id);
                if (idx > -1) div._keptImageIds.splice(idx, 1);
                wrapper.style.transition = 'opacity .15s, transform .15s';
                wrapper.style.opacity = '0';
                wrapper.style.transform = 'scale(.9)';
                setTimeout(() => wrapper.remove(), 150);
            });

            imgContainer.appendChild(wrapper);
        });
    }

    // Store new files reference
    div._editFiles = [];

    // Remove section handler
    div.querySelector('.edit-remove-sec').addEventListener('click', () => {
        div.style.transition = 'opacity .2s, transform .2s';
        div.style.opacity = '0';
        div.style.transform = 'scale(.98)';
        setTimeout(() => div.remove(), 200);
    });

    // File input handler
    const fi = div.querySelector('.edit-file-input');
    const fl = div.querySelector('.edit-file-list');
    fi.addEventListener('change', () => {
        Array.from(fi.files).forEach(f => {
            if (div._editFiles.length >= 2) return;
            div._editFiles.push(f);
            const row = document.createElement('div');
            row.className = 'flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1.5';
            row.innerHTML = `<span class="text-[10px] font-medium text-indigo-700 truncate">${f.name}</span>
                <button type="button" class="text-zinc-300 hover:text-red-400 text-sm leading-none cursor-pointer">&times;</button>`;
            row.querySelector('button').addEventListener('click', () => {
                const idx = div._editFiles.indexOf(f);
                if (idx > -1) div._editFiles.splice(idx, 1);
                row.remove();
            });
            fl.appendChild(row);
        });
        fi.value = '';
    });
}

/* ── Sales dropdown for edit mode ────────────────────────── */
function initEditSalesDropdown() {
    const input    = document.getElementById('edit-sales-search');
    const hidden   = document.getElementById('edit-sales-value');
    const dropdown = document.getElementById('edit-sales-dropdown');
    if (!input || !dropdown) return;

    let timer = null;
    input.addEventListener('input', () => {
        hidden.value = input.value;
        clearTimeout(timer);
        timer = setTimeout(() => fetchEditSales(input.value.trim()), 250);
    });
    input.addEventListener('focus', () => fetchEditSales(input.value.trim()));

    async function fetchEditSales(q) {
        try {
            const url = q ? `./API/get-sales-employees-api.php?search=${encodeURIComponent(q)}` : './API/get-sales-employees-api.php';
            const res = await fetch(url);
            const data = await res.json();
            if (!data.success || data.data.length === 0) {
                dropdown.innerHTML = '<div class="py-3 px-3 text-center"><p class="text-[10px] text-zinc-400">No employees found</p></div>';
                dropdown.classList.remove('hidden');
                return;
            }
            dropdown.innerHTML = data.data.map(emp => {
                const mi = emp.MiddleName ? emp.MiddleName.charAt(0) + '.' : '';
                const full = `${emp.FirstName} ${mi} ${emp.LastName}`.replace(/\s+/g, ' ').trim();
                return `<div class="edit-sales-opt flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-indigo-50 transition-colors" data-value="${full}">
                    <p class="text-xs font-semibold text-zinc-700">${full}</p>
                </div>`;
            }).join('');
            dropdown.classList.remove('hidden');
            dropdown.querySelectorAll('.edit-sales-opt').forEach(opt => {
                opt.addEventListener('click', () => {
                    input.value = opt.dataset.value;
                    hidden.value = opt.dataset.value;
                    dropdown.classList.add('hidden');
                });
            });
        } catch (e) { console.error(e); }
    }

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#edit-sales-search') && !e.target.closest('#edit-sales-dropdown')) {
            dropdown.classList.add('hidden');
        }
    });
}

/* ── Save Ticket Edit ────────────────────────────────────── */
async function saveTicketEdit(ticket) {
    const saveBtn = document.getElementById('edit-save-btn');
    const original = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs"></i> Saving...';

    try {
        const secEls = document.getElementById('edit-sections-container').children;
        if (secEls.length === 0) {
            Swal.fire({ icon: 'warning', title: 'No Sections', text: 'At least one section is required.' });
            saveBtn.disabled = false; saveBtn.innerHTML = original;
            return;
        }

        const sections = [];
        const formData = new FormData();

        for (let i = 0; i < secEls.length; i++) {
            const body = secEls[i].querySelector('[data-edit-body]')?.value?.trim() || '';
            if (!body) {
                Swal.fire({ icon: 'warning', title: 'Missing Body', text: `Section ${i+1} requires an email body.` });
                saveBtn.disabled = false; saveBtn.innerHTML = original;
                return;
            }
            sections.push({
                sub_title: 'Section ' + (i+1),
                body,
                kept_image_ids: secEls[i]._keptImageIds || []
            });
            const files = secEls[i]._editFiles || [];
            files.forEach(f => formData.append(`attachments_section_${i}[]`, f));
        }

        formData.append('ticket_id',              ticket.id);
        formData.append('customer',               document.getElementById('edit-customer')?.value || '');
        formData.append('email_title',            document.getElementById('edit-email-title')?.value || '');
        formData.append('sales_in_charge',        document.getElementById('edit-sales-value')?.value || '');
        formData.append('urgent',                 document.getElementById('edit-urgent')?.value || '0');
        formData.append('date_and_time_of_email', document.getElementById('edit-email-datetime')?.value || '');
        formData.append('deadline',               document.getElementById('edit-deadline')?.value || '');
        formData.append('remarks',                document.getElementById('edit-remarks')?.value || '');
        formData.append('sections',               JSON.stringify(sections));

        const res  = await fetch('./API/update-ticket-api.php', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success) {
            Swal.fire({ icon: 'success', title: 'Ticket Updated', text: data.message, confirmButtonColor: '#6366f1', timer: 1500, showConfirmButton: false });
            window.closeTicketModal();
            loadMyTickets();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: data.message });
            saveBtn.disabled = false; saveBtn.innerHTML = original;
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Network error. Please try again.' });
        saveBtn.disabled = false; saveBtn.innerHTML = original;
    }
}

/* ── Ticket Logs View ────────────────────────────────────── */
async function showTicketLogs(ticket) {
    const bodyEl     = document.getElementById('modal-ticket-body');
    const footerInfo = document.getElementById('modal-ticket-footer-info');
    const actionEl   = document.getElementById('modal-ticket-action');
    const editBtn    = document.getElementById('modal-ticket-edit-btn');
    const logsBtn    = document.getElementById('modal-ticket-logs-btn');

    editBtn.classList.add('hidden');
    logsBtn.classList.add('hidden');

    // Loading state
    bodyEl.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12 gap-3">
            <i class="fa-solid fa-spinner fa-spin text-indigo-400 text-xl"></i>
            <p class="text-xs text-zinc-400 font-medium">Loading activity logs…</p>
        </div>`;
    footerInfo.innerHTML = '';
    actionEl.innerHTML = `
        <button id="logs-back-btn" class="flex items-center gap-1.5 text-xs font-medium text-zinc-500 border border-zinc-200 rounded-lg px-4 py-2 hover:bg-zinc-50 transition-all cursor-pointer">
            <i class="fa-solid fa-arrow-left text-[10px]"></i> Back
        </button>`;
    document.getElementById('logs-back-btn').addEventListener('click', () => viewTicket(ticket));

    const ACTION_META = {
        create: { icon: 'fa-plus',        bg: 'bg-green-50',  border: 'border-green-200', iconColor: 'text-green-500', label: 'Created' },
        edit:   { icon: 'fa-pen',         bg: 'bg-amber-50',  border: 'border-amber-200', iconColor: 'text-amber-500', label: 'Edited'  },
        status: { icon: 'fa-arrow-right', bg: 'bg-blue-50',   border: 'border-blue-200',  iconColor: 'text-blue-500',  label: 'Status Changed' },
    };

    const STATUS_LABELS = {
        waiting: 'Waiting', in_progress: 'Ongoing', completed: 'Done', enroute: 'Enroute', closed: 'Closed'
    };

    try {
        const res  = await fetch(`./API/get-ticket-logs-api.php?ticket_id=${ticket.id}`);
        const data = await res.json();

        if (!data.success || data.data.length === 0) {
            bodyEl.innerHTML = `
                <div class="flex flex-col items-center justify-center py-12 gap-2">
                    <div class="flex items-center justify-center w-10 h-10 bg-zinc-100 rounded-xl">
                        <i class="fa-solid fa-clock-rotate-left text-zinc-300 text-base"></i>
                    </div>
                    <p class="text-sm font-semibold text-zinc-400">No logs yet</p>
                    <p class="text-xs text-zinc-300 font-medium">Activity will appear here once actions are taken</p>
                </div>`;
            return;
        }

        const fmtLog = (d) => {
            if (!d) return '—';
            const dt = new Date(d);
            return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' · ' +
                   dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        };

        let html = '<div class="flex flex-col gap-0">';
        data.data.forEach((log, idx) => {
            const meta = ACTION_META[log.action] || ACTION_META.edit;
            const isLast = idx === data.data.length - 1;

            // Build description based on action
            let desc = '';
            if (log.action === 'create') {
                desc = `Created ticket <span class="font-semibold text-zinc-700">${log.title || ''}</span>`;
            } else if (log.action === 'edit') {
                desc = `Edited ticket details`;
            } else if (log.action === 'status') {
                desc = `Changed status to <span class="font-semibold text-zinc-700">${STATUS_LABELS[log.status] || log.status}</span>`;
            }

            // Build changed fields summary for edits
            let changesHTML = '';
            if (log.action === 'edit') {
                const fields = [];
                if (log.customer) fields.push(`Customer: ${log.customer}`);
                if (log.email_title) fields.push(`Title: ${log.email_title}`);
                if (log.sales_in_charge) fields.push(`Sales: ${log.sales_in_charge}`);
                if (log.urgent !== null) fields.push(`Urgency: ${log.urgent == 1 ? 'Urgent' : 'Non-Urgent'}`);
                if (fields.length > 0) {
                    changesHTML = `<div class="flex flex-wrap gap-1.5 mt-1.5">${fields.map(f => `<span class="text-[10px] font-medium text-zinc-500 bg-zinc-100 rounded px-1.5 py-0.5">${f}</span>`).join('')}</div>`;
                }
            }

            html += `
                <div class="flex gap-3 relative">
                    <!-- Timeline line -->
                    ${!isLast ? '<div class="absolute left-[13px] top-7 bottom-0 w-px bg-zinc-200"></div>' : ''}
                    <!-- Icon -->
                    <div class="flex items-center justify-center w-7 h-7 ${meta.bg} ${meta.border} border rounded-full flex-shrink-0 z-10">
                        <i class="fa-solid ${meta.icon} ${meta.iconColor} text-[10px]"></i>
                    </div>
                    <!-- Content -->
                    <div class="flex flex-col gap-0.5 pb-4 min-w-0 flex-1">
                        <p class="text-xs font-semibold text-zinc-700">${meta.label}</p>
                        <p class="text-[11px] text-zinc-500 font-medium">${desc}</p>
                        ${changesHTML}
                        <div class="flex items-center gap-2 mt-1">
                            <p class="text-[10px] text-zinc-400 font-medium">${fmtLog(log.changed_at)}</p>
                            <span class="text-[10px] text-zinc-300">·</span>
                            <p class="text-[10px] text-zinc-400 font-medium">${log.changed_by_name || log.changed_by || '—'}</p>
                        </div>
                    </div>
                </div>`;
        });
        html += '</div>';

        bodyEl.innerHTML = html;

    } catch (err) {
        console.error('Error loading logs:', err);
        bodyEl.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 gap-2">
                <p class="text-sm font-semibold text-red-400">Failed to load logs</p>
                <p class="text-xs text-zinc-400">Please try again</p>
            </div>`;
    }
}

/* ── Image Lightbox ──────────────────────────────────────── */
function ensureLightbox() {
    if (document.getElementById('img-lightbox')) return;
    const lb = document.createElement('div');
    lb.id = 'img-lightbox';
    lb.className = 'fixed inset-0 z-[9999] hidden items-center justify-center bg-black/70 backdrop-blur-sm';
    lb.innerHTML = `
        <button id="lightbox-close" class="absolute top-4 right-4 text-white/70 hover:text-white transition-colors cursor-pointer z-10">
            <i class="fa-solid fa-xmark text-2xl"></i>
        </button>
        <img id="lightbox-img" src="" alt="" class="max-w-[90vw] max-h-[85vh] rounded-xl shadow-2xl object-contain" />
    `;
    document.body.appendChild(lb);

    lb.addEventListener('click', (e) => {
        if (e.target === lb || e.target.closest('#lightbox-close')) {
            lb.classList.add('hidden');
            lb.classList.remove('flex');
        }
    });
}

function openLightbox(src) {
    ensureLightbox();
    const lb  = document.getElementById('img-lightbox');
    const img = document.getElementById('lightbox-img');
    img.src = src;
    lb.classList.remove('hidden');
    lb.classList.add('flex');
}

// Delegate click events for lightbox triggers
document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.img-lightbox-trigger');
    if (trigger) {
        e.preventDefault();
        openLightbox(trigger.dataset.src);
    }
});

/* ── Expose globals ──────────────────────────────────────── */
window.loadMyTickets       = loadMyTickets;
window.myTicketsPageChange = myTicketsPageChange;
window.closeTicketModal = function() {
    const modal = document.getElementById('ticket-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
};

document.getElementById('ticket-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) window.closeTicketModal();
});

/* ── Initial Load ────────────────────────────────────────── */
loadMyTickets();

})();
