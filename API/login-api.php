<?php
    session_start();
    header('Content-Type: application/json');
    error_reporting(E_ALL);
    ini_set('display_errors', 0);
    
    function loadDependencies() {
        require_once __DIR__ . '/../Connections/conn.php';
        return $conn;
    }
    
    if ($_SERVER['REQUEST_METHOD'] !== "POST") {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Invalid Request Method']);
        exit;
    }
    
    try {
        $conn = loadDependencies();
        $username    = $_POST['username'] ?? '';
        $password    = $_POST['password'] ?? '';

        if ($username === '' || $password === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Please fill in the required fields']);
            exit;
        }
        
        $stmt = $conn->prepare("SELECT * FROM [LRNPH_OJT].[dbo].[lrnph_users] WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();
        
        if (!$user) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => "This user doesn't exist"]);
            exit;
        }

        if (!password_verify($password, $user['password'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => "Incorrect Password"]);
            exit;
        }

        $stmt = $conn->prepare("SELECT * FROM [LRNPH_OJT].[dbo].[lrn_master_list] WHERE BiometricsID = ?");
        $stmt->execute([$user['username']]);
        $master_list = $stmt->fetch();

        $stmt = $conn->prepare("SELECT * FROM [LRNPH_OJT].[dbo].[acts_restrictions] WHERE biometrics_id = ?");
        $stmt->execute([$user['username']]);
        $role = $stmt->fetch();

        if (!$role) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => "You don't have access to this system"]);
            exit;
        }

        $_SESSION['user_role']        = $role['role'];
        $_SESSION['user_information'] = $master_list;

        http_response_code(200);
        echo json_encode(['success' => true, 'message' => "Login successful"]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }