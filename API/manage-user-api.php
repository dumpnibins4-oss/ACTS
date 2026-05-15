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

        $action    = $_POST['action']       ?? '';
        $myEmpId   = $_SESSION['user_information']['BiometricsID'] ?? '';
        $myRole    = $_SESSION['user_role']  ?? 'user';

        // ── Determine caller's role from DB ─────────────────────────
        $roleStmt = $conn->prepare("SELECT role FROM [LRNPH_QA].[dbo].[acts_restrictions] WHERE TRY_CAST(biometrics_id AS NVARCHAR(50)) = ?");
        $roleStmt->execute([$myEmpId]);
        $callerRow = $roleStmt->fetch(PDO::FETCH_ASSOC);
        $callerRole = $callerRow['role'] ?? $myRole;

        // ════════════════════════════════════════════════════════════
        // ADD USER
        // ════════════════════════════════════════════════════════════
        if ($action === 'add') {
            $biometricsId = $_POST['biometrics_id'] ?? '';
            $role         = $_POST['role']          ?? '';

            if (!$biometricsId || !$role) {
                echo json_encode(['success' => false, 'message' => 'Employee and role are required.']);
                exit;
            }

            // Check if already exists
            $checkStmt = $conn->prepare("SELECT id FROM [LRNPH_QA].[dbo].[acts_restrictions] WHERE TRY_CAST(biometrics_id AS NVARCHAR(50)) = ?");
            $checkStmt->execute([$biometricsId]);
            if ($checkStmt->fetch()) {
                echo json_encode(['success' => false, 'message' => 'This employee is already registered in the system.']);
                exit;
            }

            // Validate employee exists in master list
            $empStmt = $conn->prepare("SELECT BiometricsID, Department FROM [LRNPH_E].[DBO].[lrn_master_list] WHERE TRY_CAST(BiometricsID AS NVARCHAR(50)) = ?");
            $empStmt->execute([$biometricsId]);
            $emp = $empStmt->fetch(PDO::FETCH_ASSOC);
            if (!$emp) {
                echo json_encode(['success' => false, 'message' => 'Employee not found in the master list.']);
                exit;
            }

            // Role permission checks
            $validRoles = ['user', 'editor', 'admin', 'super_admin'];
            if (!in_array($role, $validRoles)) {
                echo json_encode(['success' => false, 'message' => 'Invalid role.']);
                exit;
            }

            // Only super_admin can create admins
            if ($role === 'admin' && $callerRole !== 'super_admin') {
                echo json_encode(['success' => false, 'message' => 'Only Super Admin can create Admin users.']);
                exit;
            }

            // Cannot create super_admin via add
            if ($role === 'super_admin') {
                echo json_encode(['success' => false, 'message' => 'Super Admin can only be assigned via transfer.']);
                exit;
            }

            // Admin can only create user/editor
            if ($callerRole === 'admin' && !in_array($role, ['user', 'editor'])) {
                echo json_encode(['success' => false, 'message' => 'You can only assign User or Editor roles.']);
                exit;
            }

            $insertStmt = $conn->prepare("INSERT INTO [LRNPH_QA].[dbo].[acts_restrictions] (biometrics_id, role) VALUES (?, ?)");
            $insertStmt->execute([$biometricsId, $role]);

            echo json_encode(['success' => true, 'message' => 'User added successfully.']);
            exit;
        }

        // ════════════════════════════════════════════════════════════
        // UPDATE ROLE
        // ════════════════════════════════════════════════════════════
        if ($action === 'update_role') {
            $targetId = $_POST['id']   ?? '';
            $newRole  = $_POST['role'] ?? '';

            if (!$targetId || !$newRole) {
                echo json_encode(['success' => false, 'message' => 'User ID and role are required.']);
                exit;
            }

            // Get the target user
            $targetStmt = $conn->prepare("
                SELECT r.id, r.biometrics_id, r.role, m.Department
                FROM [LRNPH_QA].[dbo].[acts_restrictions] r
                LEFT JOIN [LRNPH_E].[DBO].[lrn_master_list] m
                    ON TRY_CAST(r.biometrics_id AS NVARCHAR(50)) = TRY_CAST(m.EmployeeID AS NVARCHAR(50)) COLLATE SQL_Latin1_General_CP1_CI_AS
                WHERE r.id = ?
            ");
            $targetStmt->execute([$targetId]);
            $target = $targetStmt->fetch(PDO::FETCH_ASSOC);

            if (!$target) {
                echo json_encode(['success' => false, 'message' => 'User not found.']);
                exit;
            }

            // Cannot edit super_admin unless you are super_admin
            if ($target['role'] === 'super_admin' && $callerRole !== 'super_admin') {
                echo json_encode(['success' => false, 'message' => 'Cannot modify Super Admin.']);
                exit;
            }

            // Cannot promote to super_admin
            if ($newRole === 'super_admin') {
                echo json_encode(['success' => false, 'message' => 'Use transfer to assign Super Admin.']);
                exit;
            }

            // Only super_admin can set admin role
            if ($newRole === 'admin' && $callerRole !== 'super_admin') {
                echo json_encode(['success' => false, 'message' => 'Only Super Admin can assign Admin role.']);
                exit;
            }

            // Admin can only change to user/editor
            if ($callerRole === 'admin' && !in_array($newRole, ['user', 'editor'])) {
                echo json_encode(['success' => false, 'message' => 'You can only assign User or Editor roles.']);
                exit;
            }

            $updateStmt = $conn->prepare("UPDATE [LRNPH_QA].[dbo].[acts_restrictions] SET role = ? WHERE id = ?");
            $updateStmt->execute([$newRole, $targetId]);

            echo json_encode(['success' => true, 'message' => 'Role updated successfully.']);
            exit;
        }

        // ════════════════════════════════════════════════════════════
        // DELETE USER
        // ════════════════════════════════════════════════════════════
        if ($action === 'delete') {
            $targetId = $_POST['id'] ?? '';

            if (!$targetId) {
                echo json_encode(['success' => false, 'message' => 'User ID is required.']);
                exit;
            }

            // Get target
            $targetStmt = $conn->prepare("SELECT id, role, biometrics_id FROM [LRNPH_QA].[dbo].[acts_restrictions] WHERE id = ?");
            $targetStmt->execute([$targetId]);
            $target = $targetStmt->fetch(PDO::FETCH_ASSOC);

            if (!$target) {
                echo json_encode(['success' => false, 'message' => 'User not found.']);
                exit;
            }

            // Cannot delete yourself
            if ($target['biometrics_id'] == $myEmpId) {
                echo json_encode(['success' => false, 'message' => 'You cannot remove yourself.']);
                exit;
            }

            // Cannot delete super_admin
            if ($target['role'] === 'super_admin') {
                echo json_encode(['success' => false, 'message' => 'Cannot remove Super Admin.']);
                exit;
            }

            // Admin cannot delete other admins
            if ($target['role'] === 'admin' && $callerRole !== 'super_admin') {
                echo json_encode(['success' => false, 'message' => 'Only Super Admin can remove Admins.']);
                exit;
            }

            $deleteStmt = $conn->prepare("DELETE FROM [LRNPH_QA].[dbo].[acts_restrictions] WHERE id = ?");
            $deleteStmt->execute([$targetId]);

            echo json_encode(['success' => true, 'message' => 'User removed successfully.']);
            exit;
        }

        // ════════════════════════════════════════════════════════════
        // TRANSFER SUPER ADMIN
        // ════════════════════════════════════════════════════════════
        if ($action === 'transfer') {
            $targetId = $_POST['id'] ?? '';

            if ($callerRole !== 'super_admin') {
                echo json_encode(['success' => false, 'message' => 'Only Super Admin can transfer this role.']);
                exit;
            }

            if (!$targetId) {
                echo json_encode(['success' => false, 'message' => 'Target user ID is required.']);
                exit;
            }

            // Get target
            $targetStmt = $conn->prepare("
                SELECT r.id, r.biometrics_id, r.role, m.Department
                FROM [LRNPH_QA].[dbo].[acts_restrictions] r
                LEFT JOIN [LRNPH_E].[DBO].[lrn_master_list] m
                    ON TRY_CAST(r.biometrics_id AS NVARCHAR(50)) = TRY_CAST(m.BiometricsID AS NVARCHAR(50)) COLLATE SQL_Latin1_General_CP1_CI_AS
                WHERE r.id = ?
            ");
            $targetStmt->execute([$targetId]);
            $target = $targetStmt->fetch(PDO::FETCH_ASSOC);

            if (!$target) {
                echo json_encode(['success' => false, 'message' => 'Target user not found.']);
                exit;
            }

            if ($target['role'] !== 'admin') {
                echo json_encode(['success' => false, 'message' => 'Can only transfer Super Admin to an existing Admin.']);
                exit;
            }

            // Demote current super_admin to admin
            $demoteStmt = $conn->prepare("UPDATE [LRNPH_QA].[dbo].[acts_restrictions] SET role = 'admin' WHERE TRY_CAST(biometrics_id AS NVARCHAR(50)) = ?");
            $demoteStmt->execute([$myEmpId]);

            // Promote target to super_admin
            $promoteStmt = $conn->prepare("UPDATE [LRNPH_QA].[dbo].[acts_restrictions] SET role = 'super_admin' WHERE id = ?");
            $promoteStmt->execute([$targetId]);

            // Update session
            $_SESSION['user_role'] = 'admin';

            echo json_encode(['success' => true, 'message' => 'Super Admin role transferred. You are now Admin.']);
            exit;
        }

        echo json_encode(['success' => false, 'message' => 'Unknown action.']);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
