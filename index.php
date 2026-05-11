<?php
    session_start();

    if (!isset($_SESSION['user_role'])) {
        header("Location: ./Auth/login.php");
        exit;
    }

    $routes = [
        ['title' => 'Create Ticket', 'route' => 'create-ticket', 'icon' => 'fa-solid fa-file-lines'],
        ['title' => 'My Tickets',    'route' => 'my-tickets',    'icon' => 'fa-solid fa-ticket'],
        ['title' => 'Ticket History','route' => 'ticket-history','icon' => 'fa-solid fa-clock-rotate-left'],
    ];

    // $itRoutes = [
    //     ['title' => 'Dashboard',    'route' => 'dashboard',    'icon' => 'fa-solid fa-file-lines'],
    //     ['title' => 'My Tickets',   'route' => 'my-tickets',    'icon' => 'fa-solid fa-ticket'],
    //     ['title' => 'Ticket History','route' => 'ticket-history','icon' => 'fa-solid fa-clock-rotate-left'],
    // ];

    $firstName  = $_SESSION['user_information']['FirstName']  ?? '';
    $middleName = $_SESSION['user_information']['MiddleName'] ?? '';
    $lastName   = $_SESSION['user_information']['LastName']   ?? '';
    $empID      = $_SESSION['user_information']['EmployeeID'] ?? '';
    $dept       = $_SESSION['user_information']['Department'] ?? '';
    $role       = $_SESSION['user_role'] ?? 'user';
    $fullName   = $firstName . ' ' . substr($middleName, 0, 1) . '. ' . $lastName;
    $initials   = strtoupper(substr($firstName, 0, 1) . substr($lastName, 0, 1));
    $roleLabel  = $role === 'super_admin' ? 'Super Admin' : ucfirst($role);
?>

<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="icon" href="./Assets/logo/larose.jpg">
        <!-- Tailwind CSS -->
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
        <!-- Font Awesome -->
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css">
        <!-- SweetAlert2 -->
        <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
        <!-- Styles -->
        <link rel="stylesheet" href="./Styles/styles.css" />
        <!-- Geist Sans Font -->
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap" rel="stylesheet">
        <title>ACTS | </title>
    </head>
    <body class="overflow-x-hidden">
        <div class="flex flex-col items-start justify-start w-full min-h-screen bg-zinc-100 font-geist">

            <!-- ── Floating Header ───────────────────────────────────── -->
            <header class="relative z-50 w-full flex-shrink-0 px-4 pt-3">
                <nav class="flex flex-row items-center justify-between w-full h-14 bg-white/80 backdrop-blur-xl border border-zinc-200/80 rounded-2xl px-96 shadow-sm shadow-zinc-200/60">

                    <!-- Logo -->
                    <div class="flex items-center gap-2 select-none">
                        <div class="flex items-center justify-center w-7 h-7 bg-indigo-500 rounded-lg">
                            <i class="fa-solid fa-ticket text-white text-xs"></i>
                        </div>
                        <span class="text-base font-extrabold text-zinc-800 tracking-tight">ACTS</span>
                    </div>

                    <!-- Navigation -->
                    <div id="nav-buttons" class="flex flex-row items-center gap-1">
                        <?php foreach ($routes as $route) : ?>
                            <button
                                onclick="navigateTo('<?= $route['route'] ?>', '<?= $route['title'] ?>')"
                                data-page="<?= $route['route'] ?>"
                                class="nav-btn relative flex flex-row items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-all duration-200 cursor-pointer group"
                            >
                                <i class="<?= $route['icon'] ?> text-xs"></i>
                                <span><?= $route['title'] ?></span>
                                <!-- animated underline -->
                                <span class="nav-underline absolute bottom-1 left-4 right-4 h-0.5 rounded-full bg-indigo-500 scale-x-0 transition-transform duration-250 origin-left"></span>
                            </button>
                        <?php endforeach; ?>
                    </div>

                    <!-- Profile Avatar (trigger) -->
                    <div class="relative" id="profile-wrapper">
                        <button id="profile-btn" onclick="toggleProfileExp()" class="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-xl hover:bg-zinc-100 transition-all duration-200 cursor-pointer group">
                            <img
                                draggable="false"
                                src="http://10.2.0.8/lrnph/emp_photos/<?= $empID ?>.jpg"
                                alt="<?= $firstName ?>"
                                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                                class="w-8 h-8 object-cover object-top rounded-full border-2 border-zinc-200 group-hover:border-indigo-300 transition-all duration-200"
                            >
                            <!-- Fallback initials avatar -->
                            <div style="display:none" class="w-8 h-8 rounded-full border-2 border-indigo-300 bg-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                <?= $initials ?>
                            </div>
                            <div class="flex flex-col items-start leading-tight">
                                <span class="text-xs font-semibold text-zinc-800"><?= $firstName ?></span>
                                <span class="text-[10px] text-zinc-400 font-medium"><?= $roleLabel ?></span>
                            </div>
                            <i id="profile-chevron" class="fa-solid fa-chevron-down text-[10px] text-zinc-400 transition-transform duration-300 ml-0.5"></i>
                        </button>

                        <!-- Dropdown Panel -->
                        <div
                            id="profile-dropdown"
                            class="absolute right-0 top-full mt-2 w-64 bg-white border border-zinc-200 rounded-2xl shadow-lg shadow-zinc-200/60 overflow-hidden
                                   opacity-0 scale-95 pointer-events-none transition-all duration-200 origin-top-right"
                        >
                            <!-- User card -->
                            <div class="flex flex-row items-center gap-3 px-4 py-4 bg-gradient-to-br from-indigo-50 to-white border-b border-zinc-100">
                                <img
                                    draggable="false"
                                    src="http://10.2.0.8/lrnph/emp_photos/<?= $empID ?>.jpg"
                                    alt="<?= $firstName ?>"
                                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                                    class="w-12 h-12 object-cover object-top rounded-full border-2 border-indigo-200 flex-shrink-0"
                                >
                                <div style="display:none" class="w-12 h-12 rounded-full border-2 border-indigo-300 bg-indigo-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                    <?= $initials ?>
                                </div>
                                <div class="flex flex-col min-w-0">
                                    <p class="text-sm font-semibold text-zinc-800 truncate"><?= $fullName ?></p>
                                    <p class="text-xs text-zinc-400 font-medium truncate"><?= $dept ?></p>
                                    <div class="flex items-center gap-1 mt-0.5">
                                        <?php if ($role === 'super_admin') : ?>
                                            <i class="fa-solid fa-crown text-yellow-500 text-[10px]"></i>
                                        <?php elseif ($role === 'admin') : ?>
                                            <i class="fa-solid fa-crown text-blue-500 text-[10px]"></i>
                                        <?php endif; ?>
                                        <span class="text-[10px] font-medium text-indigo-500"><?= $roleLabel ?></span>
                                    </div>
                                </div>
                            </div>

                            <!-- Info rows -->
                            <div class="flex flex-col gap-0 px-4 py-3">
                                <div class="flex items-center gap-2 py-1.5">
                                    <i class="fa-solid fa-id-badge text-zinc-300 text-xs w-4 text-center"></i>
                                    <div>
                                        <p class="text-[10px] text-zinc-400 font-medium leading-none">Employee ID</p>
                                        <p class="text-xs font-semibold text-zinc-700 font-mono"><?= $empID ?></p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-2 py-1.5">
                                    <i class="fa-solid fa-building text-zinc-300 text-xs w-4 text-center"></i>
                                    <div>
                                        <p class="text-[10px] text-zinc-400 font-medium leading-none">Department</p>
                                        <p class="text-xs font-semibold text-zinc-700"><?= $dept ?></p>
                                    </div>
                                </div>
                            </div>

                            <!-- Sign out -->
                            <div class="px-3 pb-3">
                                <button
                                    onclick="handleSignOut()"
                                    class="flex flex-row items-center justify-center w-full gap-2 py-2 rounded-xl text-xs font-medium text-zinc-500 border border-zinc-200 hover:border-red-300 hover:bg-red-50 hover:text-red-500 transition-all duration-200 cursor-pointer"
                                >
                                    <i class="fa-solid fa-arrow-right-from-bracket text-xs"></i>
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </div>

                </nav>
            </header>

            <!-- ── Main Content ──────────────────────────────────────── -->
            <div id="main-content" class="flex flex-col flex-1 w-full overflow-y-auto pb-4 px-100 pt-10 min-h-0"></div>
            
            <!-- Footer -->
            <footer id="footer" class="w-full h-auto flex flex-col items-center justify-center gap-3 py-4">
                <img src="./Assets/logo/logo.png" alt="" class="w-50 h-auto object-contain">
            </footer>
        </div>
    </body>
</html>

<script src="scripts/index-scripts.js"></script>