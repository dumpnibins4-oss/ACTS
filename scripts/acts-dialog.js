/**
 * ACTS Dialog — lightweight confirm / input dialogs (shadcn-style)
 * Replaces SweetAlert2 modals. Toasts are handled by Sonner.
 */
(function () {
    const css = document.createElement('style');
    css.textContent = `
        .acts-dlg-overlay{position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,.45);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s ease}
        .acts-dlg-overlay.show{opacity:1}
        .acts-dlg-panel{background:#fff;border-radius:16px;box-shadow:0 25px 50px -12px rgba(0,0,0,.25);max-width:420px;width:90%;padding:24px;transform:scale(.95) translateY(10px);transition:transform .2s ease;font-family:Geist,sans-serif}
        .acts-dlg-overlay.show .acts-dlg-panel{transform:scale(1) translateY(0)}
        .acts-dlg-title{font-size:15px;font-weight:700;color:#27272a;margin-bottom:4px}
        .acts-dlg-desc{font-size:13px;color:#71717a;line-height:1.5;margin-bottom:20px}
        .acts-dlg-desc b{color:#3f3f46}
        .acts-dlg-input,.acts-dlg-select{width:100%;box-sizing:border-box;border:1px solid #e4e4e7;border-radius:10px;padding:10px 12px;font-size:13px;color:#3f3f46;outline:none;transition:border-color .15s;font-family:inherit;margin-bottom:16px;background:#fff}
        .acts-dlg-input:focus,.acts-dlg-select:focus{border-color:#818cf8}
        .acts-dlg-input::placeholder{color:#d4d4d8}
        textarea.acts-dlg-input{resize:none}
        .acts-dlg-select{cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:32px}
        .acts-dlg-err{font-size:11px;color:#ef4444;margin-top:-12px;margin-bottom:12px;font-weight:500;display:none}
        .acts-dlg-actions{display:flex;justify-content:flex-end;gap:8px}
        .acts-dlg-btn{padding:8px 18px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;border:none;transition:all .15s;font-family:inherit}
        .acts-dlg-btn-cancel{background:#fff;color:#71717a;border:1px solid #e4e4e7}
        .acts-dlg-btn-cancel:hover{background:#fafafa}
        .acts-dlg-btn-confirm{background:#6366f1;color:#fff}
        .acts-dlg-btn-confirm:hover{background:#4f46e5}
        .acts-dlg-btn-danger{background:#ef4444;color:#fff}
        .acts-dlg-btn-danger:hover{background:#dc2626}
        .acts-dlg-btn-warning{background:#f59e0b;color:#fff}
        .acts-dlg-btn-warning:hover{background:#d97706}
    `;
    document.head.appendChild(css);

    /**
     * @param {Object} opts
     * @param {string}  opts.title
     * @param {string}  [opts.description]       — supports HTML
     * @param {string}  [opts.input]             — 'textarea' | 'select' | 'text'
     * @param {string}  [opts.inputPlaceholder]
     * @param {Object}  [opts.inputOptions]      — { value: label } for select
     * @param {Function}[opts.inputValidator]     — return string on error
     * @param {string}  [opts.confirmButtonText]
     * @param {string}  [opts.confirmStyle]       — 'confirm' | 'danger' | 'warning'
     * @param {string}  [opts.cancelButtonText]
     * @param {boolean} [opts.showCancel=true]
     * @returns {Promise<{isConfirmed:boolean, value:*}>}
     */
    function actsDialog(opts) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'acts-dlg-overlay';

            let html = '<div class="acts-dlg-panel">';
            if (opts.title) html += `<div class="acts-dlg-title">${opts.title}</div>`;
            if (opts.description) html += `<div class="acts-dlg-desc">${opts.description}</div>`;
            html += '<div class="acts-dlg-body"></div>';
            html += '<div class="acts-dlg-err"></div>';
            html += '<div class="acts-dlg-actions"></div>';
            html += '</div>';
            overlay.innerHTML = html;

            const panel   = overlay.querySelector('.acts-dlg-panel');
            const body    = overlay.querySelector('.acts-dlg-body');
            const errEl   = overlay.querySelector('.acts-dlg-err');
            const actions = overlay.querySelector('.acts-dlg-actions');
            let inputEl   = null;

            // Build input
            if (opts.input === 'textarea') {
                inputEl = document.createElement('textarea');
                inputEl.className = 'acts-dlg-input';
                inputEl.rows = 3;
                inputEl.placeholder = opts.inputPlaceholder || '';
                body.appendChild(inputEl);
            } else if (opts.input === 'select') {
                inputEl = document.createElement('select');
                inputEl.className = 'acts-dlg-select';
                if (opts.inputPlaceholder) {
                    const o = document.createElement('option');
                    o.value = ''; o.textContent = opts.inputPlaceholder;
                    o.disabled = true; o.selected = true;
                    inputEl.appendChild(o);
                }
                if (opts.inputOptions) {
                    Object.entries(opts.inputOptions).forEach(([k, v]) => {
                        const o = document.createElement('option');
                        o.value = k; o.textContent = v;
                        inputEl.appendChild(o);
                    });
                }
                body.appendChild(inputEl);
            } else if (opts.input === 'text') {
                inputEl = document.createElement('input');
                inputEl.type = 'text';
                inputEl.className = 'acts-dlg-input';
                inputEl.placeholder = opts.inputPlaceholder || '';
                body.appendChild(inputEl);
            }

            // Cancel button
            if (opts.showCancel !== false) {
                const cb = document.createElement('button');
                cb.className = 'acts-dlg-btn acts-dlg-btn-cancel';
                cb.textContent = opts.cancelButtonText || 'Cancel';
                cb.addEventListener('click', () => { close(); resolve({ isConfirmed: false, value: null }); });
                actions.appendChild(cb);
            }

            // Confirm button
            const style = opts.confirmStyle || 'confirm';
            const cfm = document.createElement('button');
            cfm.className = `acts-dlg-btn acts-dlg-btn-${style}`;
            cfm.textContent = opts.confirmButtonText || 'Confirm';
            cfm.addEventListener('click', () => {
                if (inputEl && opts.inputValidator) {
                    const err = opts.inputValidator(inputEl.value);
                    if (err) { errEl.textContent = err; errEl.style.display = 'block'; return; }
                }
                const val = inputEl ? inputEl.value : true;
                close();
                resolve({ isConfirmed: true, value: val });
            });
            actions.appendChild(cfm);

            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add('show'));

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) { close(); resolve({ isConfirmed: false, value: null }); }
            });

            if (inputEl) setTimeout(() => inputEl.focus(), 100);

            function close() {
                overlay.classList.remove('show');
                setTimeout(() => overlay.remove(), 150);
            }
        });
    }

    window.actsDialog = actsDialog;

    /* ── Toast-Action Panel (Sonner-style) ──────────────────── */
    const taCss = document.createElement('style');
    taCss.textContent = `
        .acts-ta-wrap{position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:9999;width:380px;pointer-events:none}
        .acts-ta-card{pointer-events:auto;background:#fff;border:1px solid #e4e4e7;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.12),0 2px 6px rgba(0,0,0,.06);padding:16px;font-family:Geist,sans-serif;transform:translateY(-120%);opacity:0;transition:transform .3s cubic-bezier(.22,1,.36,1),opacity .2s ease}
        .acts-ta-card.show{transform:translateY(0);opacity:1}
        .acts-ta-card.hide{transform:translateY(-120%);opacity:0}
        .acts-ta-user{display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #f4f4f5}
        .acts-ta-avatar{width:36px;height:36px;border-radius:50%;background:#6366f1;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;overflow:hidden;border:2px solid #e0e7ff}
        .acts-ta-avatar img{width:100%;height:100%;object-fit:cover;object-position:top}
        .acts-ta-name{font-size:13px;font-weight:600;color:#27272a}
        .acts-ta-meta{font-size:11px;color:#a1a1aa;font-weight:500}
        .acts-ta-role-badge{display:inline-block;font-size:10px;font-weight:600;padding:2px 8px;border-radius:99px;margin-top:2px}
        .acts-ta-title{font-size:14px;font-weight:700;color:#27272a;margin-bottom:2px}
        .acts-ta-desc{font-size:12px;color:#71717a;margin-bottom:14px;line-height:1.5}
        .acts-ta-desc b{color:#3f3f46}
        .acts-ta-select{width:100%;box-sizing:border-box;border:1px solid #e4e4e7;border-radius:8px;padding:8px 30px 8px 10px;font-size:12px;color:#3f3f46;outline:none;transition:border-color .15s;font-family:inherit;margin-bottom:12px;background:#fff;cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center}
        .acts-ta-select:focus{border-color:#818cf8}
        .acts-ta-err{font-size:10px;color:#ef4444;margin-top:-8px;margin-bottom:8px;font-weight:500;display:none}
        .acts-ta-actions{display:flex;justify-content:flex-end;gap:6px;margin-top:2px}
        .acts-ta-btn{padding:6px 14px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:none;transition:all .15s;font-family:inherit}
        .acts-ta-btn-cancel{background:#fff;color:#71717a;border:1px solid #e4e4e7}
        .acts-ta-btn-cancel:hover{background:#fafafa}
        .acts-ta-btn-confirm{background:#6366f1;color:#fff}
        .acts-ta-btn-confirm:hover{background:#4f46e5}
        .acts-ta-btn-danger{background:#ef4444;color:#fff}
        .acts-ta-btn-danger:hover{background:#dc2626}
        .acts-ta-btn-warning{background:#f59e0b;color:#fff}
        .acts-ta-btn-warning:hover{background:#d97706}
    `;
    document.head.appendChild(taCss);

    function getTaContainer() {
        let c = document.getElementById('acts-ta-container');
        if (!c) { c = document.createElement('div'); c.id = 'acts-ta-container'; c.className = 'acts-ta-wrap'; document.body.appendChild(c); }
        return c;
    }

    // Dismiss all existing toast-action cards so they never stack
    function dismissAllTaCards() {
        const container = document.getElementById('acts-ta-container');
        if (!container) return;
        container.querySelectorAll('.acts-ta-card').forEach(card => {
            card.classList.remove('show');
            card.classList.add('hide');
            setTimeout(() => card.remove(), 300);
        });
    }

    const ROLE_BADGE_STYLES = {
        super_admin: 'background:#fffbeb;color:#b45309;border:1px solid #fde68a',
        admin:       'background:#eef2ff;color:#4338ca;border:1px solid #c7d2fe',
        editor:      'background:#f5f3ff;color:#6d28d9;border:1px solid #ddd6fe',
        user:        'background:#fafafa;color:#52525b;border:1px solid #e4e4e7'
    };
    const ROLE_LABELS = { super_admin:'Super Admin', admin:'Admin', editor:'Editor', user:'User' };

    /**
     * Toast-action panel (Sonner-style floating card, center-top).
     * Only one visible at a time — opening a new one dismisses the previous.
     */
    function actsToastAction(opts) {
        dismissAllTaCards();

        return new Promise((resolve) => {
            const container = getTaContainer();
            const card = document.createElement('div');
            card.className = 'acts-ta-card';

            let html = '';

            if (opts.user) {
                const u = opts.user;
                const badge = ROLE_BADGE_STYLES[u.role] || ROLE_BADGE_STYLES.user;
                const label = ROLE_LABELS[u.role] || u.role || '';
                html += `<div class="acts-ta-user">
                    <div class="acts-ta-avatar">
                        <img src="http://10.2.0.8/lrnph/emp_photos/${u.empId || ''}.jpg"
                             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
                             alt="">
                        <span style="display:none;width:100%;height:100%;align-items:center;justify-content:center">${u.initials || ''}</span>
                    </div>
                    <div style="min-width:0;flex:1">
                        <div class="acts-ta-name">${u.name || '—'}</div>
                        <span class="acts-ta-role-badge" style="${badge}">${label}</span>
                    </div>
                </div>`;
            }

            if (opts.title) html += `<div class="acts-ta-title">${opts.title}</div>`;
            if (opts.description) html += `<div class="acts-ta-desc">${opts.description}</div>`;

            card.innerHTML = html;

            let inputEl = null;
            if (opts.input === 'select' && opts.inputOptions) {
                inputEl = document.createElement('select');
                inputEl.className = 'acts-ta-select';
                if (opts.inputPlaceholder) {
                    const o = document.createElement('option');
                    o.value = ''; o.textContent = opts.inputPlaceholder;
                    o.disabled = true; o.selected = true;
                    inputEl.appendChild(o);
                }
                Object.entries(opts.inputOptions).forEach(([k, v]) => {
                    const o = document.createElement('option');
                    o.value = k; o.textContent = v;
                    inputEl.appendChild(o);
                });
                card.appendChild(inputEl);
            }

            const errEl = document.createElement('div');
            errEl.className = 'acts-ta-err';
            card.appendChild(errEl);

            const actions = document.createElement('div');
            actions.className = 'acts-ta-actions';

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'acts-ta-btn acts-ta-btn-cancel';
            cancelBtn.textContent = opts.cancelButtonText || 'Cancel';
            cancelBtn.addEventListener('click', () => { close(); resolve({ isConfirmed: false, value: null }); });
            actions.appendChild(cancelBtn);

            const style = opts.confirmStyle || 'confirm';
            const cfmBtn = document.createElement('button');
            cfmBtn.className = `acts-ta-btn acts-ta-btn-${style}`;
            cfmBtn.textContent = opts.confirmButtonText || 'Confirm';
            cfmBtn.addEventListener('click', () => {
                if (inputEl && opts.inputValidator) {
                    const err = opts.inputValidator(inputEl.value);
                    if (err) { errEl.textContent = err; errEl.style.display = 'block'; return; }
                }
                const val = inputEl ? inputEl.value : true;
                close();
                resolve({ isConfirmed: true, value: val });
            });
            actions.appendChild(cfmBtn);

            card.appendChild(actions);
            container.appendChild(card);

            setTimeout(() => card.classList.add('show'), 50);

            const outsideClick = (e) => {
                if (!card.contains(e.target)) {
                    close();
                    resolve({ isConfirmed: false, value: null });
                }
            };
            setTimeout(() => document.addEventListener('click', outsideClick), 10);

            function close() {
                document.removeEventListener('click', outsideClick);
                card.classList.remove('show');
                card.classList.add('hide');
                setTimeout(() => card.remove(), 300);
            }
        });
    }

    window.actsToastAction = actsToastAction;
})();
