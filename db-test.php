<?php
// TEMPORARY diagnostic — delete after use
$env = [];
$envFile = __DIR__ . '/.env';

if (!file_exists($envFile)) {
    die(".env file NOT FOUND at: $envFile\n");
}

foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    if (strpos(trim($line), '#') === 0 || strpos($line, '=') === false) continue;
    [$k, $v] = array_map('trim', explode('=', $line, 2));
    if ($k) $env[$k] = $v;
}

echo ".env loaded. Keys found: " . implode(', ', array_keys($env)) . "\n\n";

$host = $env['DB_HOST']     ?? '(not set)';
$user = $env['DB_USER']     ?? '(not set)';
$pass = $env['DB_PASSWORD'] ?? '(not set)';
$name = $env['DB_NAME']     ?? '(not set)';

echo "DB_HOST: $host\n";
echo "DB_USER: $user\n";
echo "DB_NAME: $name\n";
echo "DB_PASSWORD: " . (empty($pass) ? '(EMPTY)' : '(set, ' . strlen($pass) . ' chars)') . "\n\n";

$conn = @mysqli_connect($host, $user, $pass, $name);
if ($conn) {
    echo "SUCCESS - DB connected!\n";
    mysqli_close($conn);
} else {
    echo "FAILED - " . mysqli_connect_error() . " (code: " . mysqli_connect_errno() . ")\n";
}
