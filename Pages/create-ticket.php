<?php
    session_start();
?>

<div class="flex flex-col items-start justify-start w-full h-full gap-6">
    <div class="flex flex-col items-start justify-start w-full h-auto gap-1">
        <h1 class="text-2xl font-bold text-zinc-800 tracking-wide">Create Ticket</h1>
        <p class="text-xs text-zinc-400 font-medium">Submit and manage your work-related concerns</p>
    </div>
    <div class="flex flex-col items-center justify-start flex-1 w-full rounded-2xl p-1 overflow-y-auto">
        <form id="ticket-form" data-submitter="<?= $_SESSION['user_information']['FirstName'] . ' ' . substr($_SESSION['user_information']['MiddleName'], 0, 1) . '. ' . $_SESSION['user_information']['LastName'] ?>" data-created-by="<?= $_SESSION['user_information']['EmployeeID'] ?? '' ?>" class="flex flex-col w-full h-auto bg-white py-5 gap-5 rounded-xl border-2 border-zinc-300">

            <!-- Header -->
            <div class="flex flex-row items-center justify-between w-full h-auto gap-2 px-7">
                <div class="flex flex-row items-center justify-start w-auto h-auto gap-3">
                    <div class="flex items-center justify-center w-10 h-10 bg-indigo-500/10 border border-indigo-300 rounded-lg">
                        <i class="fa-solid fa-file-lines text-indigo-400 text-lg"></i>
                    </div>
                    <div class="flex flex-col items-start justify-between w-auto h-full">
                        <h2 class="text-md font-medium text-zinc-800 whitespace-nowrap">Create your ticket</h2>
                        <p class="text-xs text-zinc-400 font-medium">Complete all required fields before submitting</p>
                    </div>
                </div>
                <div class="flex flex-row items-center justify-end h-full w-auto">
                    <p class="text-xs text-zinc-400 font-medium">Fields marked <span class="text-red-500">*</span> are required</p>
                </div>
            </div>

            <hr class="w-full border-zinc-300" />

            <!-- Ticket Meta: Posted by / Date / Status -->
            <div class="flex flex-row flex-wrap items-center gap-4 px-7">

                <!-- Posted by -->
                <div class="flex flex-row items-center gap-2">
                    <div class="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500 text-white text-xs font-bold select-none overflow-hidden border border-indigo-500">
                        <?php $empID = $_SESSION['user_information']['EmployeeID'] ?>
                        <img src="http://10.2.0.8/lrnph/emp_photos/<?= $empID ?>.jpg" alt="">
                    </div>
                    <div class="flex flex-col items-start gap-0.5">
                        <p class="text-xs text-zinc-400 font-medium leading-none">Posted by</p>
                        <p class="text-xs font-semibold text-zinc-700 leading-none"><?php echo $_SESSION['user_information']['FirstName'] . ' ' . $_SESSION['user_information']['LastName']; ?></p>
                    </div>
                </div>

                <div class="w-px h-7 bg-zinc-300"></div>

                <!-- Date Posted -->
                <div class="flex flex-row items-start gap-1.5">
                    <i class="fa-regular fa-calendar text-zinc-400 text-xs"></i>
                    <div class="flex flex-col items-start gap-0.5">
                        <p class="text-xs text-zinc-400 font-medium leading-none">Date Posted</p>
                        <p class="text-xs font-semibold text-zinc-700 leading-none"><?php echo date('F j, Y'); ?></p>
                    </div>
                </div>

                <div class="w-px h-7 bg-zinc-300"></div>

                <!-- Status -->
                <div class="flex flex-row items-start gap-1.5">
                    <i class="fa-solid fa-circle-dot text-zinc-400 text-xs"></i>
                    <div class="flex flex-col items-start gap-0.5">
                        <p class="text-xs text-zinc-400 font-medium leading-none">Status</p>
                        <span class="text-xs font-semibold text-zinc-500 bg-zinc-200 px-3 py-1 rounded-full">Waiting</span>
                    </div>
                </div>


                <!-- Ticket ID -->
                <div class="ml-auto flex items-center gap-1.5 bg-zinc-100 border border-zinc-200 rounded-lg px-3 py-1.5">
                    <i class="fa-solid fa-hashtag text-zinc-400 text-xs"></i>
                    <span class="text-xs font-medium text-zinc-500 font-mono" id="ticket-id"></span>
                </div>
            </div>

            <hr class="w-full border-zinc-300" />

            <!-- Ticket Details Fields -->
            <div class="flex flex-col w-full px-7 gap-4">
                <div class="flex flex-row items-center justify-start w-full h-auto gap-2">
                    <p class="text-xs font-bold text-zinc-500 tracking-wide">TICKET DETAILS</p>
                    <hr class="h-0 flex-1 border-zinc-300" />
                </div>

                <!-- Row 1: Customer / Email Title -->
                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1">
                        <label class="text-xs font-bold text-zinc-400 tracking-wide">Customer <span class="text-red-500">*</span></label>
                        <input type="text" id="field-customer" name="customer" placeholder="Enter customer name"
                            class="text-xs font-medium text-zinc-600 bg-transparent border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 transition-all placeholder:text-zinc-300" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-xs font-bold text-zinc-400 tracking-wide">Email Title <span class="text-red-500">*</span></label>
                        <input type="text" id="field-email-title" name="email_title" placeholder="Enter email subject"
                            class="text-xs font-medium text-zinc-600 bg-transparent border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 transition-all placeholder:text-zinc-300" />
                    </div>
                </div>

                <!-- Row 2: Sales In Charge / Classification -->
                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1 relative">
                        <label class="text-xs font-bold text-zinc-400 tracking-wide">Sales In Charge <span class="text-red-500">*</span></label>
                        <input type="hidden" id="field-sales-in-charge" name="sales_in_charge" />
                        <div class="relative">
                            <i class="fa-solid fa-magnifying-glass text-zinc-300 text-xs absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                            <input type="text" id="sales-search-input" placeholder="Search sales employee…" autocomplete="off"
                                class="w-full text-xs font-medium text-zinc-600 bg-transparent border border-zinc-200 rounded-lg pl-8 pr-8 py-2 outline-none focus:border-indigo-400 transition-all placeholder:text-zinc-300" />
                            <button type="button" id="sales-clear-btn" class="hidden absolute right-2 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-500 transition-colors cursor-pointer">
                                <i class="fa-solid fa-xmark text-xs"></i>
                            </button>
                        </div>
                        <!-- Dropdown results -->
                        <div id="sales-dropdown" class="hidden absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        </div>
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-xs font-bold text-zinc-400 tracking-wide">Classification <span class="text-red-500">*</span></label>
                        <div class="relative flex items-center">
                            <select id="ticket-status" name="urgent"
                                class="w-full text-xs font-medium text-zinc-600 bg-transparent border border-zinc-200 rounded-lg pl-3 pr-8 py-2 outline-none appearance-none cursor-pointer focus:border-indigo-400 transition-all">
                                <option value=0>Non-Urgent (Acknowledge within 48 hours)</option>
                                <option value=1>Urgent (Acknowledge within 24 hours)</option>
                            </select>
                            <i class="fa-solid fa-chevron-down text-[9px] text-zinc-400 absolute right-3 pointer-events-none"></i>
                        </div>
                    </div>
                </div>

                <!-- Row 3: Date & Time of Email / Deadline -->
                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1">
                        <label class="text-xs font-bold text-zinc-400 tracking-wide">Date & Time of Email <span class="text-red-500">*</span></label>
                        <input type="text" id="field-email-datetime" name="date_and_time_of_email" placeholder="Select date and time"
                            class="text-xs font-medium text-zinc-600 bg-transparent border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 transition-all" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-xs font-bold text-zinc-400 tracking-wide">Deadline <span class="text-red-500">*</span></label>
                        <input type="text" id="field-deadline" name="deadline" placeholder="Select deadline"
                            class="text-xs font-medium text-zinc-600 bg-transparent border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 transition-all" />
                    </div>
                </div>
            </div>

            <hr class="w-full border-zinc-300" />
            <div class="flex flex-col items-start justify-start w-full h-auto px-7 gap-3">
                <div class="flex flex-row items-center justify-start w-full h-auto gap-2">
                    <p class="text-xs font-bold text-zinc-500 tracking-wide">EMAIL SECTIONS</p>
                    <hr class="h-0 flex-1 border-zinc-300" />
                    <button type="button" id="add-section-btn" class="flex flex-row items-center gap-1.5 text-xs font-medium text-indigo-600 border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 rounded-md px-3 py-1.5 transition-all cursor-pointer whitespace-nowrap">
                        <i class="fa-solid fa-plus text-xs"></i> Add Section
                    </button>
                </div>

                <!-- Empty state -->
                <div id="sections-empty" class="flex flex-col items-center justify-center w-full py-8 border-2 border-dashed border-zinc-200 rounded-xl bg-zinc-50 gap-2">
                    <div class="flex items-center justify-center w-9 h-9 bg-zinc-200 rounded-lg">
                        <i class="fa-regular fa-envelope text-zinc-400 text-base"></i>
                    </div>
                    <p class="text-xs font-semibold text-zinc-500">No sections added yet</p>
                    <p class="text-xs text-zinc-400 font-medium">Click <span class="text-indigo-500 font-semibold">Add Section</span> to attach an email body and files</p>
                </div>

                <!-- Sections container -->
                <div id="sections-container" class="flex flex-col w-full gap-4"></div>
            </div>

            <hr class="w-full border-zinc-300" />

            <!-- Footer -->
            <div class="flex flex-row items-center justify-between w-full h-auto px-7 pb-2">
                <p class="text-xs text-zinc-400 font-medium">This request will be sent to your immediate supervisor for review.</p>
                <div class="flex flex-row gap-2">
                    <button type="button" onclick="clearAll()" class="text-xs font-medium text-zinc-500 border border-zinc-300 rounded-md px-4 py-2 hover:bg-zinc-100 transition-all cursor-pointer">Clear</button>
                    <button type="submit" id="submit-ticket-btn" class="text-xs font-medium text-white bg-indigo-500 rounded-md px-4 py-2 hover:bg-indigo-600 transition-all cursor-pointer">Submit Ticket</button>
                </div>
            </div>

        </form>
    </div>
</div>

<script src="./scripts/create-ticket-scripts.js"></script>