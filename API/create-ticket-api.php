<?php
    session_start();
    header('Content-Type: application/json');
    error_reporting(E_ALL);
    ini_set('display_errors', 0);

    function loadDependencies() {
        require_once __DIR__ . '/../Connections/conn.php';
        return $conn;
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Invalid Request Method']);
        exit;
    }

    try {
        $conn = loadDependencies();

        // ── Collect inputs ──────────────────────────────────────────
        $ticketId           = $_POST['ticket_id']              ?? '';
        $urgent             = $_POST['urgent']                 ?? 0;
        $submitter          = $_POST['submitter']              ?? '';
        $createdBy          = $_POST['created_by']             ?? '';
        $customer           = $_POST['customer']               ?? '';
        $emailTitle         = $_POST['email_title']            ?? '';
        $salesInCharge      = $_POST['sales_in_charge']        ?? '';
        $dateTimeOfEmailRaw = $_POST['date_and_time_of_email'] ?? '';
        $deadlineRaw        = $_POST['deadline']               ?? '';
        $remarks            = $_POST['remarks']                ?? '';

        // Convert datetime-local format (2026-05-08T14:43) to SQL Server format
        $dateTimeOfEmail = !empty($dateTimeOfEmailRaw) ? date('Y-m-d H:i:s', strtotime($dateTimeOfEmailRaw)) : null;
        $deadline        = !empty($deadlineRaw)        ? date('Y-m-d H:i:s', strtotime($deadlineRaw))        : null;

        // timely_response is NULL at creation; calculated when status moves to 'in_progress'
        $timelyResponse = null;

        // Sections come as JSON-encoded array: [{sub_title, body}, ...]
        $sectionsRaw = $_POST['sections'] ?? '[]';
        $sections    = json_decode($sectionsRaw, true);

        // ── Validate ────────────────────────────────────────────────
        if ($ticketId === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Ticket ID is required']);
            exit;
        }

        if (!is_array($sections) || count($sections) === 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'At least one section is required']);
            exit;
        }

        foreach ($sections as $i => $sec) {
            if (empty(trim($sec['body'] ?? ''))) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Section ' . ($i + 1) . ' email body is required']);
                exit;
            }
        }

        // ── Begin transaction ───────────────────────────────────────
        $conn->beginTransaction();

        // 1. Insert into acts_ticket (title = ticket ID string)
        $stmt = $conn->prepare("
            INSERT INTO [LRNPH_OJT].[dbo].[acts_ticket]
                (title, status, urgent, submitter, created_by, customer, email_title, sales_in_charge, date_and_time_of_email, deadline, remarks)
            VALUES (?, 'waiting', ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $ticketId, $urgent, $submitter, $createdBy,
            $customer, $emailTitle, $salesInCharge,
            $dateTimeOfEmail ?: null, $deadline ?: null, $remarks
        ]);

        // Get the auto-generated parent ID
        $parentId = $conn->lastInsertId();

        // 2. Insert each section
        foreach ($sections as $i => $sec) {
            $subTitle = $sec['sub_title'] ?? ('Section ' . ($i + 1));
            $body     = $sec['body']      ?? '';

            $stmt = $conn->prepare("
                INSERT INTO [LRNPH_OJT].[dbo].[acts_ticket_section] (ticket_id, sub_title, body)
                VALUES (?, ?, ?)
            ");
            $stmt->execute([$parentId, $subTitle, $body]);

            $sectionId = $conn->lastInsertId();

            // 3. Handle images for this section
            //    Files arrive as: attachments_section_0[], attachments_section_1[], ...
            $fileKey = 'attachments_section_' . $i;

            if (isset($_FILES[$fileKey])) {
                $files = $_FILES[$fileKey];
                $fileCount = is_array($files['name']) ? count($files['name']) : 0;

                // Create uploads directory if needed
                $uploadDir = __DIR__ . '/../Uploads/tickets/' . $parentId . '/';
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0777, true);
                }

                for ($j = 0; $j < $fileCount; $j++) {
                    if ($files['error'][$j] !== UPLOAD_ERR_OK) continue;

                    $originalName = basename($files['name'][$j]);
                    $ext          = pathinfo($originalName, PATHINFO_EXTENSION);
                    $safeName     = uniqid('img_') . '.' . $ext;
                    $destination  = $uploadDir . $safeName;

                    if (!move_uploaded_file($files['tmp_name'][$j], $destination)) {
                        throw new Exception('Failed to upload file: ' . $originalName);
                    }

                    // Store relative path in DB
                    $relativePath = 'Uploads/tickets/' . $parentId . '/' . $safeName;

                    $stmt = $conn->prepare("
                        INSERT INTO [LRNPH_OJT].[dbo].[acts_ticket_section_images] (ticket_section_id, image)
                        VALUES (?, ?)
                    ");
                    $stmt->execute([$sectionId, $relativePath]);
                }
            }
        }

        $conn->commit();

        http_response_code(200);
        echo json_encode([
            'success'   => true,
            'message'   => 'Ticket created successfully',
            'ticket_id' => $ticketId,
            'id'        => $parentId
        ]);

    } catch (Exception $e) {
        if (isset($conn) && $conn->inTransaction()) {
            $conn->rollBack();
        }
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
