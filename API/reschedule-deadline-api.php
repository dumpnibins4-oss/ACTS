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

        $ticketId    = $_POST['ticket_id']    ?? '';
        $newDeadline = $_POST['new_deadline'] ?? '';
        $reason      = $_POST['reason']       ?? '';
        $updatedBy   = $_POST['updated_by']   ?? $_SESSION['user_information']['EmployeeID'] ?? '';

        // ── Validate inputs ───────────────────────────────────────
        if (!$ticketId || !$newDeadline) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ticket_id and new_deadline are required']);
            exit;
        }

        if (empty(trim($reason))) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'A reason is required for rescheduling']);
            exit;
        }

        // ── Verify ticket exists and status allows rescheduling ───
        $stmt = $conn->prepare("SELECT id, status, deadline FROM [LRNPH_OJT].[dbo].[acts_ticket] WHERE id = ?");
        $stmt->execute([$ticketId]);
        $ticket = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$ticket) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Ticket not found']);
            exit;
        }

        $allowedStatuses = ['waiting', 'pending', 'in_progress'];
        if (!in_array($ticket['status'], $allowedStatuses)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => "Cannot reschedule deadline when status is '{$ticket['status']}'. Allowed: " . implode(', ', $allowedStatuses)
            ]);
            exit;
        }

        // ── Validate file attachments ─────────────────────────────
        if (!isset($_FILES['reschedule_attachments']) || empty($_FILES['reschedule_attachments']['name'][0])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'At least one attachment is required for rescheduling']);
            exit;
        }

        // ── Convert deadline format ───────────────────────────────
        $deadlineFormatted = date('Y-m-d H:i:s', strtotime($newDeadline));
        if (!$deadlineFormatted || $deadlineFormatted === '1970-01-01 00:00:00') {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid deadline format']);
            exit;
        }

        // ── Begin transaction ─────────────────────────────────────
        $conn->beginTransaction();

        $now = date('Y-m-d H:i:s');

        // 1. Update deadline on the ticket
        $conn->prepare("
            UPDATE [LRNPH_OJT].[dbo].[acts_ticket]
            SET deadline = ?, updated_at = ?, updated_by = ?
            WHERE id = ?
        ")->execute([$deadlineFormatted, $now, $updatedBy, $ticketId]);

        // 2. Save remark to acts_remarks
        $stmtRemark = $conn->prepare("
            INSERT INTO [LRNPH_OJT].[dbo].[acts_remarks] (ticket_id, remark_type, remark_body, created_by)
            VALUES (?, 'reschedule', ?, ?)
        ");
        $stmtRemark->execute([$ticketId, trim($reason), $updatedBy]);

        $remarkId = $conn->lastInsertId();

        // 3. Handle attachments
        $files = $_FILES['reschedule_attachments'];
        $fileCount = is_array($files['name']) ? count($files['name']) : 0;

        $uploadDir = __DIR__ . '/../Uploads/remarks/' . $ticketId . '/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        for ($j = 0; $j < $fileCount; $j++) {
            if ($files['error'][$j] !== UPLOAD_ERR_OK) continue;

            $originalName = basename($files['name'][$j]);
            $ext          = pathinfo($originalName, PATHINFO_EXTENSION);
            $safeName     = uniqid('resched_') . '.' . $ext;
            $destination  = $uploadDir . $safeName;

            if (!move_uploaded_file($files['tmp_name'][$j], $destination)) {
                throw new Exception('Failed to upload file: ' . $originalName);
            }

            $relativePath = 'Uploads/remarks/' . $ticketId . '/' . $safeName;

            $conn->prepare("
                INSERT INTO [LRNPH_OJT].[dbo].[acts_remarks_attachments] (remark_id, image_path)
                VALUES (?, ?)
            ")->execute([$remarkId, $relativePath]);
        }

        // 4. Log: reschedule
        $conn->prepare("
            INSERT INTO [LRNPH_OJT].[dbo].[acts_ticket_logs]
                (ticket_id, changed_by, action, title, status, urgent, submitter, customer, email_title, sales_in_charge, date_and_time_of_email, timely_response, deadline, completed_at, completed_by)
            SELECT id, ?, 'reschedule', title, status, urgent, submitter, customer, email_title, sales_in_charge, date_and_time_of_email, timely_response, deadline, completed_at, completed_by
            FROM [LRNPH_OJT].[dbo].[acts_ticket] WHERE id = ?
        ")->execute([$updatedBy, $ticketId]);

        $conn->commit();

        http_response_code(200);
        echo json_encode([
            'success'      => true,
            'message'      => 'Deadline rescheduled successfully',
            'new_deadline' => $deadlineFormatted,
        ]);

    } catch (Exception $e) {
        if (isset($conn) && $conn->inTransaction()) {
            $conn->rollBack();
        }
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
