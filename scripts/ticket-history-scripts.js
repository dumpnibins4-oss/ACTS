/* ── Ticket History Scripts ────────────────────────────────── */
(function() {

const STATUS = {
    waiting:     { bg: 'bg-zinc-100',   text: 'text-zinc-600',   label: 'Waiting'     },
    in_progress: { bg: 'bg-blue-50',    text: 'text-blue-600',   label: 'Ongoing'     },
    completed:   { bg: 'bg-green-50',   text: 'text-green-600',  label: 'Done'        },
    enroute:     { bg: 'bg-violet-50',  text: 'text-violet-600', label: 'Enroute'     },
    closed:      { bg: 'bg-zinc-100',   text: 'text-zinc-500',   label: 'Closed'      },
}

const NEXT_STATUS = {
    waiting:     { value: 'in_progress', label: 'Mark as Ongoing',              icon: 'fa-play',        color: 'bg-blue-500 hover:bg-blue-600'   },
    in_progress: { value: 'completed',   label: 'Mark as Done',                 icon: 'fa-check',       color: 'bg-green-500 hover:bg-green-600' },
    completed:   { value: 'enroute',     label: 'Mark as Enroute for Signature', icon: 'fa-paper-plane', color: 'bg-violet-500 hover:bg-violet-600' },
}

/* ── Countdown Timer Helpers ─────────────────────────────── */
function getDeadlineMs(ticket) {
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

function startRowTimers() {
    if (window._histTimerInterval) clearInterval(window._histTimerInterval)
    window._histTimerInterval = setInterval(() => {
        document.querySelectorAll('.hist-countdown').forEach(el => {
            const deadlineMs = parseInt(el.dataset.deadline)
            const diff = deadlineMs - Date.now()
            const { text, overdue } = formatCountdown(diff)
            el.textContent = overdue ? '⚠ Overdue' : `Acknowledge before: ⏱ ${text}`
            el.className = `hist-countdown text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5 w-fit ${
                overdue ? 'bg-red-50 text-red-500' : diff < 3600000 ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-500'
            }`
        })
        document.querySelectorAll('.hist-deadline-countdown').forEach(el => {
            const deadlineMs = parseInt(el.dataset.deadline)
            const diff = deadlineMs - Date.now()
            const { text, overdue } = formatCountdown(diff)
            el.textContent = overdue ? '⚠ Deadline passed' : `Deadline in: ⏱ ${text}`
            el.className = `hist-deadline-countdown text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5 w-fit ${
                overdue ? 'bg-red-50 text-red-500' : diff < 3600000 ? 'bg-amber-50 text-amber-600' : 'bg-violet-50 text-violet-500'
            }`
        })
    }, 1000)
}

let allHistoryTickets = []
let histCurrentPage = 1
const HIST_PAGE_SIZE = 10
let histFilteredCache = []

/* ── Fetch ───────────────────────────────────────────────── */
async function loadHistory() {
    const body    = document.getElementById('history-body')
    const loading = document.getElementById('history-loading')
    const empty   = document.getElementById('history-empty')

    loading.classList.remove('hidden')
    empty.classList.add('hidden')
    body.querySelectorAll('.hist-row').forEach(r => r.remove())

    try {
        const res  = await fetch('./API/get-tickets-api.php?filter=history')
        const data = await res.json()

        loading.classList.add('hidden')

        if (!data.success || data.data.length === 0) {
            empty.classList.remove('hidden')
            empty.classList.add('flex')
            updateHistStats([])
            updateHistPagination([])
            return
        }

        allHistoryTickets = data.data
        histCurrentPage = 1
        applyAllFilters()
        updateHistStats(allHistoryTickets)

    } catch (err) {
        loading.classList.add('hidden')
        empty.classList.remove('hidden')
        empty.classList.add('flex')
        console.error('Error loading history:', err)
    }
}

/* ── Filtering ──────────────────────────────────────────── */
function applyAllFilters() {
    const search   = (document.getElementById('history-search')?.value || '').toLowerCase()
    const status   = document.getElementById('history-filter-status')?.value || 'all'
    const urgency  = document.getElementById('history-filter-urgency')?.value || 'all'
    const dateFrom = document.getElementById('history-date-from')?.value || ''
    const dateTo   = document.getElementById('history-date-to')?.value || ''

    let filtered = allHistoryTickets

    if (status !== 'all') {
        filtered = filtered.filter(t => t.status === status)
    }

    if (urgency !== 'all') {
        filtered = filtered.filter(t => String(t.urgent) === urgency)
    }

    if (dateFrom) {
        const from = new Date(dateFrom)
        filtered = filtered.filter(t => new Date(t.created_at) >= from)
    }

    if (dateTo) {
        const to = new Date(dateTo)
        to.setHours(23, 59, 59, 999)
        filtered = filtered.filter(t => new Date(t.created_at) <= to)
    }

    if (search) {
        filtered = filtered.filter(t =>
            (t.title || '').toLowerCase().includes(search) ||
            (t.customer || '').toLowerCase().includes(search) ||
            (t.email_title || '').toLowerCase().includes(search) ||
            (t.status || '').toLowerCase().includes(search) ||
            (t.FirstName || '').toLowerCase().includes(search) ||
            (t.LastName || '').toLowerCase().includes(search)
        )
    }

    histCurrentPage = 1
    renderHistory(filtered)
}

/* ── Render Table ────────────────────────────────────────── */
function renderHistory(tickets) {
    const body  = document.getElementById('history-body')
    const empty = document.getElementById('history-empty')

    body.querySelectorAll('.hist-row').forEach(r => r.remove())

    if (tickets.length === 0) {
        empty.classList.remove('hidden')
        empty.classList.add('flex')
        updateHistPagination([])
        return
    }

    empty.classList.add('hidden')

    histFilteredCache = tickets
    const totalPages = Math.ceil(tickets.length / HIST_PAGE_SIZE)
    if (histCurrentPage > totalPages) histCurrentPage = totalPages
    const start = (histCurrentPage - 1) * HIST_PAGE_SIZE
    const pageTickets = tickets.slice(start, start + HIST_PAGE_SIZE)

    pageTickets.forEach(ticket => {
        const status       = STATUS[ticket.status] || STATUS.waiting
        const createdDate  = new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        
        // Acknowledge Timer
        const deadlineMs   = getDeadlineMs(ticket)
        const showTimer    = deadlineMs !== null && ticket.status === 'waiting'
        const initCountdown = showTimer ? formatCountdown(deadlineMs - Date.now()) : null

        // Deadline Timer
        const deadlineStoredMs = getStoredDeadlineMs(ticket)
        const showDeadlineTimer = deadlineStoredMs !== null && ticket.status !== 'enroute'
        const initDeadline = showDeadlineTimer ? formatCountdown(deadlineStoredMs - Date.now()) : null
        const sectionCount = ticket.sections ? ticket.sections.length : 0
        const ticketData   = btoa(unescape(encodeURIComponent(JSON.stringify(ticket))))

        const row = document.createElement('div')
        row.className = 'hist-row grid grid-cols-[1fr_130px_100px_100px_140px_80px] items-center w-full px-5 py-3 border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors gap-3'
        row.innerHTML = `
            <div class="flex flex-col min-w-0">
                <div class="flex flex-row items-center justify-start gap-2 w-full h-auto">
                    <p class="text-xs font-semibold text-zinc-800 truncate">${ticket.title}</p>
                    ${showTimer ? `
                        <span class="hist-countdown text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5 w-fit ${
                            initCountdown.overdue
                                ? 'bg-red-50 text-red-500'
                                : (deadlineMs - Date.now()) < 3600000
                                    ? 'bg-amber-50 text-amber-600'
                                    : 'bg-indigo-50 text-indigo-500'
                        }" data-deadline="${deadlineMs}">
                            ${initCountdown.overdue ? '⚠ Overdue' : `Awknowledge before: ⏱ ${initCountdown.text}`}
                        </span>` : ''}
                    ${showDeadlineTimer ? `
                        <span class="hist-deadline-countdown text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5 w-fit ${
                            initDeadline.overdue ? 'bg-red-50 text-red-500' : 'bg-violet-50 text-violet-500'
                        }" data-deadline="${deadlineStoredMs}">
                            ${initDeadline.overdue ? '⚠ Deadline passed' : `Deadline in: ⏱ ${initDeadline.text}`}
                        </span>` : ''}
                </div>
                <p class="text-[10px] text-zinc-400 font-medium truncate">${ticket.customer || ''} ${ticket.email_title ? '— ' + ticket.email_title : ''}</p>
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
                <span class="text-xs text-zinc-500 font-medium">${createdDate}</span>
            </div>
            <div class="flex justify-center">
                <button data-ticket="${ticketData}"
                    class="view-hist-btn text-xs font-medium text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-md px-2 py-1 transition-all cursor-pointer">
                    View
                </button>
            </div>
        `
        body.appendChild(row)
    })

    body.querySelectorAll('.view-hist-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const ticket = JSON.parse(decodeURIComponent(escape(atob(btn.dataset.ticket))))
            viewHistoryTicket(ticket)
        })
    })

    startRowTimers()

    updateHistPagination(tickets)
}

/* ── Pagination ─────────────────────────────────────────── */
function updateHistPagination(tickets) {
    const pag = document.getElementById('history-pagination')
    if (tickets.length <= HIST_PAGE_SIZE) {
        pag.classList.add('hidden')
        return
    }
    pag.classList.remove('hidden')
    pag.classList.add('flex')

    const total      = tickets.length
    const totalPages = Math.ceil(total / HIST_PAGE_SIZE)
    const start      = (histCurrentPage - 1) * HIST_PAGE_SIZE + 1
    const end        = Math.min(histCurrentPage * HIST_PAGE_SIZE, total)

    document.getElementById('history-page-info').textContent = `Showing ${start}\u2013${end} of ${total}`
    document.getElementById('history-prev').disabled = histCurrentPage <= 1
    document.getElementById('history-next').disabled = histCurrentPage >= totalPages

    const btnsEl = document.getElementById('history-page-btns')
    btnsEl.innerHTML = ''
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button')
        btn.className = `flex items-center justify-center w-8 h-8 text-xs font-medium rounded-lg border transition-all cursor-pointer ${i === histCurrentPage ? 'bg-indigo-500 text-white border-indigo-500' : 'text-zinc-500 bg-white border-zinc-200 hover:bg-zinc-50'}`
        btn.textContent = i
        btn.addEventListener('click', () => { histCurrentPage = i; renderHistory(histFilteredCache) })
        btnsEl.appendChild(btn)
    }
}

function historyPageChange(dir) {
    histCurrentPage += dir
    renderHistory(histFilteredCache)
}

/* ── Stats ───────────────────────────────────────────────── */
function updateHistStats(tickets) {
    document.getElementById('hist-stat-total').textContent   = tickets.length
    document.getElementById('hist-stat-waiting').textContent  = tickets.filter(t => t.status === 'waiting').length
    document.getElementById('hist-stat-ongoing').textContent  = tickets.filter(t => t.status === 'in_progress').length
    document.getElementById('hist-stat-done').textContent     = tickets.filter(t => t.status === 'completed').length
    document.getElementById('hist-stat-enroute').textContent  = tickets.filter(t => t.status === 'enroute').length
}

/* ── Search ──────────────────────────────────────────────── */
document.getElementById('history-search')?.addEventListener('input', () => applyAllFilters())

/* ── View History Ticket Modal ───────────────────────────── */
function viewHistoryTicket(ticket) {
    const modal  = document.getElementById('history-modal')
    const status = STATUS[ticket.status] || STATUS.waiting

    document.getElementById('hist-modal-title').textContent = ticket.title
    document.getElementById('hist-modal-date').textContent  = 'Created ' + new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

    const statusEl = document.getElementById('hist-modal-status')
    statusEl.textContent = status.label
    statusEl.className   = `text-[10px] font-semibold px-2.5 py-1 rounded-full ${status.bg} ${status.text}`

    // Logs button
    const logsBtn = document.getElementById('hist-modal-logs-btn')
    logsBtn.classList.remove('hidden')
    logsBtn.onclick = () => showHistoryLogs(ticket)

    const bodyEl = document.getElementById('hist-modal-body')
    bodyEl.innerHTML = ''

    // ── Ticket detail cards ──
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

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
                ${ticket.status === 'waiting' && ticket.date_and_time_of_email ? `
                    <span class="hist-countdown text-[10px] font-semibold px-1.5 py-0.5 rounded mt-1 w-fit bg-indigo-50 text-indigo-500"
                        data-deadline="${getDeadlineMs(ticket)}">
                        Acknowledge before: ⏱ ${formatCountdown(getDeadlineMs(ticket) - Date.now()).text}
                    </span>` : ''}
            </div>
            <div class="flex flex-col gap-0.5 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
                <p class="text-[10px] text-zinc-400 font-bold tracking-wide">DEADLINE</p>
                <p class="text-xs font-semibold text-zinc-700">${fmtDate(ticket.deadline)}</p>
                ${ticket.status === 'waiting' && ticket.deadline ? `
                    <span class="hist-deadline-countdown text-[10px] font-semibold px-1.5 py-0.5 rounded mt-1 w-fit bg-violet-50 text-violet-500"
                        data-deadline="${getStoredDeadlineMs(ticket)}">
                        Deadline in: ⏱ ${formatCountdown(getStoredDeadlineMs(ticket) - Date.now()).text}
                    </span>` : ''}
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
    `

    // Remarks
    if (ticket.remarks) {
        bodyEl.innerHTML += `
            <div class="flex flex-col gap-0.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <p class="text-[10px] text-amber-500 font-bold tracking-wide">REMARKS</p>
                <p class="text-xs font-medium text-amber-700">${ticket.remarks}</p>
            </div>
        `
    }

    // ── Sections ──
    if (ticket.sections && ticket.sections.length > 0) {
        bodyEl.innerHTML += `<hr class="border-zinc-200" />`

        ticket.sections.forEach((sec, idx) => {
            let imagesHTML = ''
            if (sec.images && sec.images.length > 0) {
                const imgExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']
                imagesHTML = `<div class="flex flex-col gap-2 mt-2">`

                const imageFiles = sec.images.filter(img => imgExts.includes(img.image.split('.').pop().toLowerCase()))
                const otherFiles = sec.images.filter(img => !imgExts.includes(img.image.split('.').pop().toLowerCase()))

                if (imageFiles.length > 0) {
                    imagesHTML += `<div class="flex flex-row flex-wrap gap-2">`
                    imageFiles.forEach(img => {
                        imagesHTML += `
                            <div class="img-lightbox-trigger group relative rounded-lg overflow-hidden border border-zinc-200 hover:border-indigo-300 transition-all w-24 h-24 flex-shrink-0 cursor-pointer"
                                 data-src="./${img.image}">
                                <img src="./${img.image}" alt="" class="w-full h-full object-cover" />
                                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                                    <i class="fa-solid fa-expand text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"></i>
                                </div>
                            </div>
                        `
                    })
                    imagesHTML += `</div>`
                }

                if (otherFiles.length > 0) {
                    imagesHTML += `<div class="flex flex-row flex-wrap gap-2">`
                    otherFiles.forEach(img => {
                        imagesHTML += `
                            <a href="./${img.image}" target="_blank" class="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1.5 hover:bg-indigo-100 transition-all">
                                <i class="fa-solid fa-paperclip text-indigo-400 text-[10px]"></i>
                                <span class="text-[10px] font-medium text-indigo-600 truncate max-w-32">${img.image.split('/').pop()}</span>
                            </a>
                        `
                    })
                    imagesHTML += `</div>`
                }

                imagesHTML += `</div>`
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
            `
        })
    }

    // ── Footer info ──
    const footerInfo = document.getElementById('hist-modal-footer-info')
    if (ticket.updated_at) {
        footerInfo.innerHTML = `<p class="text-[10px] text-zinc-400 font-medium">Last updated <span class="text-zinc-600 font-semibold">${fmtDate(ticket.updated_at)}</span></p>`
    } else {
        footerInfo.innerHTML = ''
    }

    // ── Status action button ──
    const actionEl = document.getElementById('hist-modal-action')
    const next = NEXT_STATUS[ticket.status]
    const userRole = document.getElementById('user-role').value

    if (next) {
        if (userRole === 'editor') {
            actionEl.innerHTML = `
                <button id="hist-status-btn" data-ticket-id="${ticket.id}" data-new-status="${next.value}"
                    class="flex items-center gap-1.5 text-xs font-medium text-white ${next.color} rounded-lg px-4 py-2 transition-all cursor-pointer">
                    <i class="fa-solid ${next.icon} text-[10px]"></i> ${next.label}
                </button>
            `
            document.getElementById('hist-status-btn').addEventListener('click', handleStatusChange)
        } else {
            actionEl.innerHTML = ''
        }
    } else {
        actionEl.innerHTML = `
            <span class="text-[10px] font-semibold text-violet-500 bg-violet-50 border border-violet-200 rounded-lg px-3 py-1.5">
                <i class="fa-solid fa-check-double text-[9px]"></i> Final Status
            </span>
        `
    }

    startRowTimers()
    modal.classList.remove('hidden')
    modal.classList.add('flex')
}

/* ── Status Change Handler ───────────────────────────────── */
async function handleStatusChange(e) {
    const btn       = e.currentTarget
    const ticketId  = btn.dataset.ticketId
    const newStatus = btn.dataset.newStatus
    const original  = btn.innerHTML

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
                if (!value || !value.trim()) return 'Please provide remarks before proceeding.'
            }
        })
        if (!isConfirmed) return

        btn.disabled = true
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs"></i> Updating...'

        try {
            const formData = new FormData()
            formData.append('ticket_id', ticketId)
            formData.append('new_status', newStatus)
            formData.append('remarks', remarks.trim())

            const res  = await fetch('./API/update-ticket-status-api.php', { method: 'POST', body: formData })
            const data = await res.json()

            if (data.success) {
                Swal.fire({ icon: 'success', title: 'Status Updated', text: data.message, confirmButtonColor: '#6366f1', timer: 1500, showConfirmButton: false })
                window.closeHistoryModal()
                loadHistory()
            } else {
                Swal.fire({ icon: 'error', title: 'Error', text: data.message })
                btn.disabled = false
                btn.innerHTML = original
            }
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Network error. Please try again.' })
            btn.disabled = false
            btn.innerHTML = original
        }
        return
    }

    btn.disabled = true
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs"></i> Updating...'

    try {
        const formData = new FormData()
        formData.append('ticket_id', ticketId)
        formData.append('new_status', newStatus)

        const res  = await fetch('./API/update-ticket-status-api.php', { method: 'POST', body: formData })
        const data = await res.json()

        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: 'Status Updated',
                text: data.message,
                confirmButtonColor: '#6366f1',
                timer: 1500,
                showConfirmButton: false
            })
            window.closeHistoryModal()
            loadHistory()
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: data.message })
            btn.disabled = false
            btn.innerHTML = original
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Network error. Please try again.' })
        btn.disabled = false
        btn.innerHTML = original
    }
}

/* ── Ticket Logs View (History) ───────────────────────────── */
async function showHistoryLogs(ticket) {
    const bodyEl     = document.getElementById('hist-modal-body')
    const footerInfo = document.getElementById('hist-modal-footer-info')
    const actionEl   = document.getElementById('hist-modal-action')
    const logsBtn    = document.getElementById('hist-modal-logs-btn')

    logsBtn.classList.add('hidden')

    bodyEl.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12 gap-3">
            <i class="fa-solid fa-spinner fa-spin text-indigo-400 text-xl"></i>
            <p class="text-xs text-zinc-400 font-medium">Loading activity logs…</p>
        </div>`
    footerInfo.innerHTML = ''
    actionEl.innerHTML = `
        <button id="hist-logs-back-btn" class="flex items-center gap-1.5 text-xs font-medium text-zinc-500 border border-zinc-200 rounded-lg px-4 py-2 hover:bg-zinc-50 transition-all cursor-pointer">
            <i class="fa-solid fa-arrow-left text-[10px]"></i> Back
        </button>`
    document.getElementById('hist-logs-back-btn').addEventListener('click', () => viewHistoryTicket(ticket))

    const ACTION_META = {
        create: { icon: 'fa-plus',        bg: 'bg-green-50',  border: 'border-green-200', iconColor: 'text-green-500', label: 'Created' },
        edit:   { icon: 'fa-pen',         bg: 'bg-amber-50',  border: 'border-amber-200', iconColor: 'text-amber-500', label: 'Edited'  },
        status: { icon: 'fa-arrow-right', bg: 'bg-blue-50',   border: 'border-blue-200',  iconColor: 'text-blue-500',  label: 'Status Changed' },
    }

    const STATUS_LABELS = {
        waiting: 'Waiting', in_progress: 'Ongoing', completed: 'Done', enroute: 'Enroute', closed: 'Closed'
    }

    try {
        const res  = await fetch(`./API/get-ticket-logs-api.php?ticket_id=${ticket.id}`)
        const data = await res.json()

        if (!data.success || data.data.length === 0) {
            bodyEl.innerHTML = `
                <div class="flex flex-col items-center justify-center py-12 gap-2">
                    <div class="flex items-center justify-center w-10 h-10 bg-zinc-100 rounded-xl">
                        <i class="fa-solid fa-clock-rotate-left text-zinc-300 text-base"></i>
                    </div>
                    <p class="text-sm font-semibold text-zinc-400">No logs yet</p>
                    <p class="text-xs text-zinc-300 font-medium">Activity will appear here once actions are taken</p>
                </div>`
            return
        }

        const fmtLog = (d) => {
            if (!d) return '—'
            const dt = new Date(d)
            return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' · ' +
                   dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        }

        let html = '<div class="flex flex-col gap-0">'
        data.data.forEach((log, idx) => {
            const meta = ACTION_META[log.action] || ACTION_META.edit
            const isLast = idx === data.data.length - 1

            let desc = ''
            if (log.action === 'create') {
                desc = `Created ticket <span class="font-semibold text-zinc-700">${log.title || ''}</span>`
            } else if (log.action === 'edit') {
                desc = `Edited ticket details`
            } else if (log.action === 'status') {
                desc = `Changed status to <span class="font-semibold text-zinc-700">${STATUS_LABELS[log.status] || log.status}</span>`
            }

            let changesHTML = ''
            if (log.action === 'edit') {
                const fields = []
                if (log.customer) fields.push(`Customer: ${log.customer}`)
                if (log.email_title) fields.push(`Title: ${log.email_title}`)
                if (log.sales_in_charge) fields.push(`Sales: ${log.sales_in_charge}`)
                if (log.urgent !== null) fields.push(`Urgency: ${log.urgent == 1 ? 'Urgent' : 'Non-Urgent'}`)
                if (fields.length > 0) {
                    changesHTML = `<div class="flex flex-wrap gap-1.5 mt-1.5">${fields.map(f => `<span class="text-[10px] font-medium text-zinc-500 bg-zinc-100 rounded px-1.5 py-0.5">${f}</span>`).join('')}</div>`
                }
            }

            html += `
                <div class="flex gap-3 relative">
                    ${!isLast ? '<div class="absolute left-[13px] top-7 bottom-0 w-px bg-zinc-200"></div>' : ''}
                    <div class="flex items-center justify-center w-7 h-7 ${meta.bg} ${meta.border} border rounded-full flex-shrink-0 z-10">
                        <i class="fa-solid ${meta.icon} ${meta.iconColor} text-[10px]"></i>
                    </div>
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
                </div>`
        })
        html += '</div>'

        bodyEl.innerHTML = html

    } catch (err) {
        console.error('Error loading logs:', err)
        bodyEl.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 gap-2">
                <p class="text-sm font-semibold text-red-400">Failed to load logs</p>
                <p class="text-xs text-zinc-400">Please try again</p>
            </div>`
    }
}

/* ── Image Lightbox ──────────────────────────────────────── */
function ensureLightbox() {
    if (document.getElementById('img-lightbox')) return
    const lb = document.createElement('div')
    lb.id = 'img-lightbox'
    lb.className = 'fixed inset-0 z-[9999] hidden items-center justify-center bg-black/70 backdrop-blur-sm'
    lb.innerHTML = `
        <button id="lightbox-close" class="absolute top-4 right-4 text-white/70 hover:text-white transition-colors cursor-pointer z-10">
            <i class="fa-solid fa-xmark text-2xl"></i>
        </button>
        <img id="lightbox-img" src="" alt="" class="max-w-[90vw] max-h-[85vh] rounded-xl shadow-2xl object-contain" />
    `
    document.body.appendChild(lb)
    lb.addEventListener('click', (e) => {
        if (e.target === lb || e.target.closest('#lightbox-close')) {
            lb.classList.add('hidden')
            lb.classList.remove('flex')
        }
    })
}

document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.img-lightbox-trigger')
    if (trigger) {
        e.preventDefault()
        ensureLightbox()
        const lb  = document.getElementById('img-lightbox')
        const img = document.getElementById('lightbox-img')
        img.src = trigger.dataset.src
        lb.classList.remove('hidden')
        lb.classList.add('flex')
    }
})

/* ── Export ──────────────────────────────────────────────── */
function toggleExportDropdown() {
    const dd = document.getElementById('export-dropdown')
    dd.classList.toggle('hidden')
}

function exportTickets(filter) {
    document.getElementById('export-dropdown').classList.add('hidden')
    window.open(`./API/export-tickets-api.php?filter=${filter}`, '_blank')
}

// Close export dropdown on outside click
document.addEventListener('click', (e) => {
    const wrapper = document.getElementById('export-dropdown-wrapper')
    if (wrapper && !wrapper.contains(e.target)) {
        document.getElementById('export-dropdown')?.classList.add('hidden')
    }
})

/* ── Expose globals ──────────────────────────────────────── */
window.loadHistory         = loadHistory
window.applyHistoryFilters = applyAllFilters
window.historyPageChange   = historyPageChange
window.toggleExportDropdown = toggleExportDropdown
window.exportTickets       = exportTickets
window.clearHistoryFilters = function() {
    document.getElementById('history-filter-status').value  = 'all'
    document.getElementById('history-filter-urgency').value = 'all'
    document.getElementById('history-date-from').value      = ''
    document.getElementById('history-date-to').value        = ''
    document.getElementById('history-search').value         = ''
    applyAllFilters()
}
window.closeHistoryModal = function() {
    const modal = document.getElementById('history-modal')
    modal.classList.add('hidden')
    modal.classList.remove('flex')
}

document.getElementById('history-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) window.closeHistoryModal()
})

/* ── Initial Load ────────────────────────────────────────── */
loadHistory()

window.addEventListener('beforeunload', () => {
    if (window._histTimerInterval) clearInterval(window._histTimerInterval);
})
})()
