
// Toggle Profile Expansion
const toggleProfileExp = () => {
    const content = document.getElementById('expanded-profile-content')
    const switcher = document.getElementById('profile-switcher')
    if (content.classList.contains('grid-rows-[0fr]')) {
        content.classList.remove('grid-rows-[0fr]', 'opacity-0')
        content.classList.add('grid-rows-[1fr]', 'opacity-100')
        switcher.classList.add('rotate-180')
    } else {
        content.classList.remove('grid-rows-[1fr]', 'opacity-100')
        content.classList.add('grid-rows-[0fr]', 'opacity-0')
        switcher.classList.remove('rotate-180')
    }
}

// Navigation
const navigateTo = async (page) => {
    const mainContent = document.getElementById('main-content')
    const navBtns = document.querySelectorAll('.nav-btn')

    // Update active state on buttons
    navBtns.forEach(btn => {
        const isActive = btn.getAttribute('data-page') === page
        if (isActive) {
            btn.classList.add('bg-indigo-500')
            btn.classList.remove('hover:bg-zinc-800/90')
        } else {
            btn.classList.remove('bg-indigo-500')
            btn.classList.add('hover:bg-zinc-800/90')
        }
    })

    // Load page content via fetch
    try {
        const response = await fetch(`./Pages/${page}.php`)
        if (response.ok) {
            mainContent.innerHTML = await response.text()
        } else {
            mainContent.innerHTML = `<div class="flex items-center justify-center h-full w-full"><p class="text-zinc-400">Page not found.</p></div>`
        }
    } catch (err) {
        mainContent.innerHTML = `<div class="flex items-center justify-center h-full w-full"><p class="text-red-400">Error loading page.</p></div>`
    }

    // Persist current page
    sessionStorage.setItem('currentPage', page)
}

// Load saved page or default on startup
const savedPage = sessionStorage.getItem('currentPage') || 'payroll-request'
navigateTo(savedPage)

// Handle Sign-Out
const handleSignOut = () => {
    Swal.fire({
        title: "Signing Out...",
        text: "Are you sure you want to sign out?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, Sign Out!"
    }).then((result) => {
        if (result.isConfirmed) {
            sessionStorage.removeItem('currentPage')
            window.location.href = "./Auth/logout.php"
        }
    })
}