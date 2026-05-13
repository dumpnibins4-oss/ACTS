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

        if (strlen($search) < 2) {
            echo json_encode(['success' => true, 'data' => []]);
            exit;
        }

        $sql = "
            SELECT TOP 20 EmployeeID, BiometricsID, FirstName, MiddleName, LastName, Department
            FROM [LRNPH_E].[DBO].[lrn_master_list]
            WHERE IsActive = '1'
              AND (FirstName LIKE ? OR LastName LIKE ? OR MiddleName LIKE ? OR EmployeeID LIKE ? OR BiometricsID LIKE ?)
              AND (Department = 'Information Technology Department - LRN' OR SubDepartment LIKE '%sales%' OR Department = 'Quality Assurance Department - LRN' OR Department = 'Quality Control Department - LRN')
              AND IsActive = 1
            ORDER BY LastName ASC, FirstName ASC
        ";
        $params = ["%$search%", "%$search%", "%$search%", "%$search%", "%$search%"];

        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => $employees]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
