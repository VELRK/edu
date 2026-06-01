<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title><?php echo isset($heading) ? $heading : 'Error'; ?></title>
    <style type="text/css">
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            line-height: 1.6;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .error-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 800px;
            width: 100%;
            padding: 40px;
            margin: 20px;
        }
        h1 {
            color: #dc3545;
            font-size: 32px;
            margin-bottom: 20px;
            border-bottom: 3px solid #dc3545;
            padding-bottom: 15px;
        }
        h2 {
            color: #495057;
            font-size: 24px;
            margin-top: 30px;
            margin-bottom: 15px;
        }
        .error-message {
            background: #f8f9fa;
            border-left: 4px solid #dc3545;
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 4px;
            font-size: 16px;
            color: #212529;
        }
        .error-details {
            background: #fff;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            overflow-x: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .back-link {
            display: inline-block;
            margin-top: 30px;
            padding: 12px 24px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .back-link:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            color: white;
            text-decoration: none;
        }
        .file-info {
            color: #6c757d;
            font-size: 14px;
            margin-top: 10px;
        }
        .line-number {
            color: #dc3545;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <h1><?php echo isset($heading) ? $heading : 'Error'; ?></h1>
        
        <div class="error-message">
            <?php echo $message; ?>
        </div>
        
        <?php if (isset($exception) && is_object($exception)): ?>
            <h2>Exception Details</h2>
            <div class="error-details">
                <strong>Type:</strong> <?php echo get_class($exception); ?><br>
                <strong>Message:</strong> <?php echo $exception->getMessage(); ?><br>
                <strong>File:</strong> <?php echo $exception->getFile(); ?><br>
                <strong>Line:</strong> <span class="line-number"><?php echo $exception->getLine(); ?></span>
            </div>
            
            <?php if (ENVIRONMENT !== 'production'): ?>
                <h2>Stack Trace</h2>
                <div class="error-details">
                    <?php echo $exception->getTraceAsString(); ?>
                </div>
            <?php endif; ?>
        <?php endif; ?>
        
        <a href="javascript:history.back()" class="back-link">← Go Back</a>
    </div>
</body>
</html>

