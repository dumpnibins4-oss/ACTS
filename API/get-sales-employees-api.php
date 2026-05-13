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

        $search = $_GET['search'] ?? '';

        $sql = "
            SELECT EmployeeID, BiometricsID, FirstName, MiddleName, LastName
            FROM [LRNPH_E].[dbo].[lrn_master_list]
            WHERE SubDepartment = 'Internal Sales - LRN' AND IsActive = 1
        ";
        $params = [];

        if ($search !== '') {
            $sql .= " AND (FirstName LIKE ? OR LastName LIKE ? OR MiddleName LIKE ? OR EmployeeID LIKE ? OR BiometricsID LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
            $params[] = "%$search%";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }

        $sql .= " ORDER BY LastName ASC, FirstName ASC";

        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data'    => $employees
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
