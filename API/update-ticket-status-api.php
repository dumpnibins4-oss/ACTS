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

        $ticketId  = $_POST['ticket_id']  ?? '';   // DB id (int)
        $newStatus = $_POST['new_status'] ?? '';
        $updatedBy = $_POST['updated_by'] ?? $_SESSION['user_information']['EmployeeID'] ?? '';
        $remarks   = $_POST['remarks']    ?? '';
        $signatureReq = $_POST['signature_requirement'] ?? null;

        if (!$ticketId || !$newStatus) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ticket_id and new_status are required']);
            exit;
        }

        // ── Validate transition ────────────────────────────────────
        // Main flow: waiting → in_progress → completed → enroute
        // Optional: in_progress → pending → in_progress (hold/resume)
        $validTransitions = [
            'waiting'     => ['in_progress'],
            'in_progress' => ['completed', 'pending', 'enroute'],
            'pending'     => ['in_progress'],
            'enroute'     => ['completed'],
        ];

        // Fetch current status
        $stmt = $conn->prepare("SELECT status, urgent, date_and_time_of_email, signature_requirement FROM [LRNPH_QA].[dbo].[acts_ticket] WHERE id = ?");
        $stmt->execute([$ticketId]);
        $ticket = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$ticket) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Ticket not found']);
            exit;
        }

        $currentStatus = $ticket['status'];

        if (!isset($validTransitions[$currentStatus]) || !in_array($newStatus, $validTransitions[$currentStatus])) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => "Cannot transition from '$currentStatus' to '$newStatus'"
            ]);
            exit;
        }

        // Enforce signature requirement paths from in_progress
        if ($currentStatus === 'in_progress') {
            $reqSig = intval($ticket['signature_requirement']) === 1;
            if ($newStatus === 'enroute' && !$reqSig) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'This ticket does not require signature']);
                exit;
            }
            if ($newStatus === 'completed' && $reqSig) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'This ticket requires a signature (must be enrouted first)']);
                exit;
            }
        }

        // ── Remarks are required for every status change ──────────
        if (empty(trim($remarks))) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Remarks are required for status changes']);
            exit;
        }

        // ── Begin transaction ─────────────────────────────────────
        $conn->beginTransaction();

        // ── Build update query ─────────────────────────────────────
        $now = date('Y-m-d H:i:s');
        $updates = [
            'status'     => $newStatus,
            'updated_at' => $now,
            'updated_by' => $updatedBy,
        ];

        $timelyResponse = null;

        // When moving to in_progress from waiting: auto-calculate timely_response + save signature_requirement
        if ($newStatus === 'in_progress' && $currentStatus === 'waiting') {
            $timelyResponse = 1; // default timely
            $emailDT = $ticket['date_and_time_of_email'];

            if (!empty($emailDT)) {
                $emailDate = new DateTime($emailDT);
                $nowDate   = new DateTime();
                $diffHours = ($nowDate->getTimestamp() - $emailDate->getTimestamp()) / 3600;
                $threshold = intval($ticket['urgent']) === 1 ? 24 : 48;
                $timelyResponse = $diffHours <= $threshold ? 1 : 0;
            }

            $updates['timely_response'] = $timelyResponse;

            // Save signature requirement choice
            if ($signatureReq !== null) {
                $updates['signature_requirement'] = intval($signatureReq) ? 1 : 0;
            }
        }

        // When moving to completed: set completed_at/completed_by
        if ($newStatus === 'completed') {
            $updates['completed_at'] = $now;
            $updates['completed_by'] = $updatedBy;
        }

        // ── Execute ticket update ─────────────────────────────────
        $setClauses = [];
        $params     = [];
        foreach ($updates as $col => $val) {
            $setClauses[] = "$col = ?";
            $params[]     = $val;
        }
        $params[] = $ticketId;

        $sql = "UPDATE [LRNPH_QA].[dbo].[acts_ticket] SET " . implode(', ', $setClauses) . " WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);

        // ── Save remark to acts_remarks ───────────────────────────
        $remarkType = ($newStatus === 'pending') ? 'pending' : 'status_change';

        $stmtRemark = $conn->prepare("
            INSERT INTO [LRNPH_QA].[dbo].[acts_remarks] (ticket_id, remark_type, remark_body, created_by)
            VALUES (?, ?, ?, ?)
        ");
        $stmtRemark->execute([$ticketId, $remarkType, trim($remarks), $updatedBy]);

        $remarkId = $conn->lastInsertId();

        // ── Handle remark attachments ─────────────────────────────
        if (isset($_FILES['remark_attachments'])) {
            $files = $_FILES['remark_attachments'];
            $fileCount = is_array($files['name']) ? count($files['name']) : 0;

            $uploadDir = __DIR__ . '/../Uploads/remarks/' . $ticketId . '/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }

            for ($j = 0; $j < $fileCount; $j++) {
                if ($files['error'][$j] !== UPLOAD_ERR_OK) continue;

                $originalName = basename($files['name'][$j]);
                $ext          = pathinfo($originalName, PATHINFO_EXTENSION);
                $safeName     = uniqid('remark_') . '.' . $ext;
                $destination  = $uploadDir . $safeName;

                if (!move_uploaded_file($files['tmp_name'][$j], $destination)) {
                    throw new Exception('Failed to upload file: ' . $originalName);
                }

                $relativePath = 'Uploads/remarks/' . $ticketId . '/' . $safeName;

                $conn->prepare("
                    INSERT INTO [LRNPH_QA].[dbo].[acts_remarks_attachments] (remark_id, image_path)
                    VALUES (?, ?)
                ")->execute([$remarkId, $relativePath]);
            }
        }

        // ── Log: status ─────────────────────────────────────────────
        $conn->prepare("
            INSERT INTO [LRNPH_QA].[dbo].[acts_ticket_logs]
                (ticket_id, changed_by, action, title, status, urgent, submitter, customer, email_title, sales_in_charge, date_and_time_of_email, timely_response, deadline, completed_at, completed_by)
            SELECT id, ?, 'status', title, status, urgent, submitter, customer, email_title, sales_in_charge, date_and_time_of_email, timely_response, deadline, completed_at, completed_by
            FROM [LRNPH_QA].[dbo].[acts_ticket] WHERE id = ?
        ")->execute([$updatedBy, $ticketId]);

        $conn->commit();

        http_response_code(200);

        $message = match($newStatus) {
            'in_progress' => 'Ticket marked as Ongoing',
            'pending'     => 'Ticket marked as Pending',
            'completed'   => 'Ticket marked as Done',
            'enroute'     => 'Ticket marked as Enroute for Signature',
            default       => 'Ticket marked as Waiting',
        };

        echo json_encode([
            'success'         => true,
            'message'         => $message,
            'new_status'      => $newStatus,
            'timely_response' => $timelyResponse,
        ]);

    } catch (Exception $e) {
        if (isset($conn) && $conn->inTransaction()) {
            $conn->rollBack();
        }
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
