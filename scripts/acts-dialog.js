/**
 * ACTS Dialog — lightweight confirm / input dialogs (shadcn-style)
 * Replaces SweetAlert2 modals. Toasts are handled by Sonner.
 */
(function () {
    const css = document.createElement('style');
    css.textContent = `
        .acts-dlg-overlay{position:fixed;inset:0;z-index:9998;background:rgba(9,9,11,0.8);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s ease}
        .acts-dlg-overlay.show{opacity:1}
        .acts-dlg-panel{background:#ffffff;border:1px solid #e4e4e7;border-radius:8px;box-shadow:0 10px 15px -3px rgba(0,0,0,.1),0 4px 6px -4px rgba(0,0,0,.1);max-width:425px;width:100%;padding:24px;transform:scale(.98) translateY(0);transition:transform .2s ease;font-family:Geist,ui-sans-serif,system-ui,sans-serif}
        .acts-dlg-overlay.show .acts-dlg-panel{transform:scale(1) translateY(0)}
        .acts-dlg-title{font-size:18px;font-weight:600;color:#09090b;margin-bottom:6px;letter-spacing:-0.015em;line-height:1}
        .acts-dlg-desc{font-size:14px;color:#71717a;line-height:1.5;margin-bottom:20px}
        .acts-dlg-desc b{color:#09090b;font-weight:600}
        .acts-dlg-input,.acts-dlg-select{width:100%;box-sizing:border-box;border:1px solid #e4e4e7;border-radius:6px;padding:8px 12px;font-size:14px;color:#09090b;background:#ffffff;outline:none;transition:border-color .15s,box-shadow .15s;font-family:inherit;margin-bottom:16px;height:40px;box-shadow:0 1px 2px 0 rgba(0,0,0,0.05)}
        .acts-dlg-input:hover,.acts-dlg-select:hover{border-color:#d4d4d8}
        .acts-dlg-input:focus,.acts-dlg-select:focus{border-color:#09090b;box-shadow:0 0 0 1px #09090b}
        .acts-dlg-input::placeholder{color:#a1a1aa}
        textarea.acts-dlg-input{resize:none;height:auto;min-height:80px}
        .acts-dlg-select{cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:32px}
        .acts-dlg-err{font-size:13px;color:#ef4444;margin-top:-8px;margin-bottom:16px;font-weight:500;display:none}
        .acts-dlg-actions{display:flex;justify-content:flex-end;gap:8px}
        .acts-dlg-btn{display:inline-flex;align-items:center;justify-content:center;height:40px;padding:0 16px;border-radius:6px;font-size:14px;font-weight:500;cursor:pointer;border:none;transition:background-color .15s,color .15s;font-family:inherit}
        .acts-dlg-btn:active{transform:none}
        .acts-dlg-btn-cancel{background:#ffffff;color:#09090b;border:1px solid #e4e4e7;box-shadow:0 1px 2px 0 rgba(0,0,0,0.05)}
        .acts-dlg-btn-cancel:hover{background:#f4f4f5;color:#09090b}
        .acts-dlg-btn-confirm{background:#18181b;color:#fafafa;box-shadow:0 1px 2px 0 rgba(0,0,0,0.05)}
        .acts-dlg-btn-confirm:hover{background:#27272a}
        .acts-dlg-btn-danger{background:#ef4444;color:#fafafa;box-shadow:0 1px 2px 0 rgba(0,0,0,0.05)}
        .acts-dlg-btn-danger:hover{background:#dc2626}
        .acts-dlg-btn-warning{background:#f59e0b;color:#fafafa;box-shadow:0 1px 2px 0 rgba(0,0,0,0.05)}
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
        .acts-ta-wrap{position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:9999;width:380px;max-width:95vw;pointer-events:none}
        .acts-ta-card{pointer-events:auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:8px;box-shadow:0 10px 15px -3px rgba(0,0,0,.1),0 4px 6px -4px rgba(0,0,0,.1);padding:16px;font-family:Geist,ui-sans-serif,system-ui,sans-serif;transform:translateY(-120%);opacity:0;transition:transform .3s ease,opacity .3s ease}
        .acts-ta-card.show{transform:translateY(0);opacity:1}
        .acts-ta-card.hide{transform:translateY(-120%);opacity:0}
        .acts-ta-user{display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #f4f4f5}
        .acts-ta-avatar{width:40px;height:40px;border-radius:50%;background:#e4e4e7;color:#09090b;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;flex-shrink:0;overflow:hidden;border:none}
        .acts-ta-avatar img{width:100%;height:100%;object-fit:cover;object-position:top}
        .acts-ta-name{font-size:14px;font-weight:600;color:#09090b;line-height:1}
        .acts-ta-meta{font-size:12px;color:#71717a;font-weight:500;margin-top:2px}
        .acts-ta-role-badge{display:inline-block;font-size:11px;font-weight:500;padding:2px 8px;border-radius:99px;margin-top:6px}
        .acts-ta-title{font-size:16px;font-weight:600;color:#09090b;margin-bottom:4px;letter-spacing:-0.015em;line-height:1}
        .acts-ta-desc{font-size:14px;color:#71717a;margin-bottom:16px;line-height:1.5}
        .acts-ta-desc b{color:#09090b;font-weight:600}
        .acts-ta-select{width:100%;box-sizing:border-box;border:1px solid #e4e4e7;border-radius:6px;padding:8px 30px 8px 12px;font-size:14px;color:#09090b;outline:none;transition:border-color .15s,box-shadow .15s;font-family:inherit;margin-bottom:16px;background:#ffffff;box-shadow:0 1px 2px 0 rgba(0,0,0,0.05);height:40px;cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center}
        .acts-ta-select:hover{border-color:#d4d4d8}
        .acts-ta-select:focus{border-color:#09090b;box-shadow:0 0 0 1px #09090b}
        .acts-ta-err{font-size:13px;color:#ef4444;margin-top:-8px;margin-bottom:16px;font-weight:500;display:none}
        .acts-ta-actions{display:flex;justify-content:flex-end;gap:8px}
        .acts-ta-btn{display:inline-flex;align-items:center;justify-content:center;height:40px;padding:0 16px;border-radius:6px;font-size:14px;font-weight:500;cursor:pointer;border:none;transition:background-color .15s,color .15s;font-family:inherit}
        .acts-ta-btn:active{transform:none}
        .acts-ta-btn-cancel{background:#ffffff;color:#09090b;border:1px solid #e4e4e7;box-shadow:0 1px 2px 0 rgba(0,0,0,0.05)}
        .acts-ta-btn-cancel:hover{background:#f4f4f5;color:#09090b}
        .acts-ta-btn-confirm{background:#18181b;color:#fafafa;box-shadow:0 1px 2px 0 rgba(0,0,0,0.05)}
        .acts-ta-btn-confirm:hover{background:#27272a}
        .acts-ta-btn-danger{background:#ef4444;color:#fafafa;box-shadow:0 1px 2px 0 rgba(0,0,0,0.05)}
        .acts-ta-btn-danger:hover{background:#dc2626}
        .acts-ta-btn-warning{background:#f59e0b;color:#fafafa;box-shadow:0 1px 2px 0 rgba(0,0,0,0.05)}
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
