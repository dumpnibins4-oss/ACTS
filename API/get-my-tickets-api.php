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

        $empId  = $_SESSION['user_information']['EmployeeID'] ?? '';
        $search = $_GET['search'] ?? '';

        $sql = "
            SELECT
                t.id, t.title, t.status, t.urgent, t.submitter,
                t.created_at, t.created_by,
                t.updated_at, t.updated_by,
                t.completed_at, t.completed_by,
                t.customer, t.email_title, t.sales_in_charge,
                t.date_and_time_of_email, t.timely_response,
                t.deadline, t.remarks
            FROM [LRNPH_OJT].[dbo].[acts_ticket] t
            WHERE t.created_by = ?
        ";
        $params = [$empId];

        if ($search !== '') {
            $sql .= " AND (t.title LIKE ? OR t.customer LIKE ? OR t.email_title LIKE ? OR t.status LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }

        $sql .= " ORDER BY t.created_at DESC";

        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $tickets = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch sections + images for each ticket
        $result = [];
        foreach ($tickets as $ticket) {
            $stmtSec = $conn->prepare("
                SELECT id, sub_title, body
                FROM [LRNPH_OJT].[dbo].[acts_ticket_section]
                WHERE ticket_id = ?
                ORDER BY id ASC
            ");
            $stmtSec->execute([$ticket['id']]);
            $sections = $stmtSec->fetchAll(PDO::FETCH_ASSOC);

            $secs = [];
            foreach ($sections as $sec) {
                $stmtImg = $conn->prepare("
                    SELECT id, image
                    FROM [LRNPH_OJT].[dbo].[acts_ticket_section_images]
                    WHERE ticket_section_id = ?
                    ORDER BY id ASC
                ");
                $stmtImg->execute([$sec['id']]);
                $sec['images'] = $stmtImg->fetchAll(PDO::FETCH_ASSOC);
                $secs[] = $sec;
            }

            $ticket['sections'] = $secs;
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