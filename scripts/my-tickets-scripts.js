/* ── My Tickets Scripts ────────────────────────────────────── */
(function() {
    const STATUS = {
        waiting:     { bg: 'bg-zinc-100',   text: 'text-zinc-600',   label: 'Waiting'     },
        in_progress: { bg: 'bg-blue-50',    text: 'text-blue-600',   label: 'Ongoing'     },
        pending:     { bg: 'bg-orange-50',  text: 'text-orange-600', label: 'Pending'     },
        completed:   { bg: 'bg-green-50',   text: 'text-green-600',  label: 'Done'        },
        enroute:     { bg: 'bg-violet-50',  text: 'text-violet-600', label: 'Enroute'     },
        closed:      { bg: 'bg-zinc-100',   text: 'text-zinc-500',   label: 'Closed'      },
    };

    const NEXT_STATUS_MAP = {
        waiting:     { value: 'in_progress', label: 'Mark as Ongoing',              icon: 'fa-play',        color: 'bg-blue-500 hover:bg-blue-600'   },
        in_progress: { value: 'completed',   label: 'Mark as Done',                 icon: 'fa-check',       color: 'bg-green-500 hover:bg-green-600' },
        pending:     { value: 'in_progress', label: 'Resume as Ongoing',            icon: 'fa-play',        color: 'bg-blue-500 hover:bg-blue-600'   },
        enroute:     { value: 'completed',   label: 'Mark as Done',                 icon: 'fa-check',       color: 'bg-green-500 hover:bg-green-600' },
    };

    function getNextStatus(ticket) {
        if (ticket.status === 'in_progress' && ticket.signature_requirement == 1) {
            return { value: 'enroute', label: 'Mark as Enroute for Signature', icon: 'fa-paper-plane', color: 'bg-violet-500 hover:bg-violet-600' };
        }
        return NEXT_STATUS_MAP[ticket.status] || null;
    }

    // Optional secondary action for in_progress
    const SECONDARY_STATUS = {
        in_progress: { value: 'pending', label: 'Set as Pending', icon: 'fa-pause', color: 'bg-orange-500 hover:bg-orange-600' },
    };

    /* ── Countdown Timer Helpers ─────────────────────────────── */
    function getAcknowledgeDeadlineMs(ticket) {
        if (!ticket.date_and_time_of_email) return null
        const emailTime = new Date(ticket.date_and_time_of_email).getTime()
        const hours = ticket.urgent == 1 ? 24 : 48
        return emailTime + hours * 3600000
    }

    function getStoredDeadlineMs(ticket) {
        if (!ticket.deadline) return null
        return new Date(ticket.deadline).getTime()
    }

    function formatCountdown(diffMs) {
        if (diffMs <= 0) return { text: 'Overdue', overdue: true }
        const h = Math.floor(diffMs / 3600000)
        const m = Math.floor((diffMs % 3600000) / 60000)
        const s = Math.floor((diffMs % 60000) / 1000)
        const pad = n => String(n).padStart(2, '0')
        return { text: `${pad(h)}:${pad(m)}:${pad(s)}`, overdue: false }
    }

    function startMyTicketsTimers() {
        if (window._myTicketsTimerInterval) clearInterval(window._myTicketsTimerInterval)
        window._myTicketsTimerInterval = setInterval(() => {
            document.querySelectorAll('.my-ack-countdown').forEach(el => {
                const diff = parseInt(el.dataset.deadline) - Date.now()
                const { text, overdue } = formatCountdown(diff)
                el.textContent = overdue ? '⚠ Overdue' : `Acknowledge before: ⏱ ${text}`
                el.className = `my-ack-countdown text-xs font-semibold px-1.5 py-0.5 rounded mt-0.5 w-fit ${
                    overdue ? 'bg-red-50 text-red-500' : diff < 3600000 ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-500'
                }`
            })
            document.querySelectorAll('.my-deadline-countdown').forEach(el => {
                const diff = parseInt(el.dataset.deadline) - Date.now()
                const { text, overdue } = formatCountdown(diff)
                el.textContent = overdue ? '⚠ Deadline passed' : `Deadline in: ⏱ ${text}`
                el.className = `my-deadline-countdown text-xs font-semibold px-1.5 py-0.5 rounded mt-0.5 w-fit ${
                    overdue ? 'bg-red-50 text-red-500' : diff < 3600000 ? 'bg-amber-50 text-amber-600' : 'bg-violet-50 text-violet-500'
                }`
            })
        }, 1000)
    }

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
            const res  = await fetch('./API/get-tickets-api.php?filter=active');
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

            // Populate creator filter
            const creatorSelect = document.getElementById('my-tickets-filter-creator');
            if (creatorSelect) {
                const currentVal = creatorSelect.value;
                creatorSelect.innerHTML = '<option value="all">All Creators</option>';
                const creators = [...new Set(allMyTickets.map(t => t.FirstName && t.LastName ? `${t.FirstName} ${t.LastName}`.trim() : t.submitter || t.created_by))].filter(Boolean).sort();
                creators.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c;
                    opt.textContent = c;
                    creatorSelect.appendChild(opt);
                });
                if (Array.from(creatorSelect.options).some(o => o.value === currentVal)) creatorSelect.value = currentVal;
            }

            applyMyTicketsFilters();

        } catch (err) {
            loading.classList.add('hidden');
            empty.classList.remove('hidden');
            empty.classList.add('flex');
            console.error('Error loading tickets:', err);
        }
    }

    /* ── Filtering ──────────────────────────────────────────── */
    window.applyMyTicketsFilters = function() {
        const search   = (document.getElementById('my-tickets-search')?.value || '').toLowerCase();
        const status   = document.getElementById('my-tickets-filter-status')?.value || 'all';
        const urgency  = document.getElementById('my-tickets-filter-urgency')?.value || 'all';
        const creator  = document.getElementById('my-tickets-filter-creator')?.value || 'all';
        const dateFrom = document.getElementById('my-tickets-date-from')?.value || '';
        const dateTo   = document.getElementById('my-tickets-date-to')?.value || '';

        let filtered = allMyTickets;

        if (status !== 'all') {
            filtered = filtered.filter(t => t.status === status);
        }
        if (urgency !== 'all') {
            filtered = filtered.filter(t => String(t.urgent) === urgency);
        }
        if (creator !== 'all') {
            filtered = filtered.filter(t => {
                const name = t.FirstName && t.LastName ? `${t.FirstName} ${t.LastName}`.trim() : t.submitter || t.created_by;
                return name === creator;
            });
        }
        if (dateFrom) {
            filtered = filtered.filter(t => {
                const d = (t.created_at || '').substring(0, 10);
                return d >= dateFrom;
            });
        }
        if (dateTo) {
            filtered = filtered.filter(t => {
                const d = (t.created_at || '').substring(0, 10);
                return d <= dateTo;
            });
        }
        if (search) {
            filtered = filtered.filter(t =>
                (t.title || '').toLowerCase().includes(search) ||
                (t.customer || '').toLowerCase().includes(search) ||
                (t.email_title || '').toLowerCase().includes(search) ||
                (t.status || '').toLowerCase().includes(search) ||
                (t.FirstName || '').toLowerCase().includes(search) ||
                (t.LastName || '').toLowerCase().includes(search) ||
                (t.submitter || '').toLowerCase().includes(search)
            );
        }

        myTicketsCurrentPage = 1;
        renderMyTickets(filtered);
        updateStats(filtered);
    }

    window.clearMyTicketsFilters = function() {
        if (document.getElementById('my-tickets-filter-status')) document.getElementById('my-tickets-filter-status').value = 'all';
        if (document.getElementById('my-tickets-filter-urgency')) document.getElementById('my-tickets-filter-urgency').value = 'all';
        if (document.getElementById('my-tickets-filter-creator')) document.getElementById('my-tickets-filter-creator').value = 'all';
        if (document.getElementById('my-tickets-date-from')) document.getElementById('my-tickets-date-from').value = '';
        if (document.getElementById('my-tickets-date-to')) document.getElementById('my-tickets-date-to').value = '';
        if (document.getElementById('my-tickets-search')) document.getElementById('my-tickets-search').value = '';
        applyMyTicketsFilters();
    }

    const searchInput = document.getElementById('my-tickets-search');
    if (searchInput) {
        searchInput.addEventListener('input', applyMyTicketsFilters);
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
            const ackDeadlineMs      = getAcknowledgeDeadlineMs(ticket)
            const storedDeadlineMs   = getStoredDeadlineMs(ticket)
            const showAckTimer       = ackDeadlineMs !== null && ticket.status === 'waiting'
            const showDeadlineTimer  = storedDeadlineMs !== null && ticket.status !== 'completed' && ticket.status !== 'closed'
            const initAck            = showAckTimer ? formatCountdown(ackDeadlineMs - Date.now()) : null
            const initDeadline       = showDeadlineTimer ? formatCountdown(storedDeadlineMs - Date.now()) : null
            const ticketData   = btoa(unescape(encodeURIComponent(JSON.stringify(ticket))));

            const row = document.createElement('div');
            row.className = 'ticket-row grid grid-cols-[1fr_120px_100px_100px_140px_80px] items-center w-full px-5 py-3 border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors gap-3';
            row.innerHTML = `
                <div class="flex items-center gap-3 min-w-0">
                    <div class="flex items-center justify-center w-8 h-8 bg-indigo-50 border border-indigo-200 rounded-lg flex-shrink-0">
                        <i class="fa-solid fa-file-lines text-indigo-400 text-xs"></i>
                    </div>
                    <div class="flex flex-col min-w-0">
                        <div class="flex flex-row items-center justify-start gap-2 w-full h-auto">
                            <p class="text-xs font-semibold text-zinc-800 truncate">${ticket.title}</p>
                            ${showAckTimer ? `
                                <span class="my-ack-countdown text-xs font-semibold px-1.5 py-0.5 rounded mt-0.5 w-fit ${
                                    initAck.overdue ? 'bg-red-50 text-red-500' : ackDeadlineMs - Date.now() < 3600000 ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-500'
                                }" data-deadline="${ackDeadlineMs}">
                                    ${initAck.overdue ? '⚠ Overdue' : `Acknowledge before: ⏱ ${initAck.text}`}
                                </span>` : ''}
                            ${showDeadlineTimer ? `
                                <span class="my-deadline-countdown text-xs font-semibold px-1.5 py-0.5 rounded mt-0.5 w-fit ${
                                    initDeadline.overdue ? 'bg-red-50 text-red-500' : storedDeadlineMs - Date.now() < 3600000 ? 'bg-amber-50 text-amber-600' : 'bg-violet-50 text-violet-500'
                                }" data-deadline="${storedDeadlineMs}">
                                    ${initDeadline.overdue ? '⚠ Deadline passed' : `Deadline in: ⏱ ${initDeadline.text}`}
                                </span>` : ''}
                        </div>
                        <p class="text-xs text-zinc-400 font-medium truncate">${ticket.customer || ''} ${ticket.email_title ? '— ' + ticket.email_title : ''}</p>
                    </div>
                </div>
                <div>
                    <span class="text-xs font-semibold px-2.5 py-1 rounded-full ${status.bg} ${status.text}">${status.label}</span>
                </div>
                <div>
                    ${ticket.urgent == 1
                        ? '<span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-500"><i class="fa-solid fa-bolt text-[8px] mr-0.5"></i> Urgent</span>'
                        : '<span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-500">Non-Urgent</span>'
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

        startMyTicketsTimers()
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
        document.getElementById('stat-pending').textContent  = tickets.filter(t => t.status === 'pending').length;
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
        statusEl.className   = `text-xs font-semibold px-2.5 py-1 rounded-full ${status.bg} ${status.text}`;

        // Show/hide Edit button based on status and creator
        const editBtn = document.getElementById('modal-ticket-edit-btn');
        const mc = document.getElementById('main-content');
        const currentEmpId = mc ? mc.dataset.empId : '';
        const isCreator = String(ticket.created_by) === String(currentEmpId);
        
        if (ticket.status === 'waiting' && isCreator) {
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
        const canReschedule = ['waiting', 'pending', 'in_progress'].includes(ticket.status) && ticket.deadline && (myRole === 'super_admin' || myRole === 'admin');

        bodyEl.innerHTML += `
            <div class="flex flex-col gap-6 w-full">
                <!-- Metadata Grid -->
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
                    <div class="flex flex-col gap-1">
                        <p class="text-[10px] text-zinc-400 font-bold tracking-widest uppercase">Submitter</p>
                        <p class="text-xs font-semibold text-zinc-700 truncate">${ticket.submitter || '—'}</p>
                    </div>
                    <div class="flex flex-col gap-1">
                        <p class="text-[10px] text-zinc-400 font-bold tracking-widest uppercase">Customer</p>
                        <p class="text-xs font-semibold text-zinc-700 truncate">${ticket.customer || '—'}</p>
                    </div>
                    <div class="flex flex-col gap-1">
                        <p class="text-[10px] text-zinc-400 font-bold tracking-widest uppercase">Sales In Charge</p>
                        <p class="text-xs font-semibold text-zinc-700 truncate">${ticket.sales_in_charge || '—'}</p>
                    </div>
                    <div class="flex flex-col gap-1">
                        <p class="text-[10px] text-zinc-400 font-bold tracking-widest uppercase">Classification</p>
                        ${ticket.urgent == 1
                            ? '<span class="text-xs font-semibold text-red-500 w-fit px-2.5 py-0.5 bg-red-50 rounded-full border border-red-100"><i class="fa-solid fa-bolt text-[10px] mr-1"></i> Urgent</span>'
                            : '<span class="text-xs font-semibold text-zinc-600 w-fit px-2.5 py-0.5 bg-zinc-100 rounded-full border border-zinc-200">Non-Urgent</span>'
                        }
                    </div>
                    <div class="flex flex-col gap-1 lg:col-span-2">
                        <p class="text-[10px] text-zinc-400 font-bold tracking-widest uppercase">Ticket Title</p>
                        <p class="text-xs font-semibold text-zinc-700 truncate">${ticket.email_title || '—'}</p>
                    </div>
                    <div class="flex flex-col gap-1">
                        <p class="text-[10px] text-zinc-400 font-bold tracking-widest uppercase">Email Received</p>
                        <p class="text-xs font-semibold text-zinc-700">${fmtDate(ticket.date_and_time_of_email)}</p>
                    </div>
                    <div class="flex flex-col gap-1">
                        <p class="text-[10px] text-zinc-400 font-bold tracking-widest uppercase">Deadline</p>
                        <div class="flex flex-wrap items-center gap-2">
                            <p class="text-xs font-semibold text-zinc-700">${fmtDate(ticket.deadline)}</p>
                            ${canReschedule ? `
                                <button id="reschedule-deadline-btn" class="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-md shadow-sm transition-all cursor-pointer" title="Reschedule Deadline">
                                    <i class="fa-solid fa-calendar-day text-[10px]"></i> Reschedule
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    <div class="flex flex-col gap-1 col-span-2 lg:col-span-4 mt-2 pt-3 border-t border-zinc-100">
                        <p class="text-[10px] text-zinc-400 font-bold tracking-widest uppercase">Timely Response</p>
                        <div class="flex items-center gap-3 mt-1">
                            ${ticket.timely_response == null
                                ? '<span class="text-[11px] font-medium text-zinc-400 w-fit px-2.5 py-0.5 bg-zinc-100 rounded-full border border-zinc-200">—</span>'
                                : ticket.timely_response == 1
                                    ? '<span class="text-[11px] font-semibold text-green-600 w-fit px-2.5 py-0.5 bg-green-50 rounded-full border border-green-100"><i class="fa-solid fa-circle-check text-[10px] mr-1"></i> Met</span>'
                                    : '<span class="text-[11px] font-semibold text-red-500 w-fit px-2.5 py-0.5 bg-red-50 rounded-full border border-red-100"><i class="fa-solid fa-circle-xmark text-[10px] mr-1"></i> Missed</span>'
                            }
                            <!-- Active Timers -->
                            ${ticket.status === 'waiting' && ticket.date_and_time_of_email ? `
                                <span class="my-ack-countdown text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-500 border border-indigo-100" data-deadline="${getAcknowledgeDeadlineMs(ticket)}">
                                    Ack: ⏱ ${formatCountdown(getAcknowledgeDeadlineMs(ticket) - Date.now()).text}
                                </span>` : ''}
                            ${ticket.status !== 'enroute' && ticket.status !== 'completed' && ticket.deadline ? `
                                <span class="my-deadline-countdown text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-500 border border-violet-100" data-deadline="${getStoredDeadlineMs(ticket)}">
                                    Due: ⏱ ${formatCountdown(getStoredDeadlineMs(ticket) - Date.now()).text}
                                </span>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remarks are now solely accessible via the Logs modal        // ── Sections ──
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
                                    <i class="fa-solid fa-paperclip text-indigo-400 text-xs"></i>
                                    <span class="text-xs font-medium text-indigo-600 truncate max-w-32">${img.image.split('/').pop()}</span>
                                </a>
                            `;
                        });
                        imagesHTML += `</div>`;
                    }

                    imagesHTML += `</div>`;
                }

                bodyEl.innerHTML += `
                    <div class="flex flex-col gap-3 p-5 bg-white border-l-4 border-l-indigo-400 border-y border-r border-zinc-200 rounded-r-xl shadow-sm relative overflow-hidden">
                        <div class="absolute -left-[2px] top-4 bottom-4 w-px bg-indigo-200 opacity-50"></div>
                        <div class="flex items-center gap-2">
                            <div class="flex items-center justify-center w-6 h-6 bg-indigo-50 rounded-md">
                                <i class="fa-solid fa-file-lines text-indigo-500 text-[10px]"></i>
                            </div>
                            <p class="text-sm font-bold text-zinc-700">${sec.sub_title || 'Section ' + (idx + 1)}</p>
                        </div>
                        <div class="pl-8 overflow-y-auto">
                            <p class="text-[13px] text-zinc-600 font-medium whitespace-pre-wrap leading-relaxed break-words">${sec.body || ''}</p>
                            ${imagesHTML}
                        </div>
                    </div>
                `;
            });
        }

        // Wire reschedule button
        if (canReschedule) {
            document.getElementById('reschedule-deadline-btn')?.addEventListener('click', () => handleRescheduleDeadline(ticket));
        }

        // ── Footer info ──
        const footerInfo = document.getElementById('modal-ticket-footer-info');
        if (ticket.updated_at) {
            footerInfo.innerHTML = `<p class="text-xs text-zinc-400 font-medium">Last updated <span class="text-zinc-600 font-semibold">${fmtDate(ticket.updated_at)}</span></p>`;
        } else {
            footerInfo.innerHTML = '';
        }

        // ── Status action buttons ──
        const actionEl = document.getElementById('modal-ticket-action');
        const next = getNextStatus(ticket);
        const secondary = SECONDARY_STATUS[ticket.status];

        if (next || secondary) {
            let btnsHTML = '<div class="flex items-center gap-2">';
            if (secondary) {
                btnsHTML += `
                    <button id="my-secondary-btn" data-ticket-id="${ticket.id}" data-new-status="${secondary.value}"
                        class="flex items-center gap-1.5 text-xs font-medium text-white ${secondary.color} rounded-lg px-3 py-2 transition-all cursor-pointer">
                        <i class="fa-solid ${secondary.icon} text-xs"></i> ${secondary.label}
                    </button>`;
            }
            if (next) {
                btnsHTML += `
                    <button id="my-status-btn" data-ticket-id="${ticket.id}" data-new-status="${next.value}"
                        class="flex items-center gap-1.5 text-xs font-medium text-white ${next.color} rounded-lg px-4 py-2 transition-all cursor-pointer">
                        <i class="fa-solid ${next.icon} text-xs"></i> ${next.label}
                    </button>`;
            }
            btnsHTML += '</div>';
            actionEl.innerHTML = btnsHTML;

            document.getElementById('my-status-btn')?.addEventListener('click', handleStatusChange);
            document.getElementById('my-secondary-btn')?.addEventListener('click', handleStatusChange);
        } else {
            actionEl.innerHTML = `
                <span class="text-xs font-semibold text-violet-500 bg-violet-50 border border-violet-200 rounded-lg px-3 py-1.5">
                    <i class="fa-solid fa-check-double text-[9px]"></i> Final Status
                </span>
            `;
        }

        startMyTicketsTimers()

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    /* ── Status Change Handler (unified for all transitions) ──── */
    async function handleStatusChange(e) {
        const btn       = e.currentTarget;
        const ticketId  = btn.dataset.ticketId;
        const newStatus = btn.dataset.newStatus;
        const original  = btn.innerHTML;

        const STATUS_LABELS = {
            in_progress: 'Ongoing', completed: 'Done', enroute: 'Enroute for Signature', pending: 'Pending'
        };

        // Only show signature toggle if transitioning from waiting -> in_progress
        // We check if the button label implies we're in the initial transition
        const isInitialTransition = (ticketId && newStatus === 'in_progress' && document.querySelector(`[data-ticket-id="${ticketId}"]`)?.closest('tr')?.querySelector('.bg-zinc-100')); 
        // Actually a better way to check is to fetch the current status from the ticket data. 
        // Since we're in handleStatusChange, we don't have the full ticket obj directly, 
        // but we can infer it. If the button label is 'Mark as Ongoing', it's from waiting.
        const isFromWaiting = original.includes('Mark as Ongoing');

        const dialogResult = await showRemarkDialog({
            title: `${STATUS_LABELS[newStatus] || newStatus}`,
            description: 'Enter remarks for this ticket before proceeding. You may also attach files.',
            showSignatureToggle: (newStatus === 'in_progress' && isFromWaiting)
        });

        if (!dialogResult) return;

        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs"></i> Updating...';

        try {
            const formData = new FormData();
            formData.append('ticket_id', ticketId);
            formData.append('new_status', newStatus);
            formData.append('remarks', dialogResult.remarks.trim());
            if (dialogResult.signature_requirement !== null) {
                formData.append('signature_requirement', dialogResult.signature_requirement);
            }
            if (dialogResult.files) {
                dialogResult.files.forEach(f => formData.append('remark_attachments[]', f));
            }

            const res  = await fetch('./API/update-ticket-status-api.php', { method: 'POST', body: formData });
            const data = await res.json();

            if (data.success) {
                toast.success('Status Updated', { description: data.message });
                window.closeTicketModal();
                loadMyTickets();
            } else {
                toast.error('Error', { description: data.message });
                btn.disabled = false; btn.innerHTML = original;
            }
        } catch (err) {
            toast.error('Error', { description: 'Network error. Please try again.' });
            btn.disabled = false; btn.innerHTML = original;
        }
    }

    /* ── Reschedule Deadline Handler ─────────────────────────── */
    async function handleRescheduleDeadline(ticket) {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 z-[9998] flex items-center justify-center bg-black/45 backdrop-blur-sm';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity .15s ease';

        const inputCls = 'w-full text-xs font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 transition-all placeholder:text-zinc-300';

        overlay.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl w-[620px] p-6" style="transform:scale(.95) translateY(10px);transition:transform .2s ease">
                <p class="text-[15px] font-bold text-zinc-800 mb-1">Reschedule Deadline</p>
                <p class="text-[13px] text-zinc-500 mb-5 leading-relaxed">Set a new deadline and provide a reason with supporting attachments.</p>
                <div class="flex flex-col gap-3">
                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-zinc-400 font-bold tracking-wide">NEW DEADLINE <span class="text-red-500">*</span></label>
                        <input type="text" id="resched-deadline" placeholder="Select new deadline" class="${inputCls}" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-zinc-400 font-bold tracking-wide">REASON <span class="text-red-500">*</span></label>
                        <textarea id="resched-reason" rows="3" placeholder="Why is this deadline being rescheduled?" class="${inputCls} resize-none"></textarea>
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-xs text-zinc-400 font-bold tracking-wide">ATTACHMENTS <span class="text-red-500">*</span></label>
                        <div class="relative flex flex-col items-center justify-center w-full min-h-14 border-2 border-dashed border-zinc-300 rounded-lg bg-zinc-50 hover:border-indigo-400 transition-all cursor-pointer gap-1 py-2">
                            <input type="file" id="resched-files" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
                            <p class="text-xs font-medium text-zinc-500">Drop files or <span class="text-indigo-500">browse</span></p>
                        </div>
                        <div id="resched-file-list" class="flex flex-col gap-1 mt-1"></div>
                    </div>
                    <p id="resched-error" class="text-[11px] text-red-500 font-medium hidden"></p>
                </div>
                <div class="flex justify-end gap-2 mt-5">
                    <button id="resched-cancel" class="px-4 py-2 rounded-lg text-[13px] font-semibold text-zinc-500 bg-white border border-zinc-200 hover:bg-zinc-50 transition-all cursor-pointer">Cancel</button>
                    <button id="resched-confirm" class="px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-all cursor-pointer">Reschedule</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            overlay.querySelector('.bg-white').style.transform = 'scale(1) translateY(0)';
        });

        if (typeof flatpickr !== 'undefined') {
            flatpickr('#resched-deadline', { enableTime: true, dateFormat: "Y-m-d H:i" });
        }

        const reschedFiles = [];
        document.getElementById('resched-files').addEventListener('change', (e) => {
            Array.from(e.target.files).forEach(f => {
                reschedFiles.push(f);
                const row = document.createElement('div');
                row.className = 'flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1.5';
                row.innerHTML = `<span class="text-xs font-medium text-indigo-700 truncate">${f.name}</span>
                    <button type="button" class="text-zinc-300 hover:text-red-400 text-xs leading-none cursor-pointer">&times;</button>`;
                row.querySelector('button').addEventListener('click', () => {
                    const idx = reschedFiles.indexOf(f);
                    if (idx > -1) reschedFiles.splice(idx, 1);
                    row.remove();
                });
                document.getElementById('resched-file-list').appendChild(row);
            });
            e.target.value = '';
        });

        const closeOverlay = () => {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 150);
        };

        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlay(); });
        document.getElementById('resched-cancel').addEventListener('click', closeOverlay);

        document.getElementById('resched-confirm').addEventListener('click', async () => {
            const newDeadline = document.getElementById('resched-deadline').value;
            const reason = document.getElementById('resched-reason').value;
            const errEl = document.getElementById('resched-error');

            if (!newDeadline) { errEl.textContent = 'Please select a new deadline.'; errEl.classList.remove('hidden'); return; }
            if (!reason || !reason.trim()) { errEl.textContent = 'Please provide a reason.'; errEl.classList.remove('hidden'); return; }
            if (reschedFiles.length === 0) { errEl.textContent = 'At least one attachment is required.'; errEl.classList.remove('hidden'); return; }

            const confirmBtn = document.getElementById('resched-confirm');
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Saving...';

            try {
                const formData = new FormData();
                formData.append('ticket_id', ticket.id);
                formData.append('new_deadline', newDeadline);
                formData.append('reason', reason.trim());
                reschedFiles.forEach(f => formData.append('reschedule_attachments[]', f));

                const res = await fetch('./API/reschedule-deadline-api.php', { method: 'POST', body: formData });
                const data = await res.json();

                if (data.success) {
                    toast.success('Deadline Rescheduled', { description: data.message });
                    closeOverlay();
                    window.closeTicketModal();
                    loadMyTickets();
                } else {
                    errEl.textContent = data.message; errEl.classList.remove('hidden');
                    confirmBtn.disabled = false; confirmBtn.textContent = 'Reschedule';
                }
            } catch (err) {
                errEl.textContent = 'Network error. Please try again.'; errEl.classList.remove('hidden');
                confirmBtn.disabled = false; confirmBtn.textContent = 'Reschedule';
            }
        });
    }

    /* ── Remark Dialog (textarea + file upload) ──────────────── */
    function showRemarkDialog(opts) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'fixed inset-0 z-[9998] flex items-center justify-center bg-black/45 backdrop-blur-sm';
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity .15s ease';

            let signatureToggleHTML = '';
            if (opts.showSignatureToggle) {
                signatureToggleHTML = `
                    <div class="flex items-center justify-between bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2.5 mt-1">
                        <div class="flex flex-col">
                            <p class="text-xs font-bold text-zinc-700">Requires Signature</p>
                            <p class="text-xs text-zinc-500 font-medium">Will this ticket need to be enrouted?</p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="remark-dlg-signature" class="sr-only peer" checked>
                            <div class="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                        </label>
                    </div>
                `;
            }

            overlay.innerHTML = `
                <div class="bg-white rounded-2xl shadow-2xl w-[620px] p-6" style="transform:scale(.95) translateY(10px);transition:transform .2s ease">
                    <p class="text-[15px] font-bold text-zinc-800 mb-1">${opts.title || 'Remarks'}</p>
                    <p class="text-[13px] text-zinc-500 mb-5 leading-relaxed">${opts.description || ''}</p>
                    <div class="flex flex-col gap-3">
                        ${signatureToggleHTML}
                        <textarea id="remark-dlg-text" rows="3" placeholder="Enter remarks…" class="w-full text-xs font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 transition-all placeholder:text-zinc-300 resize-none h-40"></textarea>
                        <div class="flex flex-col gap-1">
                            <label class="text-xs text-zinc-400 font-bold tracking-wide">ATTACHMENTS (optional)</label>
                            <div class="relative flex flex-col items-center justify-center w-full min-h-12 border-2 border-dashed border-zinc-300 rounded-lg bg-zinc-50 hover:border-indigo-400 transition-all cursor-pointer gap-1 py-2">
                                <input type="file" id="remark-dlg-files" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
                                <p class="text-xs font-medium text-zinc-500">Drop files or <span class="text-indigo-500">browse</span></p>
                            </div>
                            <div id="remark-dlg-file-list" class="flex flex-col gap-1"></div>
                        </div>
                        <p id="remark-dlg-error" class="text-[11px] text-red-500 font-medium hidden"></p>
                    </div>
                    <div class="flex justify-end gap-2 mt-5">
                        <button id="remark-dlg-cancel" class="px-4 py-2 rounded-lg text-[13px] font-semibold text-zinc-500 bg-white border border-zinc-200 hover:bg-zinc-50 transition-all cursor-pointer">Cancel</button>
                        <button id="remark-dlg-confirm" class="px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-all cursor-pointer">Confirm</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
                overlay.querySelector('.bg-white').style.transform = 'scale(1) translateY(0)';
            });

            const remarkFiles = [];
            document.getElementById('remark-dlg-files').addEventListener('change', (e) => {
                Array.from(e.target.files).forEach(f => {
                    remarkFiles.push(f);
                    const row = document.createElement('div');
                    row.className = 'flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1.5';
                    row.innerHTML = `<span class="text-xs font-medium text-indigo-700 truncate">${f.name}</span>
                        <button type="button" class="text-zinc-300 hover:text-red-400 text-xs leading-none cursor-pointer">&times;</button>`;
                    row.querySelector('button').addEventListener('click', () => {
                        const idx = remarkFiles.indexOf(f);
                        if (idx > -1) remarkFiles.splice(idx, 1);
                        row.remove();
                    });
                    document.getElementById('remark-dlg-file-list').appendChild(row);
                });
                e.target.value = '';
            });

            const closeOverlay = () => {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 150);
            };

            overlay.addEventListener('click', (e) => { if (e.target === overlay) { closeOverlay(); resolve(null); } });
            document.getElementById('remark-dlg-cancel').addEventListener('click', () => { closeOverlay(); resolve(null); });

            document.getElementById('remark-dlg-confirm').addEventListener('click', () => {
                const text = document.getElementById('remark-dlg-text').value;
                const errEl = document.getElementById('remark-dlg-error');
                if (!text || !text.trim()) { errEl.textContent = 'Please provide remarks.'; errEl.classList.remove('hidden'); return; }

                let signatureReq = null;
                if (opts.showSignatureToggle) {
                    signatureReq = document.getElementById('remark-dlg-signature').checked ? 1 : 0;
                }

                closeOverlay();
                resolve({ remarks: text, files: remarkFiles, signature_requirement: signatureReq });
            });

            setTimeout(() => document.getElementById('remark-dlg-text')?.focus(), 100);
        });
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
        const labelCls = 'text-xs text-zinc-400 font-bold tracking-wide';

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
            <hr class="border-zinc-200" />
            <div class="flex items-center justify-between">
                <p class="text-xs font-bold text-zinc-500 tracking-wide">EMAIL SECTIONS</p>
                <button type="button" id="edit-add-section-btn" class="flex items-center gap-1.5 text-xs font-medium text-indigo-600 border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 rounded-md px-3 py-1.5 transition-all cursor-pointer">
                    <i class="fa-solid fa-plus text-xs"></i> Add Section
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
                    <i class="fa-solid fa-check text-xs"></i> Save Changes
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
                        <i class="fa-regular fa-envelope text-indigo-500 text-xs"></i>
                    </div>
                    <p class="text-xs font-semibold text-zinc-600">Section ${num}</p>
                </div>
                <button type="button" class="edit-remove-sec flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-red-400 hover:bg-red-50 rounded-md px-2 py-1 transition-all cursor-pointer">
                    <i class="fa-solid fa-trash-can text-xs"></i> Remove
                </button>
            </div>
            <div class="flex flex-col gap-1 px-4 pt-3 pb-2">
                <p class="text-xs text-zinc-400 font-bold tracking-wide">Email Body <span class="text-red-500">*</span></p>
                <textarea data-edit-body rows="3" placeholder="Paste or type the email body…"
                    class="w-full bg-transparent border border-zinc-200 rounded-md pt-2 px-2 pb-1 outline-none text-zinc-500 text-xs font-medium resize-none focus:border-indigo-400 transition-all placeholder:text-zinc-300">${body}</textarea>
            </div>
            <div class="flex flex-col gap-1 px-4 pb-3">
                <p class="text-xs text-zinc-400 font-bold tracking-wide">Attachments</p>
                <div class="existing-images-container flex flex-row flex-wrap gap-2 mt-1"></div>
                <div class="relative flex flex-col items-center justify-center w-full min-h-16 border-2 border-dashed border-zinc-300 rounded-lg bg-zinc-50 hover:border-indigo-400 transition-all cursor-pointer gap-1 py-3 mt-1">
                    <input type="file" class="edit-file-input absolute inset-0 opacity-0 cursor-pointer w-full h-full" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
                    <p class="text-xs font-medium text-zinc-500">Drop files or <span class="text-indigo-500">browse</span></p>
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
                            <span class="text-xs font-medium text-indigo-600 truncate max-w-24">${fname}</span>
                            <button type="button" class="remove-existing-img text-zinc-300 hover:text-red-400 text-xs leading-none ml-1 cursor-pointer">&times;</button>
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
                row.innerHTML = `<span class="text-xs font-medium text-indigo-700 truncate">${f.name}</span>
                    <button type="button" class="text-zinc-300 hover:text-red-400 text-xs leading-none cursor-pointer">&times;</button>`;
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
                    dropdown.innerHTML = '<div class="py-3 px-3 text-center"><p class="text-xs text-zinc-400">No employees found</p></div>';
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
                toast.warning('No Sections', { description: 'At least one section is required.' });
                saveBtn.disabled = false; saveBtn.innerHTML = original;
                return;
            }

            const sections = [];
            const formData = new FormData();

            for (let i = 0; i < secEls.length; i++) {
                const body = secEls[i].querySelector('[data-edit-body]')?.value?.trim() || '';
                if (!body) {
                    toast.warning('Missing Body', { description: `Section ${i+1} requires an email body.` });
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
            formData.append('sections',               JSON.stringify(sections));

            const res  = await fetch('./API/update-ticket-api.php', { method: 'POST', body: formData });
            const data = await res.json();

            if (data.success) {
                toast.success('Ticket Updated', { description: data.message });
                window.closeTicketModal();
                loadMyTickets();
            } else {
                toast.error('Error', { description: data.message });
                saveBtn.disabled = false; saveBtn.innerHTML = original;
            }
        } catch (err) {
            toast.error('Error', { description: 'Network error. Please try again.' });
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
                <i class="fa-solid fa-arrow-left text-xs"></i> Back
            </button>`;
        document.getElementById('logs-back-btn').addEventListener('click', () => viewTicket(ticket));

        const ACTION_META = {
            create:         { icon: 'fa-plus',         bg: 'bg-green-50',  border: 'border-green-200',  iconColor: 'text-green-500',  label: 'Created' },
            edit:           { icon: 'fa-pen',          bg: 'bg-amber-50',  border: 'border-amber-200',  iconColor: 'text-amber-500',  label: 'Edited'  },
            status:         { icon: 'fa-arrow-right',  bg: 'bg-blue-50',   border: 'border-blue-200',   iconColor: 'text-blue-500',   label: 'Status Changed' },
            reschedule:     { icon: 'fa-calendar-day', bg: 'bg-amber-50',  border: 'border-amber-200',  iconColor: 'text-amber-500',  label: 'Deadline Rescheduled' },
            section_update: { icon: 'fa-file-pen',     bg: 'bg-violet-50', border: 'border-violet-200', iconColor: 'text-violet-500', label: 'Sections Updated' },
        };

        const STATUS_LABELS = {
            waiting: 'Waiting', in_progress: 'Ongoing', pending: 'Pending', completed: 'Done', enroute: 'Enroute', closed: 'Closed'
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
                        <p class="text-xs font-semibold text-zinc-400">No logs yet</p>
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
                } else if (log.action === 'reschedule') {
                    desc = `Rescheduled deadline to <span class="font-semibold text-zinc-700">${fmtLog(log.deadline)}</span>`;
                } else if (log.action === 'section_update') {
                    desc = `Updated ticket sections`;
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
                        changesHTML = `<div class="flex flex-wrap gap-1.5 mt-1.5">${fields.map(f => `<span class="text-xs font-medium text-zinc-500 bg-zinc-100 rounded px-1.5 py-0.5">${f}</span>`).join('')}</div>`;
                    }
                }

                // Remark body if available
                let remarkHTML = '';
                if (log.remark && (log.remark.remark_body || (log.remark.attachments && log.remark.attachments.length > 0))) {
                    let attHTML = '';
                    if (log.remark.attachments && log.remark.attachments.length > 0) {
                        const imgExts = ['jpg','jpeg','png','gif','webp','bmp','svg'];
                        const imgs = log.remark.attachments.filter(a => imgExts.includes(a.image_path.split('.').pop().toLowerCase()));
                        const others = log.remark.attachments.filter(a => !imgExts.includes(a.image_path.split('.').pop().toLowerCase()));
                        attHTML = '<div class="flex flex-wrap gap-1.5 mt-2">';
                        imgs.forEach(a => {
                            attHTML += `<div class="img-lightbox-trigger group relative rounded-lg overflow-hidden border border-zinc-200 hover:border-indigo-300 transition-all w-16 h-16 flex-shrink-0 cursor-pointer" data-src="./${a.image_path}">
                                <img src="./${a.image_path}" alt="" class="w-full h-full object-cover" />
                                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center"><i class="fa-solid fa-expand text-white text-[8px] opacity-0 group-hover:opacity-100 transition-opacity"></i></div>
                            </div>`;
                        });
                        others.forEach(a => {
                            attHTML += `<a href="./${a.image_path}" target="_blank" class="flex items-center gap-1 bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-1 hover:bg-indigo-100 transition-all">
                                <i class="fa-solid fa-paperclip text-indigo-400 text-[8px]"></i>
                                <span class="text-xs font-medium text-indigo-600 truncate max-w-24">${a.image_path.split('/').pop()}</span>
                            </a>`;
                        });
                        attHTML += '</div>';
                    }

                    remarkHTML = `
                        <div class="mt-2 bg-zinc-50 border border-zinc-200 rounded-lg p-3">
                            ${log.remark.remark_body ? `<p class="text-xs text-zinc-600 font-medium whitespace-pre-wrap">${log.remark.remark_body}</p>` : ''}
                            ${attHTML}
                        </div>`;
                }

                html += `
                    <div class="flex gap-3 relative">
                        <!-- Timeline line -->
                        ${!isLast ? '<div class="absolute left-[13px] top-7 bottom-0 w-px bg-zinc-200"></div>' : ''}
                        <!-- Icon -->
                        <div class="flex items-center justify-center w-7 h-7 ${meta.bg} ${meta.border} border rounded-full flex-shrink-0 z-10">
                            <i class="fa-solid ${meta.icon} ${meta.iconColor} text-xs"></i>
                        </div>
                        <!-- Content -->
                        <div class="flex flex-col gap-0.5 pb-4 min-w-0 flex-1">
                            <p class="text-xs font-semibold text-zinc-700">${meta.label}</p>
                            <p class="text-[11px] text-zinc-500 font-medium">${desc}</p>
                            ${changesHTML}
                            ${remarkHTML}
                            <div class="flex items-center gap-2 mt-1">
                                <p class="text-xs text-zinc-400 font-medium">${fmtLog(log.changed_at)}</p>
                                <span class="text-xs text-zinc-300">·</span>
                                <p class="text-xs text-zinc-400 font-medium">${log.changed_by_name || log.changed_by || '—'}</p>
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
                    <p class="text-xs font-semibold text-red-400">Failed to load logs</p>
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

    window.addEventListener('beforeunload', () => {
        if (window._myTicketsTimerInterval) clearInterval(window._myTicketsTimerInterval)
    })

    /* ── Export Functionality ────────────────────────────────── */
    window.toggleMyTicketsExportDropdown = function() {
        const dd = document.getElementById('my-tickets-export-dropdown');
        if (dd) dd.classList.toggle('hidden');
    }

    document.addEventListener('click', (e) => {
        const wrapper = document.getElementById('my-tickets-export-dropdown-wrapper');
        const dd = document.getElementById('my-tickets-export-dropdown');
        if (wrapper && dd && !wrapper.contains(e.target)) {
            dd.classList.add('hidden');
        }
    });

    window.exportMyTickets = function(exportStatus) {
        if (!window.exportDataOptions) {
            toast.error('Export module not loaded.');
            return;
        }
        
        const dateFrom = document.getElementById('my-tickets-export-date-from')?.value || '';
        const dateTo   = document.getElementById('my-tickets-export-date-to')?.value || '';
        const creator  = document.getElementById('my-tickets-filter-creator')?.value || 'all';

        let url = `./API/export-tickets-api.php?filter=active`;
        if (exportStatus && exportStatus !== 'all') {
            url += `&status=${exportStatus}`;
        }
        if (creator !== 'all') {
            url += `&creator=${encodeURIComponent(creator)}`;
        }
        if (dateFrom) url += `&date_from=${dateFrom}`;
        if (dateTo) url += `&date_to=${dateTo}`;

        window.exportDataOptions(url, 'tickets_export.csv');
        document.getElementById('my-tickets-export-dropdown')?.classList.add('hidden');
    }

})();
