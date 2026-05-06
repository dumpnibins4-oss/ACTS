<?php
    session_start();
    if (!isset($_SESSION['user_role'])) {
        header("Location: ./Auth/login.php");
        exit;
    }

    $routes = [
        ['title' => 'Payroll Request', 'route' => 'payroll-request', 'icon' => 'fa-solid fa-file-lines'],
        ['title' => 'Request History', 'route' => 'request-history', 'icon' => 'fa-solid fa-clock-rotate-left'],
    ];

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
        <link rel="stylesheet" href="../Styles/styles.css" />
        <!-- Geist Sans Font -->
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap" rel="stylesheet">
        <title>ACTS | Home</title>
    </head>
    <body>
        <div class="flex flex-row items-start justify-start w-screen h-screen bg-zinc-100 font-geist">
            <!-- Sidebar -->
            <div class="flex flex-col items-center justify-start w-80 h-full p-3">
                <div class="flex flex-col items-center justify-between w-full h-full bg-black rounded-4xl px-5 py-6 overflow-hidden">
                    <!-- Upper Sidebar -->
                    <div class="flex flex-col items-start justify-start w-full h-auto gap-5">
                        <h1 class="text-white text-xl font-bold tracking-wide">ACTS</h1>
                        <button onclick="toggleProfileExp()" class="flex flex-col items-start justify-start w-full h-auto py-2 px-4 rounded-2xl bg-zinc-800 hover:bg-zinc-800/90 cursor-pointer active:scale-95 transition-all duration-200">
                            <div class="flex flex-row items-start justify-between w-full h-auto">
                                <div class="flex flex-row items-center justify-start h-auto w-auto gap-2">
                                    <div class="h-7 border border-indigo-400 rounded-full"></div>
                                    <img draggable="false" src="http://10.2.0.8/lrnph/emp_photos/<?= $_SESSION['user_information']['EmployeeID'] ?>.jpg" alt="" class="w-13 h-13 object-cover object-top rounded-full">
                                    <h2 class="text-white text-sm font-medium tracking-wide"><?= $_SESSION['user_information']['FirstName'] ?></h2>
                                </div>
                                <div class="h-full w-auto flex flex-row items-center justify-center">
                                    <i id="profile-switcher" class="fa-solid fa-angle-down text-white text-sm transition-transform duration-300"></i>
                                </div>
                            </div>
                            <div id="expanded-profile-content" class="grid grid-rows-[0fr] opacity-0 transition-all duration-300 ease-in-out w-full">
                                <div class="overflow-hidden flex flex-col items-start justify-start w-full gap-3">
                                    <hr class="w-full border border-zinc-700/70 rounded-full mt-3">
                                    <div class="flex flex-col items-start justify-start w-full h-auto gap-2">
                                        <div class="flex flex-col items-start justify-center w-full h-auto">
                                            <h2 class="text-xs text-zinc-400 font-medium">Name</h2>
                                            <h5 class="text-xs text-white font-medium tracking-wide"><?= $_SESSION['user_information']['FirstName'] . ' ' . substr($_SESSION['user_information']['MiddleName'], 0, 1) . '. ' . $_SESSION['user_information']['LastName'] ?></h5>
                                        </div>
                                        <div class="flex flex-col items-start justify-center w-full h-auto">
                                            <h2 class="text-xs text-zinc-400 font-medium">Employee ID</h2>
                                            <h5 class="text-xs text-white font-medium tracking-wide"><?= $_SESSION['user_information']['EmployeeID'] ?></h5>
                                        </div>
                                        <div class="flex flex-col items-start justify-center w-full h-auto">
                                            <h2 class="text-xs text-zinc-400 font-medium">Department</h2>
                                            <h5 class="text-xs text-white font-medium tracking-wide text-left"><?= $_SESSION['user_information']['Department'] ?></h5>
                                        </div>
                                        <div class="flex flex-col items-start justify-center w-full h-auto">
                                            <h2 class="text-xs text-zinc-400 font-medium">Role</h2>
                                            <div class="flex flex-row items-center justify-start gap-1">
                                                <i class="fa-solid <?= $_SESSION['user_role'] === 'super_admin' ? 'fa-crown text-yellow-500' : ($_SESSION['user_role'] === 'admin' ? 'fa-crown text-blue-500' : 'hidden') ?> text-xs"></i>
                                                <h5 class="text-xs text-white font-medium tracking-wide text-left"><?= $_SESSION['user_role'] === 'super_admin' ? 'Super Admin' : ucfirst($_SESSION['user_role']) ?></h5>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </button>

                        <div class="flex flex-row items-center justify-start w-full h-auto gap-2">
                            <p class="text-sm text-zinc-400 font-medium tracking-wide"><span class="font-bold text-white">#</span> Navigation</p>
                            <div class="border border-zinc-400 h-0 flex-1 rounded-full"></div>
                        </div>

                        <!-- Sidebar Navigation -->
                        <div id="nav-buttons" class="flex flex-col items-center justify-start w-full h-auto gap-3">
                            <?php foreach ($routes as $route) : ?>
                                <button onclick="navigateTo('<?= $route['route'] ?>')" data-page="<?= $route['route'] ?>" class="nav-btn active flex flex-row items-center justify-start w-full h-12 px-4 rounded-2xl bg-indigo-500 cursor-pointer active:scale-95 transition-all duration-200 gap-3">
                                    <i class="fa-solid <?= $route['icon'] ?> text-sm text-white"></i>
                                    <span class="text-white text-sm font-medium tracking-wide"><?= $route['title'] ?></span>
                                </button>
                            <?php endforeach; ?>
                        </div>
                        <hr class="w-full border border-zinc-700" />
                        <button onclick="handleSignOut()" class="flex flex-row items-center justify-center w-full h-10 gap-2 rounded-xl border border-zinc-700 hover:border-red-500 hover:bg-red-500/10 transition-all duration-200 cursor-pointer active:scale-95 group">
                            <i class="fa-solid fa-arrow-right-from-bracket text-sm text-zinc-400 group-hover:text-red-400 transition-colors duration-200"></i>
                            <span class="text-sm font-medium tracking-wide text-zinc-400 group-hover:text-red-400 transition-colors duration-200">Sign Out</span>
                        </button>
                    </div>
                    <!-- Lower Sidebar -->
                    <div class="flex flex-col items-center justify-end w-full h-auto">
                        <img draggable="false" src="./Assets/logo/logo.png" alt="" class="w-1/2 h-auto object-cover invert-70">
                    </div>
                </div>
            </div>

            <!-- Main Content -->
            <div id="main-content" class="flex flex-col h-full flex-1 overflow-y-auto p-3"></div>
        </div>
    </body>
</html>

<script src="scripts/index-scripts.js"></script>