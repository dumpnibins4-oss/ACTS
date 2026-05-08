(function() {
/* ── Ticket ID ─────────────────────────────────────────────── */
document.getElementById('ticket-id').textContent = 'TKT-' + Math.random().toString(36).slice(2, 7).toUpperCase();

/* ── Status pill ───────────────────────────────────────────── */
const STATUS_MAP = {
    open:        { bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-200',   icon: 'text-blue-400'   },
    in_progress: { bg: 'bg-amber-50',  text: 'text-amber-600',  border: 'border-amber-200',  icon: 'text-amber-400'  },
    pending:     { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', icon: 'text-orange-400' },
    resolved:    { bg: 'bg-indigo-50',  text: 'text-indigo-600',  border: 'border-indigo-200',  icon: 'text-indigo-400'  },
    closed:      { bg: 'bg-zinc-100',  text: 'text-zinc-500',   border: 'border-zinc-300',   icon: 'text-zinc-400'   },
};

function updateStatus(sel) {
    const s = STATUS_MAP[sel.value] || STATUS_MAP.open;
    sel.className = `text-xs font-semibold pl-2 pr-6 py-0.5 rounded-full border appearance-none cursor-pointer focus:outline-none ${s.bg} ${s.text} ${s.border}`;
    document.getElementById('status-icon').className = `fa-solid fa-chevron-down text-[9px] absolute right-2 pointer-events-none ${s.icon}`;
}

/* ── Sections ──────────────────────────────────────────────── */
let sectionCount = 0;
const sectionsContainer = document.getElementById('sections-container');
const sectionsEmpty     = document.getElementById('sections-empty');

document.getElementById('add-section-btn').addEventListener('click', addSection);

function addSection() {
    sectionCount++;
    sectionsEmpty.classList.add('hidden');

    const id  = 'sec-' + Date.now();
    const div = document.createElement('div');
    div.id    = id;
    div.className = 'flex flex-col w-full h-auto border border-zinc-200 rounded-xl bg-white overflow-hidden';
    div.style.cssText = 'animation: fadeSlideIn .25s ease both;';
    div.innerHTML = `
        <!-- Section header -->
        <div class="flex flex-row items-center justify-between w-full h-auto px-4 py-3 bg-zinc-50 border-b border-zinc-200">
            <div class="flex flex-row items-center gap-2">
                <div class="flex items-center justify-center w-6 h-6 bg-indigo-500/10 border border-indigo-300 rounded-md">
                    <i class="fa-regular fa-envelope text-indigo-500 text-xs"></i>
                </div>
                <p class="text-xs font-semibold text-zinc-600">Section ${sectionCount}</p>
            </div>
            <button type="button" onclick="removeSection('${id}')"
                class="flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-red-400 hover:bg-red-50 rounded-md px-2 py-1 transition-all cursor-pointer">
                <i class="fa-solid fa-trash-can text-[10px]"></i> Remove
            </button>
        </div>

        <!-- Email body -->
        <div class="flex flex-col gap-1 px-4 pt-4 pb-3">
            <h2 class="text-xs font-bold text-zinc-400 tracking-wide">Email Body <span class="text-red-500">*</span></h2>
            <textarea data-section-body rows="4"
                placeholder="Paste or type the email body here…"
                class="w-full bg-transparent border border-zinc-200 rounded-md pt-2 px-2 pb-1 outline-none text-zinc-500 text-xs font-medium resize-none focus:border-indigo-400 transition-all placeholder:text-zinc-300"></textarea>
        </div>

        <!-- Attachments -->
        <div class="flex flex-col gap-2 px-4 pb-4">
            <h2 class="text-xs font-bold text-zinc-400 tracking-wide">Attachments <span class="text-zinc-300 font-medium">(max 2 files)</span></h2>

            <div class="relative flex flex-col items-center justify-center w-full min-h-24 border-2 border-dashed border-zinc-300 rounded-xl bg-zinc-50 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all duration-200 cursor-pointer gap-2 py-5 px-4" id="dz-${id}">
                <input type="file" id="fi-${id}" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    class="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                <div class="flex items-center justify-center w-8 h-8 bg-zinc-200 rounded-lg">
                    <i class="fa-solid fa-cloud-arrow-up text-zinc-400 text-sm"></i>
                </div>
                <div class="flex flex-col items-center gap-0.5">
                    <p class="text-xs font-semibold text-zinc-600">Drop files here or <span class="text-indigo-500">browse</span></p>
                    <p class="text-[10px] text-zinc-300 font-medium mt-1">PDF, DOC, DOCX, JPG, PNG · Max 10MB · Up to 2 files</p>
                </div>
            </div>

            <div id="fl-${id}" class="flex flex-col gap-2"></div>
        </div>
    `;
    sectionsContainer.appendChild(div);

    /* wire up file handling for this section */
    const fi = document.getElementById('fi-' + id);
    const dz = document.getElementById('dz-' + id);
    const fl = document.getElementById('fl-' + id);
    const sectionFiles = [];

    /* store references on the DOM element for later collection */
    div._sectionFiles = sectionFiles;
    div._sectionNumber = sectionCount;

    fi.addEventListener('change', () => {
        Array.from(fi.files).forEach(f => addFile(f, id, sectionFiles, fl, dz));
        fi.value = '';
    });

    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('border-indigo-400', 'bg-indigo-50'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('border-indigo-400', 'bg-indigo-50'));
    dz.addEventListener('drop', e => {
        e.preventDefault();
        dz.classList.remove('border-indigo-400', 'bg-indigo-50');
        Array.from(e.dataTransfer.files).forEach(f => addFile(f, id, sectionFiles, fl, dz));
    });
}

function addFile(file, secId, sectionFiles, fl, dz) {
    if (sectionFiles.length >= 2) { alert('Each section allows a maximum of 2 files.'); return; }
    if (file.size > 10 * 1024 * 1024) { alert(`"${file.name}" exceeds the 10MB limit.`); return; }

    const fid  = 'f' + Date.now() + Math.random().toString(36).slice(2, 5);
    const size = file.size < 1024 * 1024
        ? (file.size / 1024).toFixed(1) + ' KB'
        : (file.size / 1024 / 1024).toFixed(1) + ' MB';
    const ext  = file.name.split('.').pop().toLowerCase();
    const icon = ['jpg','jpeg','png'].includes(ext) ? 'fa-file-image' : ext === 'pdf' ? 'fa-file-pdf' : 'fa-file-word';

    sectionFiles.push({ fid, file });

    const row = document.createElement('div');
    row.id = fid;
    row.className = 'flex flex-row items-center justify-between w-full h-auto bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 gap-3';
    row.innerHTML = `
        <div class="flex flex-row items-center gap-2 min-w-0">
            <i class="fa-solid ${icon} text-indigo-400 text-sm flex-shrink-0"></i>
            <p class="text-xs font-medium text-indigo-800 truncate">${file.name}</p>
        </div>
        <div class="flex flex-row items-center gap-3 flex-shrink-0">
            <p class="text-[10px] text-indigo-400 font-medium">${size}</p>
            <button type="button" onclick="removeFile('${fid}', '${secId}')"
                class="text-zinc-300 hover:text-red-400 transition-colors text-base leading-none font-light">&times;</button>
        </div>
    `;
    fl.appendChild(row);

    /* tag the row so removeFile can access sectionFiles + dz */
    row._sectionFiles = sectionFiles;
    row._dz = dz;

    if (sectionFiles.length >= 2) dz.classList.add('hidden');
}

function removeFile(fid, secId) {
    const row = document.getElementById(fid);
    if (!row) return;
    const sf  = row._sectionFiles;
    const dz  = row._dz;
    const idx = sf.findIndex(f => f.fid === fid);
    if (idx !== -1) sf.splice(idx, 1);
    row.remove();
    if (sf.length < 2) dz.classList.remove('hidden');
}

function removeSection(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.transition = 'opacity .2s, transform .2s';
    el.style.opacity    = '0';
    el.style.transform  = 'scale(.98)';
    setTimeout(() => {
        el.remove();
        if (!sectionsContainer.children.length) sectionsEmpty.classList.remove('hidden');
    }, 200);
}

function clearAll() {
    sectionsContainer.innerHTML = '';
    sectionsEmpty.classList.remove('hidden');
    sectionCount = 0;
    // Reset ticket detail fields
    ['field-customer', 'field-email-title', 'field-email-datetime', 'field-deadline', 'field-remarks'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    // Reset sales search
    const salesSearch = document.getElementById('sales-search-input');
    if (salesSearch) salesSearch.value = '';
    const salesClear = document.getElementById('sales-clear-btn');
    if (salesClear) salesClear.classList.add('hidden');
    // Reset urgency
    const urgSel = document.getElementById('ticket-status');
    if (urgSel) urgSel.value = '0';
    // Reset timely indicator
    updateTimelyIndicator();
}

/* ── Auto-calculate Timely Response ──────────────────────── */
function updateTimelyIndicator() {
    const icon = document.getElementById('timely-icon');
    const text = document.getElementById('timely-text');
    const indicator = document.getElementById('timely-indicator');
    if (!icon || !text || !indicator) return;

    const emailDateVal = document.getElementById('field-email-datetime')?.value;
    if (!emailDateVal) {
        icon.className = 'fa-solid fa-clock text-zinc-300 text-xs';
        text.className = 'text-xs font-medium text-zinc-400';
        text.textContent = 'Set email date & urgency first';
        indicator.className = 'flex items-center gap-2 border border-zinc-200 rounded-lg px-3 py-2';
        return;
    }

    const emailDate = new Date(emailDateVal);
    const now = new Date();
    const diffHours = (now - emailDate) / (1000 * 60 * 60);
    const isUrgent = document.getElementById('ticket-status')?.value === '1';
    const threshold = isUrgent ? 24 : 48;
    const isTimely = diffHours <= threshold;

    if (isTimely) {
        icon.className = 'fa-solid fa-circle-check text-green-500 text-xs';
        text.className = 'text-xs font-semibold text-green-600';
        text.textContent = `Yes — within ${threshold}hrs`;
        indicator.className = 'flex items-center gap-2 border border-green-200 bg-green-50 rounded-lg px-3 py-2';
    } else {
        icon.className = 'fa-solid fa-circle-xmark text-red-500 text-xs';
        text.className = 'text-xs font-semibold text-red-600';
        text.textContent = `No — exceeded ${threshold}hrs`;
        indicator.className = 'flex items-center gap-2 border border-red-200 bg-red-50 rounded-lg px-3 py-2';
    }
}

// Listen for changes on both fields
document.getElementById('field-email-datetime')?.addEventListener('change', updateTimelyIndicator);
document.getElementById('ticket-status')?.addEventListener('change', updateTimelyIndicator);

// Expose functions globally for inline onclick handlers
window.updateStatus  = updateStatus;
window.removeSection = removeSection;
window.removeFile    = removeFile;
window.clearAll      = clearAll;

/* ── Sales In Charge Searchable Dropdown ─────────────────── */
(function initSalesDropdown() {
    const searchInput  = document.getElementById('sales-search-input');
    const hiddenInput  = document.getElementById('field-sales-in-charge');
    const dropdown     = document.getElementById('sales-dropdown');
    const clearBtn     = document.getElementById('sales-clear-btn');
    if (!searchInput || !dropdown) return;

    let debounceTimer = null;
    let isSelected    = false;

    searchInput.addEventListener('input', () => {
        isSelected = false;
        hiddenInput.value = '';
        const q = searchInput.value.trim();

        clearBtn.classList.toggle('hidden', q.length === 0);

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => fetchSales(q), 250);
    });

    searchInput.addEventListener('focus', () => {
        if (!isSelected) {
            fetchSales(searchInput.value.trim());
        }
    });

    async function fetchSales(query) {
        try {
            const url  = query
                ? `./API/get-sales-employees-api.php?search=${encodeURIComponent(query)}`
                : `./API/get-sales-employees-api.php`;
            const res  = await fetch(url);
            const data = await res.json();

            if (!data.success || data.data.length === 0) {
                dropdown.innerHTML = `
                    <div class="flex items-center justify-center py-4 px-3">
                        <p class="text-[10px] text-zinc-400 font-medium">No employees found</p>
                    </div>`;
                dropdown.classList.remove('hidden');
                return;
            }

            dropdown.innerHTML = data.data.map(emp => {
                const mi   = emp.MiddleName ? emp.MiddleName.charAt(0) + '.' : '';
                const full = `${emp.FirstName} ${mi} ${emp.LastName}`.replace(/\s+/g, ' ').trim();
                const idLabel = emp.BiometricsID || emp.EmployeeID;
                return `
                    <div class="sales-option flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-indigo-50 transition-colors"
                         data-value="${full}" data-id="${emp.EmployeeID}">
                        <div class="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500 overflow-hidden border border-indigo-400 flex-shrink-0">
                            <img src="http://10.2.0.8/lrnph/emp_photos/${emp.EmployeeID}.jpg" alt=""
                                 class="w-full h-full object-cover object-top"
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                            <span style="display:none" class="text-white text-[8px] font-bold flex items-center justify-center w-full h-full">${emp.FirstName[0]}${emp.LastName[0]}</span>
                        </div>
                        <div class="flex flex-col min-w-0">
                            <p class="text-xs font-semibold text-zinc-700 truncate">${full}</p>
                            <p class="text-[10px] text-zinc-400 font-medium">${idLabel}</p>
                        </div>
                    </div>
                `;
            }).join('');

            dropdown.classList.remove('hidden');

            // Attach click handlers
            dropdown.querySelectorAll('.sales-option').forEach(opt => {
                opt.addEventListener('click', () => {
                    searchInput.value  = opt.dataset.value;
                    hiddenInput.value  = opt.dataset.value;
                    isSelected = true;
                    dropdown.classList.add('hidden');
                    clearBtn.classList.remove('hidden');
                    searchInput.classList.add('border-indigo-400');
                    setTimeout(() => searchInput.classList.remove('border-indigo-400'), 1000);
                });
            });
        } catch (err) {
            console.error('Sales search error:', err);
        }
    }

    // Clear button
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        hiddenInput.value = '';
        isSelected = false;
        clearBtn.classList.add('hidden');
        dropdown.classList.add('hidden');
        searchInput.focus();
    });

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#sales-search-input') && !e.target.closest('#sales-dropdown') && !e.target.closest('#sales-clear-btn')) {
            dropdown.classList.add('hidden');
        }
    });
})();

/* ── Form Submission ──────────────────────────────────────── */
document.getElementById('ticket-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const ticketId  = document.getElementById('ticket-id').textContent;
    const urgentSel = document.getElementById('ticket-status');
    const urgent    = urgentSel ? urgentSel.value : 0;

    // Gather all section elements currently in the DOM
    const sectionEls = sectionsContainer.children;

    if (sectionEls.length === 0) {
        Swal.fire({ icon: 'warning', title: 'No Sections', text: 'Please add at least one section before submitting.' });
        return;
    }

    // Build sections metadata array and collect files
    const sections = [];
    const formData = new FormData();

    for (let i = 0; i < sectionEls.length; i++) {
        const secEl   = sectionEls[i];
        const body    = secEl.querySelector('[data-section-body]')?.value?.trim() || '';
        const secNum  = secEl._sectionNumber || (i + 1);
        const files   = secEl._sectionFiles || [];

        if (!body) {
            Swal.fire({ icon: 'warning', title: 'Missing Email Body', text: `Section ${secNum} requires an email body.` });
            return;
        }

        sections.push({
            sub_title: 'Section ' + secNum,
            body: body
        });

        // Append each file under attachments_section_{index}[]
        files.forEach(f => {
            formData.append(`attachments_section_${i}[]`, f.file);
        });
    }

    const ticketForm = document.getElementById('ticket-form');
    formData.append('ticket_id',              ticketId);
    formData.append('urgent',                 urgent);
    formData.append('submitter',              ticketForm.dataset.submitter || '');
    formData.append('created_by',             ticketForm.dataset.createdBy || '');
    formData.append('customer',               document.getElementById('field-customer')?.value || '');
    formData.append('email_title',            document.getElementById('field-email-title')?.value || '');
    formData.append('sales_in_charge',        document.getElementById('field-sales-in-charge')?.value || '');
    formData.append('date_and_time_of_email', document.getElementById('field-email-datetime')?.value || '');
    formData.append('deadline',               document.getElementById('field-deadline')?.value || '');
    formData.append('remarks',                document.getElementById('field-remarks')?.value || '');
    formData.append('sections',               JSON.stringify(sections));

    // Disable submit button
    const submitBtn = document.getElementById('submit-ticket-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs"></i> Submitting...';

    try {
        const res  = await fetch('./API/create-ticket-api.php', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: 'Ticket Submitted!',
                text: `Your ticket ${ticketId} has been created successfully.`,
                confirmButtonColor: '#6366f1'
            }).then(() => {
                // Reset the form
                clearAll();
                sectionCount = 0;
                document.getElementById('ticket-id').textContent = 'TKT-' + Math.random().toString(36).slice(2, 7).toUpperCase();
            });
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: data.message || 'Failed to create ticket.' });
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Network error. Please try again.' });
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
});

})();
