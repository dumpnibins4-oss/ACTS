
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
        <!-- Sonner Toast (ESM) -->
        <script type="module">
            import { Toaster, toast } from 'https://esm.sh/sonner@2?deps=react@18.3.1,react-dom@18.3.1';
            import { createElement }   from 'https://esm.sh/react@18.3.1';
            import { createRoot }      from 'https://esm.sh/react-dom@18.3.1/client';
            const el = document.createElement('div'); el.id = 'sonner-root';
            document.body.appendChild(el);
            createRoot(el).render(createElement(Toaster, { position: 'top-right', theme: 'light', closeButton: true, toastOptions: { style: { fontFamily: 'Geist, ui-sans-serif, system-ui, sans-serif', border: '1px solid #e4e4e7', boxShadow: '0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -4px rgba(0,0,0,.1)', borderRadius: '8px', color: '#09090b' }, classNames: { title: 'font-semibold', description: 'text-zinc-500' } } }));
            window.toast = toast;
        </script>
        <!-- ACTS Dialog -->
        <script src="../scripts/acts-dialog.js"></script>
        <!-- CSS -->
        <link rel="stylesheet" href="../Styles/styles.css">
        <title>ACTS | Login</title>
    </head>
    <body>
        <div class="flex items-center justify-center h-screen w-screen bg-zinc-100 font-[Geist,sans-serif]">
            <!-- <img src="../Assets/logo/lrn.png" class="absolute top-5 left-5 w-auto h-12" alt=""> -->
            <div class="flex flex-row items-center justify-center w-[800px] h-[520px] bg-white shadow-lg rounded-2xl overflow-hidden">
                <!-- LEFT SIDE -->
                <div class="flex flex-col items-start justify-center w-1/2 h-full bg-white px-10 py-12 gap-5">
                    <h1 class="text-xl text-purple-700 font-bold tracking-widest">ACTS</h1>
                    <div class="flex flex-col items-start justify-center w-full h-auto">
                        <h2 class="text-2xl text-zinc-700 font-bold">Sign in</h2>
                        <span class="text-xs text-zinc-500 font-normal">Enter your credentials to continue</span>
                    </div>
                    <form id="login-form" class="flex flex-col items-start justify-start w-full h-auto gap-3">
                        <div class="flex flex-col items-start justify-center w-full h-auto gap-1">
                            <label for="username" class="text-xs text-zinc-700 font-medium">Username</label>
                            <div class="flex flex-row items-center justify-start w-full h-10 border-2 border-zinc-300 rounded-lg pl-3 focus-within:border-indigo-500 transition-all overflow-hidden">
                                <i class="fa-regular fa-user text-xs text-zinc-500"></i>
                                <input type="text" id="username" name="username" class="outline-none flex-1 h-full text-xs focus:outline-none focus:ring-0 pl-2 placeholder:text-zinc-400 font-normal" placeholder="Enter your username">
                            </div>
                        </div>
                        <div class="flex flex-col items-start justify-center w-full h-auto gap-1">
                            <label for="password" class="text-xs text-zinc-700 font-medium">Password</label>
                            <div class="flex flex-row items-center justify-start w-full h-10 border-2 border-zinc-300 rounded-lg pl-3 focus-within:border-indigo-500 transition-all overflow-hidden">
                                <i class="fa-solid fa-key text-xs text-zinc-500"></i>
                                <input type="password" id="password" name="password" class="outline-none flex-1 h-full text-xs focus:outline-none focus:ring-0 pl-2 placeholder:text-zinc-400 font-normal placeholder:tracking-widest" placeholder="••••••••••••">
                                <button type="button" onclick="togglePassword()" class="flex items-center justify-center h-full aspect-square text-zinc-500 hover:text-zinc-900 transition-all cursor-pointer">
                                    <i id="eye" class="fa-regular fa-eye text-xs"></i>
                                </button>
                            </div>
                        </div>
                        <button type="submit" id="submit-btn" class="flex flex-row items-center justify-center w-full h-10 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-all cursor-pointer gap-2 active:scale-95">
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
                                    <p class="text-xs text-zinc-500">Ticket #4821 · just now</p>
                                </div>
                                <span class="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0"></span>
                            </div>
                            <div class="flex gap-1.5 flex-wrap">
                                <span class="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-500">Acknowledged</span>
                                <span class="text-xs px-2 py-0.5 rounded-full bg-white/5 text-zinc-900">Auto-logged</span>
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
                                    <p class="text-xs text-zinc-900">Category assigned</p>
                                </div>
                            </div>
                            <div class="flex items-center justify-between">
                                <div class="flex gap-1 flex-wrap">
                                    <span class="text-xs px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-500">Hardware</span>
                                    <span class="text-xs px-2 py-0.5 rounded-full bg-white/5 text-zinc-900">P2</span>
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
                                    <p class="text-xs text-zinc-900">2h 14m resolution</p>
                                </div>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-xs text-zinc-900">SLA met</span>
                                <span class="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">On time</span>
                            </div>
                        </div>
                    </div>

                    <!-- Tagline -->
                    <div class="text-center z-10">
                        <h3 class="text-xs font-medium text-white mb-1">Acknowledge. Classify. Track. Solve.</h3>
                        <p class="text-[11px] text-zinc-300 leading-relaxed">
                            One dashboard for every step<br>of your support workflow.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </body>
</html>

<script src="../scripts/login-scripts.js"></script>