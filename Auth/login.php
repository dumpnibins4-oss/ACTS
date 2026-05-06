
<?php
    session_start();
?>

<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="icon" href="../Assets/logo/larose.jpg">
        <!-- Tailwind CSS -->
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
        <!-- Geist Sans Font -->
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap" rel="stylesheet">
        <!-- Fontawesome -->
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css">
        <!-- SweetAlert2 -->
        <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
        <title>ACTS | Login</title>
        <style>
            @keyframes float1 { 0%, 100% { transform: translateY(0px) rotate(-2deg); } 50% { transform: translateY(-8px) rotate(-2deg); } }
            @keyframes float2 { 0%, 100% { transform: translateY(0px) rotate(1.5deg); } 50% { transform: translateY(-10px) rotate(1.5deg); } }
            @keyframes float3 { 0%, 100% { transform: translateY(0px) rotate(-1deg); } 50% { transform: translateY(-7px) rotate(-1deg); } }
            @keyframes float4 { 0%, 100% { transform: translateY(0px) rotate(2deg); } 50% { transform: translateY(-9px) rotate(2deg); } }
            .card-1 { animation: float1 4.5s ease-in-out infinite; }
            .card-2 { animation: float2 5s ease-in-out infinite 0.6s; }
            .card-3 { animation: float3 4s ease-in-out infinite 1.1s; }
            .card-4 { animation: float4 5.2s ease-in-out infinite 0.3s; }
        </style>
    </head>
    <body>
        <div class="flex items-center justify-center h-screen w-screen bg-linear-to-br from-indigo-100 via-purple-100 to-sky-100 font-[Geist,sans-serif]">
            <img src="../Assets/logo/lrn.png" class="absolute top-5 left-5 w-auto h-12" alt="">
            <div class="flex flex-row items-center justify-center w-[800px] h-[480px] bg-white shadow-lg rounded-2xl overflow-hidden">
                <!-- LEFT SIDE -->
                <div class="flex flex-col items-start justify-between w-1/2 h-full bg-white px-10 py-12">
                    <h1 class="text-xl text-purple-700 font-bold tracking-widest">ACTS</h1>
                    <div class="flex flex-col items-start justify-center w-full h-auto">
                        <h2 class="text-2xl text-zinc-700 font-bold">Sign in</h2>
                        <span class="text-sm text-zinc-500 font-normal">Enter your credentials to continue</span>
                    </div>
                    <form id="login-form" class="flex flex-col items-start justify-start w-full h-auto gap-3">
                        <div class="flex flex-col items-start justify-center w-full h-auto gap-1">
                            <label for="username" class="text-sm text-zinc-700 font-medium">Username</label>
                            <div class="flex flex-row items-center justify-start w-full h-10 border-2 border-zinc-300 rounded-lg pl-3 focus-within:border-indigo-500 transition-all overflow-hidden">
                                <i class="fa-regular fa-user text-sm text-zinc-500"></i>
                                <input type="text" id="username" name="username" class="outline-none flex-1 h-full text-sm focus:outline-none focus:ring-0 pl-2 placeholder:text-zinc-400 font-normal" placeholder="Enter your username">
                            </div>
                        </div>
                        <div class="flex flex-col items-start justify-center w-full h-auto gap-1">
                            <label for="password" class="text-sm text-zinc-700 font-medium">Password</label>
                            <div class="flex flex-row items-center justify-start w-full h-10 border-2 border-zinc-300 rounded-lg pl-3 focus-within:border-indigo-500 transition-all overflow-hidden">
                                <i class="fa-solid fa-key text-sm text-zinc-500"></i>
                                <input type="password" id="password" name="password" class="outline-none flex-1 h-full text-sm focus:outline-none focus:ring-0 pl-2 placeholder:text-zinc-400 font-normal placeholder:tracking-widest" placeholder="••••••••••••">
                                <button type="button" onclick="togglePassword()" class="flex items-center justify-center h-full aspect-square text-zinc-500 hover:text-zinc-900 transition-all cursor-pointer">
                                    <i id="eye" class="fa-regular fa-eye text-sm"></i>
                                </button>
                            </div>
                        </div>
                        <button type="submit" id="submit-btn" class="flex flex-row items-center justify-center w-full h-10 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-all cursor-pointer gap-2 active:scale-95">
                            <div id="loading-spinner" class="w-6 h-6 border-2 border-white border-t-transparent animate-spin hidden transition-all duration-500 rounded-full"></div>
                            <span id="submit-btn-text">Sign in</span>
                        </button>
                    </form>
                    <hr class="w-full border-zinc-200" />
                    <div class="flex flex-row items-center justify-center w-full">
                        <p class="text-xs font-medium text-zinc-500 text-center">Don't have an account? Contact your administrator</p>
                    </div>
                </div>

                <!-- RIGHT SIDE -->
                <div class="relative flex flex-col items-center justify-end w-1/2 h-full bg-linear-to-tr from-indigo-600 via-violet-300 to-indigo-500 overflow-hidden py-8">

                    <!-- Background blobs -->
                    <div class="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-violet-600/10 pointer-events-none"></div>
                    <div class="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-teal-500/5 pointer-events-none"></div>

                    <!-- Cards area -->
                    <div class="relative w-full flex-1 max-w-xs">

                        <!-- Acknowledge card -->
                        <div class="card-1 absolute top-20 left-4 w-52 bg-white border border-white/[0.08] rounded-xl p-3 shadow-lg">
                            <div class="flex items-center gap-2 mb-2">
                                <div class="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                                    <i class="fa-regular fa-circle-check text-violet-400 text-xs"></i>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-[11px] font-medium text-zinc-900 mb-0.5">Acknowledged</p>
                                    <p class="text-[10px] text-zinc-500">Ticket #4821 · just now</p>
                                </div>
                                <span class="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0"></span>
                            </div>
                            <div class="flex gap-1.5 flex-wrap">
                                <span class="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-500">Acknowledged</span>
                                <span class="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-zinc-900">Auto-logged</span>
                            </div>
                        </div>

                        <!-- Classify card -->
                        <div class="card-2 absolute top-2 right-2 w-48 bg-white border border-white/[0.08] rounded-xl p-3 shadow-lg">
                            <div class="flex items-center gap-2 mb-2">
                                <div class="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0">
                                    <i class="fa-solid fa-tags text-indigo-400 text-xs"></i>
                                </div>
                                <div>
                                    <p class="text-[11px] font-medium text-zinc-900 mb-0.5">Classify</p>
                                    <p class="text-[10px] text-zinc-900">Category assigned</p>
                                </div>
                            </div>
                            <div class="flex items-center justify-between">
                                <div class="flex gap-1 flex-wrap">
                                    <span class="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-500">Hardware</span>
                                    <span class="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-zinc-900">P2</span>
                                </div>
                            </div>
                        </div>

                        <!-- Track card -->
                        <div class="card-3 absolute top-44 left-6 w-56 bg-white border border-white/[0.08] rounded-xl p-3 shadow-lg">
                            <div class="flex items-center gap-2 mb-2.5">
                                <div class="w-8 h-8 rounded-lg bg-teal-500/15 flex items-center justify-center shrink-0">
                                    <i class="fa-solid fa-chart-simple text-teal-400 text-xs"></i>
                                </div>
                                <div>
                                    <p class="text-[11px] font-medium text-zinc-900 mb-0.5">Track</p>
                                    <p class="text-[10px] text-zinc-900">Ticket #4821 · Open</p>
                                </div>
                            </div>
                            <div class="flex flex-col gap-1.5">
                                <div class="flex items-center gap-2">
                                    <span class="text-[10px] text-zinc-900 w-16 shrink-0">Acknowledge</span>
                                    <div class="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div class="h-full w-full bg-teal-400 rounded-full"></div>
                                    </div>
                                    <span class="text-[10px] text-teal-400 w-4 text-right">✓</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="text-[10px] text-zinc-900 w-16 shrink-0">Classify</span>
                                    <div class="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div class="h-full w-full bg-teal-400 rounded-full"></div>
                                    </div>
                                    <span class="text-[10px] text-teal-400 w-4 text-right">✓</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="text-[10px] text-zinc-900 w-16 shrink-0">Track</span>
                                    <div class="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div class="h-full w-[60%] bg-violet-400 rounded-full"></div>
                                    </div>
                                    <span class="text-[10px] text-violet-400 w-4 text-right">60%</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="text-[10px] text-zinc-900 w-16 shrink-0">Solve</span>
                                    <div class="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div class="h-full w-[8%] bg-zinc-500 rounded-full"></div>
                                    </div>
                                    <span class="text-[10px] text-zinc-600 w-4 text-right">—</span>
                                </div>
                            </div>
                        </div>

                        <!-- Solve card -->
                        <div class="card-4 absolute top-40 right-2 w-44 bg-white border border-white/[0.08] rounded-xl p-3 shadow-lg">
                            <div class="flex items-center gap-2 mb-2">
                                <div class="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                                    <i class="fa-solid fa-bolt text-amber-400 text-xs"></i>
                                </div>
                                <div>
                                    <p class="text-[11px] font-medium text-zinc-900 mb-0.5">Solved</p>
                                    <p class="text-[10px] text-zinc-900">2h 14m resolution</p>
                                </div>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-[10px] text-zinc-900">SLA met</span>
                                <span class="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">On time</span>
                            </div>
                        </div>

                    </div>

                    <!-- Tagline -->
                    <div class="text-center z-10">
                        <h3 class="text-sm font-medium text-white mb-1">Acknowledge. Classify. Track. Solve.</h3>
                        <p class="text-[11px] text-zinc-300 leading-relaxed">
                            One dashboard for every step<br>of your support workflow.
                        </p>
                    </div>

                </div>

            </div>
        </div>

        <script>
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
                        Swal.fire({
                            title: "Failed!",
                            text: result.message,
                            icon: "error"
                        })
                    }

                    submitBtn.disabled = false
                    loadingSpinner.classList.add("hidden")
                    submitBtnText.textContent = "Sign in"

                } catch (err) {
                    submitBtn.disabled = false
                    loadingSpinner.classList.add("hidden")
                    submitBtnText.textContent = "Sign in"

                    Swal.fire({
                        title: "Error!",
                        text: err.message,
                        icon: "error"
                    })
                }
            })
        </script>
    </body>
</html>