<?php
// GitHub Actions deploy webhook
// Called by CI: GET /edu/hook.php?token=SECRET
$secret = getenv('DEPLOY_TOKEN') ?: 'tnpsc-deploy-2026';
if (!hash_equals($secret, $_GET['token'] ?? '')) {
    http_response_code(403);
    exit('Forbidden');
}

$target = '/home/u221026474/domains/superfinelabels.in/public_html/edu';
$output = [];

// git pull
exec("cd $target && git pull origin main 2>&1", $output, $code);

// reset migration locks so schema changes apply
@unlink("$target/.migrated");
@unlink("$target/.migrated_v2");

header('Content-Type: application/json');
echo json_encode([
    'success' => $code === 0,
    'output'  => implode("\n", $output),
]);
