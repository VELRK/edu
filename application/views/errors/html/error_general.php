<?php
defined('BASEPATH') OR exit('No direct script access allowed');
?><!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Error</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .error-container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .error-title { color: #d32f2f; font-size: 24px; margin-bottom: 20px; }
        .error-message { background: #ffebee; padding: 15px; border-left: 4px solid #d32f2f; margin: 15px 0; }
        .back-link { margin-top: 20px; }
        .back-link a { color: #1976d2; text-decoration: none; }
    </style>
</head>
<body>
    <div class="error-container">
        <h1 class="error-title">Error</h1>
        
        <div class="error-message">
            <strong>Message:</strong> <?php echo $message; ?><br>
            <strong>Type:</strong> <?php echo $type; ?><br>
            <?php if (isset($filepath)): ?>
            <strong>Filename:</strong> <?php echo $filepath; ?><br>
            <?php endif ?>
            <?php if (isset($line)): ?>
            <strong>Line Number:</strong> <?php echo $line; ?>
            <?php endif ?>
        </div>
        
        <div class="back-link">
            <a href="javascript:history.back()">← Go Back</a>
        </div>
    </div>
</body>
</html>

