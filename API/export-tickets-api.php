<?php
    session_start();
    error_reporting(E_ALL);
    ini_set('display_errors', 0);

    try {
        require_once __DIR__ . '/../Connections/conn.php';

        $filter   = $_GET['filter'] ?? 'all'; // 'all', 'history', 'active', etc.
        $status   = $_GET['status'] ?? '';
        $creator  = $_GET['creator'] ?? '';
        $dateFrom = $_GET['date_from'] ?? $_GET['from'] ?? '';
        $dateTo   = $_GET['date_to']   ?? $_GET['to']   ?? '';

        // ── Build query ─────────────────────────────────────────────
        $where  = [];
        $params = [];

        if ($filter === 'active') {
            $where[] = "t.status NOT IN ('completed', 'closed', 'enroute')";
        }

        if ($status !== '' && $status !== 'all') {
            $where[]  = "t.status = ?";
            $params[] = $status;
        } else if ($filter === 'enroute') {
            // legacy fallback
            $where[]  = "t.status = ?";
            $params[] = 'enroute';
        } else if ($filter === 'completed') {
            // legacy fallback
            $where[]  = "t.status = ?";
            $params[] = 'completed';
        }

        // We handle creator filter in memory below because creator name is derived from EmployeeID


        if ($dateFrom !== '') {
            $where[]  = "CAST(t.created_at AS DATE) >= ?";
            $params[] = $dateFrom;
        }
        if ($dateTo !== '') {
            $where[]  = "CAST(t.created_at AS DATE) <= ?";
            $params[] = $dateTo;
        }

        $whereSQL = count($where) > 0 ? 'WHERE ' . implode(' AND ', $where) : '';

        $sql = "
            SELECT
                t.id,
                t.title,
                t.customer,
                t.email_title,
                t.sales_in_charge,
                t.urgent,
                t.date_and_time_of_email,
                t.timely_response,
                t.submitter,
                t.deadline,
                t.completed_at,
                t.status,
                t.created_by
            FROM [LRNPH_QA].[dbo].[acts_ticket] t
            $whereSQL
            ORDER BY t.created_at DESC
        ";

        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $tickets = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // ── For each ticket, get 'acknowledged' date from logs ──────
        // (when status was changed to 'in_progress')
        $logStmt = $conn->prepare("
            SELECT TOP 1 changed_at
            FROM [LRNPH_QA].[dbo].[acts_ticket_logs]
            WHERE ticket_id = ? AND action = 'status' AND status = 'in_progress'
            ORDER BY changed_at ASC
        ");

        // ── Also resolve QA PIC name from created_by ────────────────
        $nameStmt = $conn->prepare("
            SELECT FirstName, LastName
            FROM [LRNPH_E].[DBO].[lrn_master_list]
            WHERE TRY_CAST(EmployeeID AS NVARCHAR(50)) = ?
        ");

        // ── Status labels ───────────────────────────────────────────
        $statusLabels = [
            'waiting'     => 'Waiting',
            'in_progress' => 'Ongoing',
            'pending'     => 'Pending',
            'completed'   => 'Done',
            'enroute'     => 'Enroute for Signature',
            'closed'      => 'Closed',
        ];

        // ── Remarks statement (Latest Status Remark) ────────────────
        $remarksStmt = $conn->prepare("
            SELECT TOP 1 r.remark_type, r.remark_body, r.created_at, m.FirstName, m.LastName
            FROM [LRNPH_QA].[dbo].[acts_remarks] r
            LEFT JOIN [LRNPH_E].[DBO].[lrn_master_list] m
                ON TRY_CAST(r.created_by AS NVARCHAR(50)) = TRY_CAST(m.EmployeeID AS NVARCHAR(50)) COLLATE SQL_Latin1_General_CP1_CI_AS
            WHERE r.ticket_id = ? AND r.remark_type IN ('status_change', 'pending')
            ORDER BY r.created_at DESC
        ");

        // ── Build rows ──────────────────────────────────────────────
        $rows = [];
        foreach ($tickets as $ticket) {
            // Get acknowledged date
            $logStmt->execute([$ticket['id']]);
            $logRow = $logStmt->fetch(PDO::FETCH_ASSOC);
            $acknowledgedAt = $logRow ? $logRow['changed_at'] : null;

            // Get QA PIC name
            $qaPic = $ticket['submitter'] ?? '';
            if (!empty($ticket['created_by'])) {
                $nameStmt->execute([$ticket['created_by']]);
                $nameRow = $nameStmt->fetch(PDO::FETCH_ASSOC);
                if ($nameRow) {
                    $qaPic = $nameRow['FirstName'] . ' ' . $nameRow['LastName'];
                }
            }

            // Get latest remark
            $remarksStmt->execute([$ticket['id']]);
            $latestRemark = $remarksStmt->fetch(PDO::FETCH_ASSOC);
            $allRemarks = '';
            if ($latestRemark) {
                $allRemarks = $latestRemark['remark_body'];
            }

            $rows[] = [
                'title'             => $ticket['title'] ?? '',
                'customer'          => $ticket['customer'] ?? '',
                'email_title'       => $ticket['email_title'] ?? '',
                'sales_in_charge'   => $ticket['sales_in_charge'] ?? '',
                'classification'    => intval($ticket['urgent']) === 1 ? 'Urgent' : 'Non-Urgent',
                'email_datetime'    => $ticket['date_and_time_of_email'] ? date('M j, g:i A', strtotime($ticket['date_and_time_of_email'])) : '',
                'acknowledged_at'   => $acknowledgedAt ? date('M j, g:i A', strtotime($acknowledgedAt)) : '',
                'timely_response'   => $ticket['timely_response'] === null ? '' : (intval($ticket['timely_response']) === 1 ? 'Yes' : 'No'),
                'qa_pic'            => $qaPic,
                'deadline'          => $ticket['deadline'] ? date('M j, g:i A', strtotime($ticket['deadline'])) : '',
                'date_resolved'     => $ticket['completed_at'] ? date('M j, Y', strtotime($ticket['completed_at'])) : '',
                'status'            => $statusLabels[$ticket['status']] ?? $ticket['status'],
                'remarks'           => $allRemarks,
            ];
        }

        if ($creator !== '') {
            $rows = array_filter($rows, function($row) use ($creator) {
                return $row['qa_pic'] === $creator;
            });
        }

        // ── Generate Excel-compatible HTML ──────────────────────────
        $filename = $filter === 'enroute' ? 'Enroute_Tickets' : 'All_Tickets';
        $filename .= '_' . date('Y-m-d') . '.xls';

        header('Content-Type: application/vnd.ms-excel');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: max-age=0');

        echo '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">';
        echo '<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>';
        echo '<x:Name>Tickets</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>';
        echo '</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>';
        echo '<body>';
        echo '<table border="1">';

        // Header row
        echo '<tr>';
        $headers = [
            'Title',
            'Customer',
            'Title of Email',
            'Sales-in-Charge',
            'Classification',
            'Date and Time of Email',
            'Date and Time Acknowledged',
            'Timely Response?',
            'QA PIC',
            'Deadline',
            'Date Resolved',
            'Status',
            'Remarks'
        ];
        foreach ($headers as $h) {
            echo '<th style="background-color:#4472C4;color:#ffffff;font-weight:bold;padding:6px 10px;border:1px solid #2F5496;font-family:Calibri;font-size:11pt;text-align:center;">' . htmlspecialchars($h) . '</th>';
        }
        echo '</tr>';

        // Data rows
        foreach ($rows as $row) {
            echo '<tr>';
            foreach ($row as $key => $val) {
                // If this is the remarks column, allow line breaks
                if ($key === 'remarks') {
                    echo '<td style="padding:4px 8px;border:1px solid #D9E2F3;font-family:Calibri;font-size:11pt;white-space:pre-wrap;vertical-align:top;">' . $val . '</td>';
                } else {
                    echo '<td style="padding:4px 8px;border:1px solid #D9E2F3;font-family:Calibri;font-size:11pt;vertical-align:top;">' . htmlspecialchars($val) . '</td>';
                }
            }
            echo '</tr>';
        }

        echo '</table>';
        echo '</body></html>';

    } catch (Exception $e) {
        http_response_code(500);
        echo 'Export error: ' . $e->getMessage();
    }
