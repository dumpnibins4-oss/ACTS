// ── Profile Dropdown ────────────────────────────────────────────────────────
const toggleProfileExp = () => {
    const dropdown = document.getElementById('profile-dropdown')
    const chevron  = document.getElementById('profile-chevron')
    const isOpen   = !dropdown.classList.contains('pointer-events-none')

    if (isOpen) {
        dropdown.classList.add('opacity-0', 'scale-95', 'pointer-events-none')
        dropdown.classList.remove('opacity-100', 'scale-100')
        chevron.classList.remove('rotate-180')
    } else {
        dropdown.classList.remove('opacity-0', 'scale-95', 'pointer-events-none')
        dropdown.classList.add('opacity-100', 'scale-100')
        chevron.classList.add('rotate-180')
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const wrapper  = document.getElementById('profile-wrapper')
    const dropdown = document.getElementById('profile-dropdown')
    if (wrapper && !wrapper.contains(e.target)) {
        dropdown.classList.add('opacity-0', 'scale-95', 'pointer-events-none')
        dropdown.classList.remove('opacity-100', 'scale-100')
        document.getElementById('profile-chevron')?.classList.remove('rotate-180')
    }
})

// ── Navigation ──────────────────────────────────────────────────────────────
const navigateTo = async (page, title) => {
    const mainContent = document.getElementById('main-content')
    const navBtns     = document.querySelectorAll('.nav-btn')

    // Update active state — animate underline
    navBtns.forEach(btn => {
        const underline = btn.querySelector('.nav-underline')
        const isActive  = btn.getAttribute('data-page') === page

        if (isActive) {
            btn.classList.add('text-zinc-800')
            btn.classList.remove('text-zinc-500')
            underline?.classList.add('scale-x-100')
            underline?.classList.remove('scale-x-0')
        } else {
            btn.classList.remove('text-zinc-800')
            btn.classList.add('text-zinc-500')
            underline?.classList.remove('scale-x-100')
            underline?.classList.add('scale-x-0')
        }
    })

    // Load page content via fetch
    try {
        const response = await fetch(`./Pages/${page}.php`)
        if (response.ok) {
            const html = await response.text()

            // Remove old page-injected scripts/styles
            document.querySelectorAll('[data-page-injected]').forEach(el => el.remove())

            // Parse the HTML and separate scripts/styles from content
            const parser = new DOMParser()
            const doc    = parser.parseFromString(html, 'text/html')

            const scripts = doc.querySelectorAll('script')
            const styles  = doc.querySelectorAll('style')

            scripts.forEach(s => s.remove())
            styles.forEach(s => s.remove())

            mainContent.innerHTML = doc.body.innerHTML

            // Inject styles
            styles.forEach(style => {
                const el = document.createElement('style')
                el.textContent = style.textContent
                el.setAttribute('data-page-injected', 'true')
                document.head.appendChild(el)
            })

            // Execute scripts
            scripts.forEach(script => {
                const el = document.createElement('script')
                if (script.src) {
                    el.src = script.src
                } else {
                    el.textContent = script.textContent
                }
                el.setAttribute('data-page-injected', 'true')
                document.body.appendChild(el)
            })

            document.getElementsByTagName('title')[0].innerHTML = `ACTS | ${title}`
        } else {
            mainContent.innerHTML = `<div class="flex items-center justify-center h-full w-full"><p class="text-zinc-400">Page not found.</p></div>`
        }
    } catch (err) {
        mainContent.innerHTML = `<div class="flex items-center justify-center h-full w-full"><p class="text-red-400">Error loading page.</p></div>`
    }

    // Persist current page
    sessionStorage.setItem('currentPage', page)
    sessionStorage.setItem('currentTitle', title)
}

// ── Initial Load ─────────────────────────────────────────────────────────────
const mainContent = document.getElementById('main-content')
const myRole      = mainContent.dataset.role

const defaultPages = {
    super_admin: { page: 'user-management', title: 'User Management' },
    admin:       { page: 'user-management', title: 'User Management' },
    editor:      { page: 'create-ticket',   title: 'Create Ticket'   },
    user:        { page: 'ticket-history',  title: 'Ticket History'  },
}

const defaults   = defaultPages[myRole] || defaultPages['user']
const savedPage  = sessionStorage.getItem('currentPage')  || defaults.page
const savedTitle = sessionStorage.getItem('currentTitle') || defaults.title

navigateTo(savedPage, savedTitle)

// ── Sign Out ────────────────────────────────────────────────────────────────
const handleSignOut = () => {
    Swal.fire({
        title: 'Signing Out...',
        text: 'Are you sure you want to sign out?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#6366f1',
        cancelButtonColor: '#e11d48',
        confirmButtonText: 'Yes, Sign Out!'
    }).then((result) => {
        if (result.isConfirmed) {
            sessionStorage.removeItem('currentPage')
            sessionStorage.removeItem('currentTitle')
            window.location.href = './Auth/logout.php'
        }
    })
}