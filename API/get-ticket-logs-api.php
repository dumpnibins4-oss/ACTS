<?php
    session_start();
    header('Content-Type: application/json');
    error_reporting(E_ALL);
    ini_set('display_errors', 0);

    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Invalid Request Method']);
        exit;
    }

    try {
        require_once __DIR__ . '/../Connections/conn.php';

        $ticketId = $_GET['ticket_id'] ?? '';

        if ($ticketId === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ticket_id is required']);
            exit;
        }

        $stmt = $conn->prepare("
            SELECT id, ticket_id, changed_at, changed_by, action,
                   title, status, urgent, submitter, customer, email_title,
                   sales_in_charge, date_and_time_of_email, timely_response,
                   deadline, completed_at, completed_by
            FROM [LRNPH_QA].[dbo].[acts_ticket_logs]
            WHERE ticket_id = ?
            ORDER BY changed_at DESC
        ");
        $stmt->execute([$ticketId]);
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Resolve changed_by employee names
        foreach ($logs as &$log) {
            if (!empty($log['changed_by'])) {
                $empStmt = $conn->prepare("
                    SELECT FirstName, MiddleName, LastName
                    FROM [LRNPH_E].[DBO].[lrn_master_list]
                    WHERE EmployeeID = ?
                ");
                $empStmt->execute([$log['changed_by']]);
                $emp = $empStmt->fetch(PDO::FETCH_ASSOC);
                if ($emp) {
                    $mi = $emp['MiddleName'] ? substr($emp['MiddleName'], 0, 1) . '.' : '';
                    $log['changed_by_name'] = trim($emp['FirstName'] . ' ' . $mi . ' ' . $emp['LastName']);
                } else {
                    $log['changed_by_name'] = $log['changed_by'];
                }
            } else {
                $log['changed_by_name'] = '—';
            }

            // For status/reschedule/section_update actions, fetch the associated remark
            if (in_array($log['action'], ['status', 'reschedule', 'section_update'])) {
                // Find the remark closest in time to this log entry
                $remarkStmt = $conn->prepare("
                    SELECT TOP 1 r.id, r.remark_type, r.remark_body, r.created_at, r.created_by
                    FROM [LRNPH_QA].[dbo].[acts_remarks] r
                    WHERE r.ticket_id = ?
                      AND r.created_at <= DATEADD(SECOND, 5, ?)
                      AND r.created_at >= DATEADD(SECOND, -5, ?)
                    ORDER BY ABS(DATEDIFF(SECOND, r.created_at, ?)) ASC
                ");
                $remarkStmt->execute([$ticketId, $log['changed_at'], $log['changed_at'], $log['changed_at']]);
                $remark = $remarkStmt->fetch(PDO::FETCH_ASSOC);

                if ($remark) {
                    $log['remark'] = $remark;

                    // Fetch remark attachments
                    $attStmt = $conn->prepare("
                        SELECT id, image_path
                        FROM [LRNPH_QA].[dbo].[acts_remarks_attachments]
                        WHERE remark_id = ?
                        ORDER BY id ASC
                    ");
                    $attStmt->execute([$remark['id']]);
                    $log['remark']['attachments'] = $attStmt->fetchAll(PDO::FETCH_ASSOC);
                } else {
                    $log['remark'] = null;
                }
            } else {
                $log['remark'] = null;
            }
        }

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data'    => $logs,
            'count'   => count($logs)
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
