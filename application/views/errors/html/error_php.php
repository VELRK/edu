<?php
defined('BASEPATH') OR exit('No direct script access allowed');
?><!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>PHP Error</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .error-container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .error-title { color: #d32f2f; font-size: 24px; margin-bottom: 20px; }
        .error-message { background: #ffebee; padding: 15px; border-left: 4px solid #d32f2f; margin: 15px 0; }
        .error-details { background: #f5f5f5; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 14px; }
        .back-link { margin-top: 20px; }
        .back-link a { color: #1976d2; text-decoration: none; }
    </style>
</head>
<body>
    <div class="error-container">
        <h1 class="error-title">PHP Error</h1>
        
        <div class="error-message">
            <strong>Severity:</strong> <?php echo $severity; ?><br>
            <strong>Message:</strong> <?php echo $message; ?><br>
            <strong>Filename:</strong> <?php echo $filepath; ?><br>
            <strong>Line Number:</strong> <?php echo $line; ?>
        </div>
        
        <?php if (defined('SHOW_DEBUG_BACKTRACE') && SHOW_DEBUG_BACKTRACE === TRUE): ?>
        <div class="error-details">
            <strong>Backtrace:</strong><br>
            <?php foreach (debug_backtrace() as $error): ?>
                <?php if (isset($error['file']) && strpos($error['file'], realpath(BASEPATH)) !== 0): ?>
                    <p style="margin-left: 10px;">
                    File: <?php echo $error['file']; ?><br />
                    Line: <?php echo $error['line']; ?><br />
                    Function: <?php echo $error['function']; ?>
                    </p>
                <?php endif ?>
            <?php endforeach ?>
        </div>
        <?php endif ?>
        
        <div class="back-link">
            <a href="javascript:history.back()">← Go Back</a>
        </div>
    </div>
</body>
</html>

