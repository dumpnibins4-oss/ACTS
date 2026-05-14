<?php
    session_start();
    header('Content-Type: application/json');
    error_reporting(E_ALL);
    ini_set('display_errors', 0);

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Invalid Request Method']);
        exit;
    }

    try {
        require_once __DIR__ . '/../Connections/conn.php';

        // ── Collect inputs ──────────────────────────────────────────
        $ticketId           = $_POST['ticket_id']              ?? '';
        $customer           = $_POST['customer']               ?? '';
        $emailTitle         = $_POST['email_title']            ?? '';
        $salesInCharge      = $_POST['sales_in_charge']        ?? '';
        $dateTimeOfEmailRaw = $_POST['date_and_time_of_email'] ?? '';
        $deadlineRaw        = $_POST['deadline']               ?? '';
        $urgent             = $_POST['urgent']                 ?? 0;

        // Convert datetime-local format to SQL Server format
        $dateTimeOfEmail = !empty($dateTimeOfEmailRaw) ? date('Y-m-d H:i:s', strtotime($dateTimeOfEmailRaw)) : null;
        $deadline        = !empty($deadlineRaw)        ? date('Y-m-d H:i:s', strtotime($deadlineRaw))        : null;

        // Sections come as JSON-encoded array: [{sub_title, body}, ...]
        $sectionsRaw = $_POST['sections'] ?? '[]';
        $sections    = json_decode($sectionsRaw, true);

        // ── Validate ────────────────────────────────────────────────
        if ($ticketId === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Ticket ID is required']);
            exit;
        }

        // ── Verify ticket exists and status is 'waiting' ────────────
        $stmt = $conn->prepare("SELECT id, status FROM [LRNPH_QA].[dbo].[acts_ticket] WHERE id = ?");
        $stmt->execute([$ticketId]);
        $ticket = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$ticket) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Ticket not found']);
            exit;
        }

        if ($ticket['status'] !== 'waiting') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Ticket can only be edited while status is Waiting']);
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

        $now       = date('Y-m-d H:i:s');
        $updatedBy = $_SESSION['user_information']['EmployeeID'] ?? '';

        // 1. Update main ticket record
        $stmt = $conn->prepare("
            UPDATE [LRNPH_QA].[dbo].[acts_ticket]
            SET customer = ?, email_title = ?, sales_in_charge = ?,
                date_and_time_of_email = ?, deadline = ?,
                urgent = ?, updated_at = ?, updated_by = ?
            WHERE id = ?
        ");
        $stmt->execute([
            $customer, $emailTitle, $salesInCharge,
            $dateTimeOfEmail, $deadline,
            $urgent, $now, $updatedBy, $ticketId
        ]);

        // 2. Collect all kept image IDs across sections
        $allKeptImageIds = [];
        foreach ($sections as $sec) {
            $kept = $sec['kept_image_ids'] ?? [];
            foreach ($kept as $kid) {
                $allKeptImageIds[] = intval($kid);
            }
        }

        // Get existing section IDs
        $stmtSec = $conn->prepare("SELECT id FROM [LRNPH_QA].[dbo].[acts_ticket_section] WHERE ticket_id = ?");
        $stmtSec->execute([$ticketId]);
        $oldSections = $stmtSec->fetchAll(PDO::FETCH_COLUMN);

        if (count($oldSections) > 0) {
            $placeholders = implode(',', array_fill(0, count($oldSections), '?'));

            // Delete only images that are NOT in the kept list
            if (count($allKeptImageIds) > 0) {
                $keptPlaceholders = implode(',', array_fill(0, count($allKeptImageIds), '?'));
                $conn->prepare("DELETE FROM [LRNPH_QA].[dbo].[acts_ticket_section_images] WHERE ticket_section_id IN ($placeholders) AND id NOT IN ($keptPlaceholders)")
                     ->execute(array_merge($oldSections, $allKeptImageIds));
            } else {
                // No images kept — delete all
                $conn->prepare("DELETE FROM [LRNPH_QA].[dbo].[acts_ticket_section_images] WHERE ticket_section_id IN ($placeholders)")
                     ->execute($oldSections);
            }

            // Delete old sections
            $conn->prepare("DELETE FROM [LRNPH_QA].[dbo].[acts_ticket_section] WHERE ticket_id = ?")
                 ->execute([$ticketId]);
        }

        // 3. Insert updated sections and re-associate kept images
        foreach ($sections as $i => $sec) {
            $subTitle = $sec['sub_title'] ?? ('Section ' . ($i + 1));
            $body     = $sec['body']      ?? '';
            $keptIds  = $sec['kept_image_ids'] ?? [];

            $stmt = $conn->prepare("
                INSERT INTO [LRNPH_QA].[dbo].[acts_ticket_section] (ticket_id, sub_title, body)
                VALUES (?, ?, ?)
            ");
            $stmt->execute([$ticketId, $subTitle, $body]);

            $sectionId = $conn->lastInsertId();

            // Re-associate kept images to the new section ID
            if (count($keptIds) > 0) {
                $keptPlaceholders = implode(',', array_fill(0, count($keptIds), '?'));
                $conn->prepare("UPDATE [LRNPH_QA].[dbo].[acts_ticket_section_images] SET ticket_section_id = ? WHERE id IN ($keptPlaceholders)")
                     ->execute(array_merge([$sectionId], array_map('intval', $keptIds)));
            }

            // Handle new file uploads for this section
            $fileKey = 'attachments_section_' . $i;

            if (isset($_FILES[$fileKey])) {
                $files = $_FILES[$fileKey];
                $fileCount = is_array($files['name']) ? count($files['name']) : 0;

                $uploadDir = __DIR__ . '/../Uploads/tickets/' . $ticketId . '/';
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

                    $relativePath = 'Uploads/tickets/' . $ticketId . '/' . $safeName;

                    $stmt = $conn->prepare("
                        INSERT INTO [LRNPH_QA].[dbo].[acts_ticket_section_images] (ticket_section_id, image)
                        VALUES (?, ?)
                    ");
                    $stmt->execute([$sectionId, $relativePath]);
                }
            }
        }

        // ── Log: edit ───────────────────────────────────────────────
        $conn->prepare("
            INSERT INTO [LRNPH_QA].[dbo].[acts_ticket_logs]
                (ticket_id, changed_by, action, title, status, urgent, submitter, customer, email_title, sales_in_charge, date_and_time_of_email, timely_response, deadline, completed_at, completed_by)
            SELECT id, ?, 'edit', title, status, urgent, submitter, customer, email_title, sales_in_charge, date_and_time_of_email, timely_response, deadline, completed_at, completed_by
            FROM [LRNPH_QA].[dbo].[acts_ticket] WHERE id = ?
        ")->execute([$updatedBy, $ticketId]);

        // ── Log: section_update ─────────────────────────────────────
        $conn->prepare("
            INSERT INTO [LRNPH_QA].[dbo].[acts_ticket_logs]
                (ticket_id, changed_by, action, title, status, urgent, submitter, customer, email_title, sales_in_charge, date_and_time_of_email, timely_response, deadline, completed_at, completed_by)
            SELECT id, ?, 'section_update', title, status, urgent, submitter, customer, email_title, sales_in_charge, date_and_time_of_email, timely_response, deadline, completed_at, completed_by
            FROM [LRNPH_QA].[dbo].[acts_ticket] WHERE id = ?
        ")->execute([$updatedBy, $ticketId]);

        $conn->commit();

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Ticket updated successfully'
        ]);

    } catch (Exception $e) {
        if (isset($conn) && $conn->inTransaction()) {
            $conn->rollBack();
        }
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
