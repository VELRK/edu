<?php
defined('BASEPATH') OR exit('No direct script access allowed');
?><!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>404 Page Not Found</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 0;
            padding: 0;
            background: #f5f5f5;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .error-container { 
            background: white; 
            padding: 40px; 
            border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 600px;
            width: 90%;
        }
        .error-code { 
            color: #d32f2f; 
            font-size: 72px; 
            font-weight: bold;
            margin-bottom: 20px;
            line-height: 1;
        }
        .error-title { 
            color: #333; 
            font-size: 28px; 
            margin-bottom: 15px;
        }
        .error-message { 
            color: #666;
            font-size: 16px;
            margin-bottom: 30px;
            line-height: 1.6;
        }
        .back-link { 
            margin-top: 30px; 
        }
        .back-link a { 
            color: #1976d2; 
            text-decoration: none;
            font-size: 16px;
            padding: 12px 24px;
            border: 2px solid #1976d2;
            border-radius: 4px;
            display: inline-block;
            transition: all 0.3s;
        }
        .back-link a:hover {
            background: #1976d2;
            color: white;
        }
        .home-link {
            margin-top: 15px;
        }
        .home-link a {
            color: #666;
            text-decoration: none;
            font-size: 14px;
        }
        .home-link a:hover {
            color: #1976d2;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="error-code">404</div>
        <h1 class="error-title">Page Not Found</h1>
        <div class="error-message">
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </div>
        
        <div class="back-link">
            <a href="javascript:history.back()">← Go Back</a>
        </div>
        
        <div class="home-link">
            <a href="<?php 
                // Try to get base URL
                $home_url = '/';
                if (function_exists('base_url')) {
                    $home_url = base_url();
                } elseif (defined('APPPATH') && file_exists(APPPATH . 'config/config.php')) {
                    // Fallback: read from config file
                    @include(APPPATH . 'config/config.php');
                    if (isset($config['base_url']) && !empty($config['base_url'])) {
                        $home_url = rtrim($config['base_url'], '/');
                    }
                }
                echo htmlspecialchars($home_url);
            ?>">Go to Homepage</a>
        </div>
    </div>
</body>
</html>
