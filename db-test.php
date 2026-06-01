<?php
// TEMPORARY diagnostic — delete after use
$host = 'localhost';
$user = 'u221026474_edu';
$pass = 'Velmurugn0071@!!';
$name = 'u221026474_edu';

echo "Testing: $user@$host / $name\n\n";

$conn = @mysqli_connect($host, $user, $pass, $name);
if ($conn) {
    echo "SUCCESS - DB connected!\n";
    $res = mysqli_query($conn, "SHOW TABLES");
    $tables = [];
    while ($row = mysqli_fetch_row($res)) $tables[] = $row[0];
    echo "Tables: " . implode(', ', $tables) . "\n";
    mysqli_close($conn);
} else {
    echo "FAILED - " . mysqli_connect_error() . " (code: " . mysqli_connect_errno() . ")\n";
}
