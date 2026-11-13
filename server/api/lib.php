<?php
// Shared pieces of the API: configuration, database, JSON in and out, the
// signed-in member and a simple per-visitor rate limit.

declare(strict_types=1);

final class HttpError extends Exception
{
    public function __construct(string $message, public int $status = 400)
    {
        parent::__construct($message);
    }
}

/**
 * The account's home folder (/home/<user>), outside every website: the API sits
 * in /home/<user>/domains/<site>/public_html/api. Hostinger asks not to put
 * files in domains/<site>/ itself.
 */
function private_root(): string
{
    return dirname(__DIR__, 4);
}

function settings(): array
{
    static $config = null;
    if ($config === null) {
        $file = private_root() . '/patatheque-config.php';
        if (!is_file($file)) throw new RuntimeException("Missing $file");
        $config = require $file;
    }
    return $config;
}

function data_dir(): string
{
    return settings()['data_dir'] ?? private_root() . '/patatheque-data';
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $c = settings();
        $pdo = new PDO(
            sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $c['db_host'] ?? 'localhost', $c['db_name']),
            $c['db_user'],
            $c['db_pass'],
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false],
        );
        $pdo->exec("SET time_zone = '+00:00'");
    }
    return $pdo;
}

function db_run(string $sql, array $args = []): PDOStatement
{
    $st = db()->prepare($sql);
    $st->execute($args);
    return $st;
}

function db_one(string $sql, array $args = []): ?array
{
    return db_run($sql, $args)->fetch() ?: null;
}

function db_all(string $sql, array $args = []): array
{
    return db_run($sql, $args)->fetchAll();
}

/** MySQL UTC datetime to ISO 8601. */
function iso(string $datetime): string
{
    return (new DateTimeImmutable($datetime, new DateTimeZone('UTC')))->format('Y-m-d\TH:i:s.v\Z');
}

function reply(mixed $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function body(): mixed
{
    $raw = file_get_contents('php://input') ?: 'null';
    try {
        return json_decode($raw, true, 64, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        throw new HttpError('JSON invalide.', 400);
    }
}

/**
 * Changes must come from the site's own pages: the browser only sends this
 * header from same-origin scripts, so other sites can't post with a staff cookie.
 */
function require_same_origin(): void
{
    if (($_SERVER['HTTP_X_PATATHEQUE'] ?? '') !== '1') throw new HttpError('Requête refusée.', 403);
}

function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    session_name('patatheque_admin');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    ini_set('session.gc_maxlifetime', (string)(12 * 3600));
    session_start();
}

function sign_in(string $id): void
{
    start_session();
    session_regenerate_id(true);
    $_SESSION['member'] = $id;
    current_member(true);
}

/** The signed-in member, re-read from the database so removal or deactivation takes effect at once. */
function current_member(bool $refresh = false): ?array
{
    static $member = false;
    if ($member !== false && !$refresh) return $member;
    $member = null;
    // Only open a session for visitors who already have one (staff).
    if (!isset($_COOKIE['patatheque_admin']) && session_status() !== PHP_SESSION_ACTIVE) return null;
    start_session();
    $id = $_SESSION['member'] ?? null;
    if ($id) {
        $row = db_one('SELECT * FROM members WHERE id = ? AND active = 1', [$id]);
        $member = $row ?: null;
    }
    return $member;
}

/** At most $max requests per $seconds for this visitor and bucket. */
function rate_limit(string $bucket, int $max, int $seconds): void
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $key = substr(hash('sha256', $bucket . '|' . $ip), 0, 32);
    db_run('DELETE FROM hits WHERE at < UTC_TIMESTAMP() - INTERVAL 1 DAY AND RAND() < 0.02');
    $count = (int)db_one('SELECT COUNT(*) AS n FROM hits WHERE k = ? AND at > UTC_TIMESTAMP() - INTERVAL ? SECOND', [$key, $seconds])['n'];
    if ($count >= $max) throw new HttpError('Trop de demandes. Réessayez dans quelques minutes.', 429);
    db_run('INSERT INTO hits (k, at) VALUES (?, UTC_TIMESTAMP())', [$key]);
}

function migrate(): void
{
    db()->exec(<<<SQL
        CREATE TABLE IF NOT EXISTS kv (
            k VARCHAR(64) PRIMARY KEY,
            v LONGTEXT NOT NULL,
            updated_at DATETIME NOT NULL
        ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS records (
            id VARCHAR(16) NOT NULL,
            collection VARCHAR(20) NOT NULL,
            data LONGTEXT NOT NULL,
            created_at DATETIME(3) NOT NULL,
            PRIMARY KEY (collection, id),
            KEY by_date (collection, created_at)
        ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS bookings (
            id VARCHAR(16) PRIMARY KEY,
            date DATE NOT NULL,
            time CHAR(5) NOT NULL,
            table_id VARCHAR(40) NOT NULL,
            status VARCHAR(16) NOT NULL,
            data LONGTEXT NOT NULL,
            created_at DATETIME(3) NOT NULL,
            KEY by_date (date)
        ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS members (
            id VARCHAR(16) PRIMARY KEY,
            name VARCHAR(120) NOT NULL,
            email VARCHAR(200) NOT NULL UNIQUE,
            employee_number VARCHAR(8) NOT NULL UNIQUE,
            role VARCHAR(20) NOT NULL,
            tabs TEXT NULL,
            password_hash VARCHAR(255) NOT NULL,
            active TINYINT(1) NOT NULL DEFAULT 1,
            owner TINYINT(1) NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL,
            last_login DATETIME NULL
        ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS hits (
            k CHAR(32) NOT NULL,
            at DATETIME NOT NULL,
            KEY by_key (k, at)
        ) DEFAULT CHARSET=ascii;
        SQL);
}
