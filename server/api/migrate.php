<?php
// Creates or updates the tables. Run on the server: php api/migrate.php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require __DIR__ . '/lib.php';
migrate();
echo "Tables ready.\n";
