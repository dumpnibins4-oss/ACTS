<?php
if (session_status() === PHP_SESSION_NONE) { session_start(); }
// Database connection
$dsn = "sqlsrv:Server=10.2.0.9;Database=LRNPH_QA";
$db_username = "sa";
$db_password = "S3rverDB02lrn25";

try {
    $conn = new PDO($dsn, $db_username, $db_password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
}
catch (PDOException $e) {
    die("Connection failed: " . $e->getMessage());
}
?>