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

        $sql = "
            SELECT
                r.id,
                r.biometrics_id,
                r.role,
                m.FirstName,
                m.LastName,
                m.MiddleName,
                m.Department,
                m.EmployeeID
            FROM [LRNPH_OJT].[dbo].[acts_restrictions] r
            LEFT JOIN [LRNPH_OJT].[dbo].[lrn_master_list] m
                ON TRY_CAST(r.biometrics_id AS NVARCHAR(50)) = TRY_CAST(m.BiometricsID AS NVARCHAR(50)) COLLATE SQL_Latin1_General_CP1_CI_AS
            ORDER BY
                CASE r.role
                    WHEN 'super_admin' THEN 1
                    WHEN 'admin' THEN 2
                    WHEN 'editor' THEN 3
                    WHEN 'user' THEN 4
                    ELSE 5
                END,
                m.LastName ASC
        ";

        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'data'    => $users,
            'count'   => count($users)
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
