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

        if (!$ticketId || !$newStatus) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ticket_id and new_status are required']);
            exit;
        }

        // ── Validate transition ────────────────────────────────────
        $validTransitions = [
            'waiting'     => 'in_progress',
            'in_progress' => 'completed',
            'completed'   => 'enroute',
        ];

        // Fetch current status
        $stmt = $conn->prepare("SELECT status, urgent, date_and_time_of_email FROM [LRNPH_OJT].[dbo].[acts_ticket] WHERE id = ?");
        $stmt->execute([$ticketId]);
        $ticket = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$ticket) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Ticket not found']);
            exit;
        }

        $currentStatus = $ticket['status'];

        if (!isset($validTransitions[$currentStatus]) || $validTransitions[$currentStatus] !== $newStatus) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => "Cannot transition from '$currentStatus' to '$newStatus'"
            ]);
            exit;
        }

        // ── Build update query ─────────────────────────────────────
        $now = date('Y-m-d H:i:s');
        $updates = [
            'status'     => $newStatus,
            'updated_at' => $now,
            'updated_by' => $updatedBy,
        ];

        $timelyResponse = null;

        // When moving to in_progress: auto-calculate timely_response
        if ($newStatus === 'in_progress') {
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
        }

        // When moving to completed: set completed_at/completed_by
        if ($newStatus === 'completed') {
            $updates['completed_at'] = $now;
            $updates['completed_by'] = $updatedBy;
        }

        // When moving to enroute: save remarks
        if ($newStatus === 'enroute') {
            $remarks = $_POST['remarks'] ?? '';
            if (!empty(trim($remarks))) {
                $updates['remarks'] = trim($remarks);
            }
        }

        // ── Execute update ─────────────────────────────────────────
        $setClauses = [];
        $params     = [];
        foreach ($updates as $col => $val) {
            $setClauses[] = "$col = ?";
            $params[]     = $val;
        }
        $params[] = $ticketId;

        $sql = "UPDATE [LRNPH_OJT].[dbo].[acts_ticket] SET " . implode(', ', $setClauses) . " WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);

        // ── Log: status ─────────────────────────────────────────────
        $conn->prepare("
            INSERT INTO [LRNPH_OJT].[dbo].[acts_ticket_logs]
                (ticket_id, changed_by, action, title, status, urgent, submitter, customer, email_title, sales_in_charge, date_and_time_of_email, timely_response, deadline, remarks, completed_at, completed_by)
            SELECT id, ?, 'status', title, status, urgent, submitter, customer, email_title, sales_in_charge, date_and_time_of_email, timely_response, deadline, remarks, completed_at, completed_by
            FROM [LRNPH_OJT].[dbo].[acts_ticket] WHERE id = ?
        ")->execute([$updatedBy, $ticketId]);

        http_response_code(200);
        echo json_encode([
            'success'          => true,
            'message'          => "Status updated to '$newStatus'",
            'new_status'       => $newStatus,
            'timely_response'  => $timelyResponse,
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
