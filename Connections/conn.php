<?php
if (session_status() === PHP_SESSION_NONE) { session_start(); }
// Database connection
$dsn = "sqlsrv:Server=10.2.0.9;Database=LRNPH_OJT";
$db_username = "vsalenga";
$db_password = "oJT!@#$";

try {
    $conn = new PDO($dsn, $db_username, $db_password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
}
catch (PDOException $e) {
    die("Connection failed: " . $e->getMessage());
}
?>