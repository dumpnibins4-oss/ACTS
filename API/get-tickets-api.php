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

        $filter    = $_GET['filter']     ?? 'active';
        $createdBy = $_GET['created_by'] ?? '';
        $search    = $_GET['search']     ?? '';

        // ── Build WHERE clauses ─────────────────────────────────
        $where  = [];
        $params = [];

        if ($createdBy !== '') {
            $where[]  = 't.created_by = ?';
            $params[] = $createdBy;
        }

        if ($filter === 'active') {
            $where[] = "t.status NOT IN ('completed', 'closed', 'enroute')";
        } elseif ($filter === 'history') {
            // history = all tickets (no status filter)
        }
        // filter=all also returns everything

        if ($search !== '') {
            $where[]  = "(t.title LIKE ? OR t.status LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }

        $whereSQL = count($where) > 0 ? 'WHERE ' . implode(' AND ', $where) : '';

        // ── Fetch tickets ───────────────────────────────────────
        $sql = "
            SELECT
                t.id,
                t.title,
                t.status,
                t.urgent,
                t.submitter,
                t.created_at,
                t.created_by,
                t.updated_at,
                t.updated_by,
                t.completed_at,
                t.completed_by,
                t.customer,
                t.email_title,
                t.sales_in_charge,
                t.date_and_time_of_email,
                t.timely_response,
                t.deadline,
                t.signature_requirement,
                m.FirstName,
                m.LastName,
                m.Department
            FROM [LRNPH_QA].[dbo].[acts_ticket] t
            LEFT JOIN [LRNPH_E].[DBO].[lrn_master_list] m
                ON TRY_CAST(t.created_by AS NVARCHAR(50)) = TRY_CAST(m.EmployeeID AS NVARCHAR(50)) COLLATE SQL_Latin1_General_CP1_CI_AS
            $whereSQL
            ORDER BY t.created_at DESC
        ";

        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $tickets = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // ── Fetch sections + images for each ticket ─────────────
        $result = [];
        foreach ($tickets as $ticket) {
            $stmtSec = $conn->prepare("
                SELECT id, sub_title, body
                FROM [LRNPH_QA].[dbo].[acts_ticket_section]
                WHERE ticket_id = ?
                ORDER BY id ASC
            ");
            $stmtSec->execute([$ticket['id']]);
            $sections = $stmtSec->fetchAll(PDO::FETCH_ASSOC);

            $secs = [];
            foreach ($sections as $sec) {
                $stmtImg = $conn->prepare("
                    SELECT id, image
                    FROM [LRNPH_QA].[dbo].[acts_ticket_section_images]
                    WHERE ticket_section_id = ?
                    ORDER BY id ASC
                ");
                $stmtImg->execute([$sec['id']]);
                $sec['images'] = $stmtImg->fetchAll(PDO::FETCH_ASSOC);
                $secs[] = $sec;
            }

            $ticket['sections'] = $secs;

            // Fetch remarks from acts_remarks + attachments
            $stmtRemarks = $conn->prepare("
                SELECT r.id, r.remark_type, r.remark_body, r.created_at, r.created_by
                FROM [LRNPH_QA].[dbo].[acts_remarks] r
                WHERE r.ticket_id = ?
                ORDER BY r.created_at DESC
            ");
            $stmtRemarks->execute([$ticket['id']]);
            $remarks = $stmtRemarks->fetchAll(PDO::FETCH_ASSOC);

            foreach ($remarks as &$remark) {
                // Fetch attachments
                $stmtAtt = $conn->prepare("
                    SELECT id, image_path
                    FROM [LRNPH_QA].[dbo].[acts_remarks_attachments]
                    WHERE remark_id = ?
                    ORDER BY id ASC
                ");
                $stmtAtt->execute([$remark['id']]);
                $remark['attachments'] = $stmtAtt->fetchAll(PDO::FETCH_ASSOC);

                // Resolve created_by name
                if (!empty($remark['created_by'])) {
                    $empStmt = $conn->prepare("
                        SELECT FirstName, MiddleName, LastName
                        FROM [LRNPH_E].[DBO].[lrn_master_list]
                        WHERE EmployeeID = ?
                    ");
                    $empStmt->execute([$remark['created_by']]);
                    $emp = $empStmt->fetch(PDO::FETCH_ASSOC);
                    if ($emp) {
                        $mi = $emp['MiddleName'] ? substr($emp['MiddleName'], 0, 1) . '.' : '';
                        $remark['created_by_name'] = trim($emp['FirstName'] . ' ' . $mi . ' ' . $emp['LastName']);
                    } else {
                        $remark['created_by_name'] = $remark['created_by'];
                    }
                } else {
                    $remark['created_by_name'] = '—';
                }
            }

            $ticket['remarks'] = $remarks;
            $result[] = $ticket;
        }

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data'    => $result,
            'count'   => count($result)
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
