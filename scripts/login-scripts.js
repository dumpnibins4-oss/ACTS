

// Password toggler
function togglePassword() {
    var password = document.getElementById("password")
    var eye = document.getElementById("eye")
    if (password.type === "password") {
        password.type = "text"
        eye.classList.remove("fa-eye")
        eye.classList.add("fa-eye-slash")
    } else {
        password.type = "password"
        eye.classList.remove("fa-eye-slash")
        eye.classList.add("fa-eye")
    }
}

// Helper: wait for sonner toast to be available
const _toast = (method, title, opts) => {
    const fn = () => window.toast?.[method]?.(title, opts);
    if (window.toast) fn(); else setTimeout(fn, 300);
};

// Login form handler
document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)

    // Loading state
    const submitBtn = document.getElementById("submit-btn")
    const loadingSpinner = document.getElementById("loading-spinner")
    const submitBtnText = document.getElementById("submit-btn-text")
    submitBtn.disabled = true
    loadingSpinner.classList.remove("hidden")
    submitBtnText.textContent = "Authenticating..."

    try {
        const response = await fetch("../API/login-api.php", {
            method: "POST",
            body: formData
        })
        const result = await response.json()
        if (result.success) {
            window.location.href = "../index.php" 
        } else {
            _toast('error', 'Failed!', { description: result.message });
        }

        submitBtn.disabled = false
        loadingSpinner.classList.add("hidden")
        submitBtnText.textContent = "Sign in"

    } catch (err) {
        submitBtn.disabled = false
        loadingSpinner.classList.add("hidden")
        submitBtnText.textContent = "Sign in"

        _toast('error', 'Error!', { description: err.message });
    }
})

document.getElementById('username').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('password').focus();
    }
});