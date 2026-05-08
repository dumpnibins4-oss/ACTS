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
            return;
        }

        allMyTickets = data.data;
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
        return;
    }
    empty.classList.add('hidden');

    tickets.forEach(ticket => {
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
                    : '<span class="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-500">Normal</span>'
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
    renderMyTickets(filtered);
});

/* ── View Ticket Modal ───────────────────────────────────── */
function viewTicket(ticket) {
    const modal  = document.getElementById('ticket-modal');
    const status = STATUS[ticket.status] || STATUS.waiting;

    document.getElementById('modal-ticket-title').textContent = ticket.title;
    document.getElementById('modal-ticket-date').textContent  = 'Created ' + new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const statusEl = document.getElementById('modal-ticket-status');
    statusEl.textContent = status.label;
    statusEl.className   = `text-[10px] font-semibold px-2.5 py-1 rounded-full ${status.bg} ${status.text}`;

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
window.loadMyTickets    = loadMyTickets;
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
