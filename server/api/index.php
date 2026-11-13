<?php
// La Patathèque API. One file, routed by api/.htaccess: /api/<route>.
//
//   GET    config                 everything the site shows (menu, hours, info, tables, jobs…)
//   PUT    config/<key>           save one of them                         (staff, by page)
//   POST   records/<collection>   order, subscriber, application, catering, event (public)
//   GET    records/<collection>   list                                     (staff, by page)
//   PATCH  records/<collection>/<id>                                       (staff, by page)
//   GET    bookings?date=…        public: busy tables only; staff: full bookings
//   POST   bookings               book: the server picks the table
//   PATCH  bookings/<id>                                                    (staff)
//   GET    auth                   who is signed in, or whether the owner must be created
//   POST   auth                   sign in        POST auth/setup  create the owner (once)
//   DELETE auth                   sign out
//   GET/POST/PATCH/DELETE team…   owner only
//   GET    cv/<id>                an application's CV                      (staff)
//
// Secrets live outside the website, in ~/patatheque-config.php.

declare(strict_types=1);

require __DIR__ . '/lib.php';


function route(): void
{
    $method = $_SERVER['REQUEST_METHOD'];
    $parts = array_values(array_filter(explode('/', trim((string)($_GET['route'] ?? ''), '/'))));
    $head = $parts[0] ?? '';

    if ($method !== 'GET') require_same_origin();

    switch ($head) {
        case 'config':
            if ($method === 'GET') reply(config_all());
            if ($method === 'PUT' && isset($parts[1])) reply(config_put($parts[1], body()));
            break;
        case 'records':
            $c = $parts[1] ?? '';
            if ($method === 'POST') reply(record_create($c, body()), 201);
            if ($method === 'GET') reply(record_list($c));
            if ($method === 'PATCH' && isset($parts[2])) reply(record_update($c, $parts[2], body()));
            break;
        case 'bookings':
            if ($method === 'GET') reply(bookings_list((string)($_GET['from'] ?? '')));
            if ($method === 'POST') reply(booking_create(body()), 201);
            if ($method === 'PATCH' && isset($parts[1])) reply(booking_update($parts[1], body()));
            break;
        case 'auth':
            if ($method === 'GET') reply(auth_state());
            if ($method === 'POST' && ($parts[1] ?? '') === 'setup') reply(auth_setup(body()));
            if ($method === 'POST') reply(auth_login(body()));
            if ($method === 'DELETE') reply(auth_logout());
            break;
        case 'team':
            if ($method === 'GET') reply(team_list());
            if ($method === 'POST') reply(team_add(body()), 201);
            if ($method === 'PATCH' && isset($parts[1])) reply(team_update($parts[1], body()));
            if ($method === 'DELETE' && isset($parts[1])) reply(team_remove($parts[1]));
            break;
        case 'cv':
            if ($method === 'GET' && isset($parts[1])) cv_send($parts[1]);
            break;
    }
    throw new HttpError('Introuvable.', 404);
}

// ---------------------------------------------------------------- config

/** Saved values, by key, and the panel pages allowed to change each one. */
const CONFIG_KEYS = [
    'info' => ['settings'],
    'hours' => ['hours'],
    'menu' => ['menu'],
    'tables' => ['reservations'],
    'reservation-settings' => ['reservations', 'settings'],
    'essentials' => ['dashboard', 'orders', 'reservations', 'menu', 'hours', 'subscribers', 'applications', 'catering', 'settings'],
    'jobs' => ['applications'],
    'settings' => ['settings'],
];

function config_get(string $key): mixed
{
    $row = db_one('SELECT v FROM kv WHERE k = ?', [$key]);
    return $row ? json_decode($row['v'], true) : null;
}

function config_all(): array
{
    $out = [];
    foreach (db_all('SELECT k, v FROM kv') as $row) {
        if (isset(CONFIG_KEYS[$row['k']])) $out[$row['k']] = json_decode($row['v'], true);
    }
    // Visitors only see published openings.
    if (isset($out['jobs']) && !current_member()) {
        $out['jobs'] = array_values(array_filter($out['jobs'], fn($j) => ($j['status'] ?? '') === 'published'));
    }
    return $out;
}

function config_put(string $key, mixed $value): array
{
    if (!isset(CONFIG_KEYS[$key])) throw new HttpError('Clé inconnue.', 404);
    require_tab(...CONFIG_KEYS[$key]);
    if ($value === null) {
        db_run('DELETE FROM kv WHERE k = ?', [$key]);
        return ['ok' => true];
    }
    // Photos arrive as data: URLs from the editor; keep them as files instead.
    $value = store_inline_images($value);
    db_run(
        'INSERT INTO kv (k, v, updated_at) VALUES (?, ?, UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE v = VALUES(v), updated_at = VALUES(updated_at)',
        [$key, json_encode($value, JSON_UNESCAPED_UNICODE)],
    );
    return ['ok' => true, 'value' => $value];
}

function store_inline_images(mixed $value): mixed
{
    if (is_array($value)) {
        foreach ($value as $k => $v) $value[$k] = store_inline_images($v);
        return $value;
    }
    if (!is_string($value) || !preg_match('#^data:image/(webp|jpeg|png);base64,#', $value, $m)) return $value;
    $bytes = base64_decode(substr($value, strpos($value, ',') + 1), true);
    if ($bytes === false || strlen($bytes) > 3 * 1024 * 1024 || @getimagesizefromstring($bytes) === false) {
        throw new HttpError('Photo invalide.', 422);
    }
    $ext = $m[1] === 'jpeg' ? 'jpg' : $m[1];
    $name = substr(hash('sha256', $bytes), 0, 24) . '.' . $ext;
    $dir = dirname(__DIR__) . '/uploads/menu';
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    if (!is_file("$dir/$name")) file_put_contents("$dir/$name", $bytes);
    return "/uploads/menu/$name";
}

// ---------------------------------------------------------------- records

/** What the public can send, and the panel page that reads it. */
const COLLECTIONS = [
    'orders' => 'orders',
    'subscribers' => 'subscribers',
    'applications' => 'applications',
    'catering' => 'catering',
    'events' => 'dashboard',
];

function record_create(string $c, mixed $data): array
{
    if (!isset(COLLECTIONS[$c]) || !is_array($data)) throw new HttpError('Introuvable.', 404);
    rate_limit("post:$c", $c === 'events' ? 120 : 20, 600);

    $data = match ($c) {
        'orders' => clean_order($data),
        'subscribers' => clean_fields($data, ['email' => 200, 'code' => 40, 'lang' => 5], ['email']) + ['consent' => (bool)($data['consent'] ?? false)],
        'catering' => clean_fields($data, ['name' => 120, 'email' => 200, 'phone' => 40, 'eventType' => 120, 'date' => 40, 'guests' => 20, 'message' => 3000], ['name', 'email', 'phone']),
        'applications' => clean_application($data),
        'events' => clean_event($data),
    };
    if (isset($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) throw new HttpError('Courriel invalide.', 422);

    $id = strtoupper(bin2hex(random_bytes(3)));
    $cv = $data['_cv'] ?? null;
    unset($data['_cv']);
    if ($cv) {
        save_cv($id, $cv);
        $data['cv'] = ['name' => $cv['name'], 'size' => strlen($cv['bytes']), 'type' => $cv['type'], 'url' => "api/cv/$id"];
    }
    db_run('INSERT INTO records (id, collection, data, created_at) VALUES (?, ?, ?, UTC_TIMESTAMP(3))', [$id, $c, json_encode($data, JSON_UNESCAPED_UNICODE)]);
    return ['id' => $id, 'createdAt' => gmdate('Y-m-d\TH:i:s.v\Z')] + $data;
}

function record_list(string $c): array
{
    if (!isset(COLLECTIONS[$c])) throw new HttpError('Introuvable.', 404);
    require_tab(COLLECTIONS[$c], 'dashboard');
    // Events only feed the dashboard counters: the last 90 days are plenty.
    $where = $c === 'events' ? 'AND created_at > UTC_TIMESTAMP() - INTERVAL 90 DAY' : '';
    $rows = db_all("SELECT id, data, created_at FROM records WHERE collection = ? $where ORDER BY created_at DESC LIMIT 2000", [$c]);
    return array_map(fn($r) => ['id' => $r['id'], 'createdAt' => iso($r['created_at'])] + json_decode($r['data'], true), $rows);
}

function record_update(string $c, string $id, mixed $patch): array
{
    if ($c !== 'orders' || !is_array($patch)) throw new HttpError('Introuvable.', 404);
    require_tab('orders');
    $allowed = array_intersect_key($patch, ['status' => 1, 'paid' => 1]);
    if (isset($allowed['status']) && !in_array($allowed['status'], ['nouvelle', 'preparation', 'prete', 'terminee'], true)) throw new HttpError('Statut invalide.', 422);
    if (isset($allowed['paid'])) $allowed['paid'] = (bool)$allowed['paid'];
    $row = db_one('SELECT data FROM records WHERE collection = ? AND id = ?', [$c, $id]) ?? throw new HttpError('Introuvable.', 404);
    $data = array_merge(json_decode($row['data'], true), $allowed);
    db_run('UPDATE records SET data = ? WHERE collection = ? AND id = ?', [json_encode($data, JSON_UNESCAPED_UNICODE), $c, $id]);
    return ['ok' => true];
}

/** Keeps listed string fields, trimmed and cut to length; the required ones must be there. */
function clean_fields(array $data, array $fields, array $required = []): array
{
    $out = [];
    foreach ($fields as $k => $max) {
        $v = trim((string)($data[$k] ?? ''));
        if ($v !== '') $out[$k] = mb_substr($v, 0, $max);
    }
    foreach ($required as $k) if (!isset($out[$k])) throw new HttpError("Champ requis : $k", 422);
    return $out;
}

/** Prices come from the menu on the server; totals are worked out here, not trusted from the browser. */
function clean_order(array $data): array
{
    $order = clean_fields($data, ['name' => 120, 'phone' => 40, 'email' => 200, 'when' => 60, 'notes' => 1000, 'promoCode' => 40], ['name', 'phone']);
    $order['mode'] = 'emporter';
    $lines = [];
    foreach (array_slice((array)($data['lines'] ?? []), 0, 60) as $line) {
        $price = round((float)($line['price'] ?? 0), 2);
        $qty = max(1, min(50, (int)($line['qty'] ?? 1)));
        $category = (string)($line['category'] ?? '');
        if (!price_on_menu($category, $price)) throw new HttpError('Le menu a changé. Rechargez la page et refaites votre commande.', 409);
        $lines[] = array_filter([
            'name' => mb_substr((string)($line['name'] ?? ''), 0, 120),
            'size' => isset($line['size']) ? mb_substr((string)$line['size'], 0, 40) : null,
            'price' => $price,
            'qty' => $qty,
            'category' => $category ?: null,
        ], fn($v) => $v !== null);
    }
    if (!$lines) throw new HttpError('Panier vide.', 422);
    $subtotal = round(array_sum(array_map(fn($l) => $l['price'] * $l['qty'], $lines)), 2);
    $promo = strtoupper($order['promoCode'] ?? '') === 'BIENVENUE10';
    if (!$promo) unset($order['promoCode']);
    $discount = $promo ? round($subtotal * 0.1, 2) : 0;
    return $order + [
        'lines' => $lines,
        'subtotal' => $subtotal,
        'discount' => $discount,
        'total' => round($subtotal - $discount, 2),
        'status' => 'nouvelle',
        'paid' => false,
    ];
}

function price_on_menu(string $category, float $price): bool
{
    static $prices = null;
    if ($prices === null) {
        $menu = config_get('menu');
        if (!$menu) {
            $default = json_decode((string)@file_get_contents(__DIR__ . '/menu-default.json'), true) ?: [];
            $menu = ['categories' => $default['categories'] ?? [], 'specials' => $default['specials']['items'] ?? []];
        }
        $prices = [];
        foreach ($menu['categories'] ?? [] as $cat) {
            foreach ($cat['items'] ?? [] as $item) {
                foreach ($item['prices'] ?? [] as $p) if ($p !== null) $prices[$cat['id']][] = round((float)$p, 2);
            }
        }
        foreach ($menu['specials'] ?? [] as $s) $prices['*specials'][] = round((float)$s['price'], 2);
    }
    if ($price <= 0) return false;
    foreach ([$category, '*specials'] as $k) if (in_array($price, $prices[$k] ?? [], true)) return true;
    return false;
}

function clean_application(array $data): array
{
    $app = clean_fields($data, [
        'jobId' => 40, 'jobTitle' => 160, 'name' => 120, 'email' => 200, 'phone' => 40,
        'message' => 5000, 'portfolio' => 400, 'coverLetter' => 10000,
    ], ['name', 'email', 'phone']);
    $app['answers'] = [];
    foreach (array_slice((array)($data['answers'] ?? []), 0, 30) as $a) {
        $app['answers'][] = ['label' => mb_substr((string)($a['label'] ?? ''), 0, 300), 'value' => mb_substr((string)($a['value'] ?? ''), 0, 3000)];
    }
    $cv = $data['cv'] ?? null;
    if (is_array($cv) && isset($cv['dataUrl'])) {
        if (!preg_match('#^data:([\w./+-]+);base64,#', (string)$cv['dataUrl'], $m)) throw new HttpError('CV invalide.', 422);
        $bytes = base64_decode(substr($cv['dataUrl'], strpos($cv['dataUrl'], ',') + 1), true);
        $types = ['application/pdf' => '%PDF', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => "PK\x03\x04"];
        if ($bytes === false || strlen($bytes) > 8 * 1024 * 1024 || !isset($types[$m[1]]) || !str_starts_with($bytes, $types[$m[1]])) {
            throw new HttpError('CV invalide : PDF ou DOCX de 8 Mo maximum.', 422);
        }
        $app['_cv'] = ['name' => mb_substr(basename((string)($cv['name'] ?? 'cv')), 0, 120), 'type' => $m[1], 'bytes' => $bytes];
    }
    return $app;
}

function clean_event(array $data): array
{
    $out = ['event' => mb_substr((string)($data['event'] ?? ''), 0, 40)];
    foreach ($data as $k => $v) {
        if ($k !== 'event' && count($out) < 8 && is_scalar($v)) $out[mb_substr((string)$k, 0, 30)] = is_string($v) ? mb_substr($v, 0, 80) : $v;
    }
    return $out;
}

function save_cv(string $id, array $cv): void
{
    $dir = data_dir() . '/cv';
    if (!is_dir($dir)) mkdir($dir, 0700, true);
    file_put_contents("$dir/$id", $cv['bytes']);
}

function cv_send(string $id): never
{
    require_tab('applications');
    $row = db_one("SELECT data FROM records WHERE collection = 'applications' AND id = ?", [$id]) ?? throw new HttpError('Introuvable.', 404);
    $cv = json_decode($row['data'], true)['cv'] ?? null;
    $file = data_dir() . '/cv/' . basename($id);
    if (!$cv || !is_file($file)) throw new HttpError('Introuvable.', 404);
    header('Content-Type: ' . $cv['type']);
    header('Content-Disposition: inline; filename="' . str_replace('"', '', $cv['name']) . '"');
    header('Cache-Control: private, no-store');
    header('X-Content-Type-Options: nosniff');
    readfile($file);
    exit;
}

// ---------------------------------------------------------------- bookings

function bookings_list(string $from): array
{
    $from = preg_match('/^\d{4}-\d{2}-\d{2}$/', $from) ? $from : gmdate('Y-m-d', time() - 86400);
    $staff = member_can('reservations');
    $sql = $staff ? 'SELECT * FROM bookings WHERE date >= ? - INTERVAL 60 DAY ORDER BY date, time' : 'SELECT * FROM bookings WHERE date >= ? ORDER BY date, time';
    $rows = db_all($sql, [$from]);
    // Visitors only learn which tables are taken, never who booked them.
    return array_map(fn($r) => $staff ? booking_out($r) : [
        'id' => $r['id'], 'date' => $r['date'], 'time' => $r['time'], 'tableId' => $r['table_id'], 'status' => $r['status'],
    ], $rows);
}

function booking_out(array $r): array
{
    return ['id' => $r['id'], 'createdAt' => iso($r['created_at']), 'date' => $r['date'], 'time' => $r['time'], 'tableId' => $r['table_id'], 'status' => $r['status']]
        + json_decode($r['data'], true);
}

function booking_create(mixed $in): array
{
    if (!is_array($in)) throw new HttpError('Requête invalide.', 422);
    $staff = member_can('reservations');
    if (!$staff) rate_limit('booking', 10, 600);
    $settings = config_get('reservation-settings') ?? [];
    if (!$staff && empty($settings['enabled'])) throw new HttpError('Les réservations sont fermées.', 403);

    $date = (string)($in['date'] ?? '');
    $time = (string)($in['time'] ?? '');
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) || !preg_match('/^\d{2}:\d{2}$/', $time)) throw new HttpError('Date ou heure invalide.', 422);
    $party = max(1, min((int)($settings['maxParty'] ?? 20), (int)($in['party'] ?? 0)));
    $highChairs = max(0, min(6, (int)($in['highChairs'] ?? 0)));
    $accessible = (bool)($in['accessible'] ?? false);
    $details = clean_fields($in, ['name' => 120, 'phone' => 40, 'email' => 200, 'occasion' => 120, 'notes' => 1000], ['name', 'phone']);
    $duration = (int)($settings['durationMinutes'] ?? 90);

    // One booking at a time, so two people can't get the same table.
    db_one("SELECT GET_LOCK('patatheque-bookings', 10) AS l");
    try {
        $busy = [];
        foreach (db_all("SELECT time, table_id FROM bookings WHERE date = ? AND status NOT IN ('annulee', 'absent')", [$date]) as $b) {
            if (abs(minutes($b['time']) - minutes($time)) < $duration) $busy[$b['table_id']] = true;
        }
        $tables = config_get('tables') ?? default_tables();
        $fits = array_filter($tables, fn($t) => ($t['active'] ?? true) && !isset($busy[$t['id']]) && $t['seats'] >= $party
            && ($highChairs === 0 || !empty($t['highChair'])) && (!$accessible || !empty($t['accessible'])));
        usort($fits, fn($a, $b) => $a['seats'] <=> $b['seats']);
        $table = $fits[0] ?? null;
        if (!$table) throw new HttpError('Plus de table libre à cette heure.', 409);

        $id = strtoupper(bin2hex(random_bytes(3)));
        $data = $details + ['party' => $party, 'highChairs' => $highChairs, 'accessible' => $accessible];
        db_run('INSERT INTO bookings (id, date, time, table_id, status, data, created_at) VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))',
            [$id, $date, $time, $table['id'], 'confirmee', json_encode($data, JSON_UNESCAPED_UNICODE)]);
    } finally {
        db_one("SELECT RELEASE_LOCK('patatheque-bookings') AS l");
    }
    return booking_out(db_one('SELECT * FROM bookings WHERE id = ?', [$id]));
}

function booking_update(string $id, mixed $patch): array
{
    require_tab('reservations');
    $status = (string)($patch['status'] ?? '');
    if (!in_array($status, ['confirmee', 'arrivee', 'terminee', 'annulee', 'absent'], true)) throw new HttpError('Statut invalide.', 422);
    db_run('UPDATE bookings SET status = ? WHERE id = ?', [$status, $id]);
    return ['ok' => true];
}

function minutes(string $t): int
{
    [$h, $m] = array_map('intval', explode(':', $t));
    return $h * 60 + $m;
}

/** Same starting tables as the site uses until the restaurant edits its own. */
function default_tables(): array
{
    $tables = [];
    for ($n = 1; $n <= 6; $n++) $tables[] = ['id' => "t$n", 'seats' => $n <= 2 ? 2 : 4, 'highChair' => true, 'accessible' => $n <= 4, 'active' => true];
    for ($n = 7; $n <= 8; $n++) $tables[] = ['id' => "t$n", 'seats' => 6, 'highChair' => true, 'accessible' => false, 'active' => true];
    return $tables;
}

// ---------------------------------------------------------------- auth and team

function auth_state(): array
{
    $m = current_member();
    if ($m) return ['member' => member_out($m)];
    return ['member' => null, 'needsSetup' => !db_one('SELECT id FROM members LIMIT 1')];
}

function auth_setup(mixed $in): array
{
    rate_limit('login', 10, 900);
    if (db_one('SELECT id FROM members LIMIT 1')) throw new HttpError('Le compte propriétaire existe déjà.', 409);
    $email = strtolower(trim((string)($in['email'] ?? '')));
    $name = trim((string)($in['name'] ?? '')) ?: 'Propriétaire';
    $password = (string)($in['password'] ?? '');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) throw new HttpError('Courriel invalide.', 422);
    if (strlen($password) < 8) throw new HttpError('Mot de passe : 8 caractères minimum.', 422);
    $id = 'owner';
    db_run('INSERT INTO members (id, name, email, employee_number, role, tabs, password_hash, active, owner, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?, 1, 1, UTC_TIMESTAMP())',
        [$id, mb_substr($name, 0, 120), $email, '100', 'proprietaire', password_hash($password, PASSWORD_DEFAULT)]);
    sign_in($id);
    return ['member' => member_out(current_member(true))];
}

function auth_login(mixed $in): array
{
    rate_limit('login', 10, 900);
    $login = strtolower(trim((string)($in['login'] ?? '')));
    $password = (string)($in['password'] ?? '');
    $m = str_contains($login, '@')
        ? db_one('SELECT * FROM members WHERE email = ?', [$login])
        : db_one('SELECT * FROM members WHERE employee_number = ?', [$login]);
    if (!$m || !$m['active'] || !password_verify($password, $m['password_hash'])) throw new HttpError('Identifiant ou mot de passe incorrect, ou accès désactivé.', 401);
    db_run('UPDATE members SET last_login = UTC_TIMESTAMP() WHERE id = ?', [$m['id']]);
    sign_in($m['id']);
    return ['member' => member_out(current_member(true))];
}

function auth_logout(): array
{
    start_session();
    $_SESSION = [];
    session_destroy();
    return ['ok' => true];
}

function team_list(): array
{
    $me = current_member() ?? throw new HttpError('Connexion requise.', 401);
    if (!$me['owner']) return [member_out($me)];
    return array_map('member_out', db_all('SELECT * FROM members ORDER BY owner DESC, created_at'));
}

function require_owner(): array
{
    $me = current_member() ?? throw new HttpError('Connexion requise.', 401);
    if (!$me['owner']) throw new HttpError('Réservé au propriétaire.', 403);
    return $me;
}

function team_add(mixed $in): array
{
    require_owner();
    $email = strtolower(trim((string)($in['email'] ?? '')));
    $number = trim((string)($in['employeeNumber'] ?? ''));
    $password = (string)($in['password'] ?? '');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) throw new HttpError('Courriel invalide.', 422);
    if (!preg_match('/^\d{1,8}$/', $number)) throw new HttpError("Numéro d'employé invalide.", 422);
    if (strlen($password) < 4) throw new HttpError('Mot de passe : 4 caractères minimum.', 422);
    if (db_one('SELECT id FROM members WHERE email = ?', [$email])) throw new HttpError('Ce courriel a déjà un accès.', 409);
    if (db_one('SELECT id FROM members WHERE employee_number = ?', [$number])) throw new HttpError("Le numéro $number est déjà utilisé.", 409);
    $id = bin2hex(random_bytes(4));
    db_run('INSERT INTO members (id, name, email, employee_number, role, tabs, password_hash, active, owner, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, UTC_TIMESTAMP())', [
        $id, mb_substr(trim((string)($in['name'] ?? '')), 0, 120), $email, $number, clean_role($in['role'] ?? ''),
        json_encode(clean_tabs($in['tabs'] ?? [])), password_hash($password, PASSWORD_DEFAULT),
    ]);
    return member_out(db_one('SELECT * FROM members WHERE id = ?', [$id]));
}

function team_update(string $id, mixed $in): array
{
    require_owner();
    $m = db_one('SELECT * FROM members WHERE id = ?', [$id]) ?? throw new HttpError('Introuvable.', 404);
    $sets = [];
    $args = [];
    if (array_key_exists('role', $in) && !$m['owner']) { $sets[] = 'role = ?'; $args[] = clean_role($in['role']); }
    if (array_key_exists('tabs', $in) && !$m['owner']) { $sets[] = 'tabs = ?'; $args[] = json_encode(clean_tabs($in['tabs'])); }
    if (array_key_exists('active', $in) && !$m['owner']) { $sets[] = 'active = ?'; $args[] = $in['active'] ? 1 : 0; }
    if (array_key_exists('name', $in)) { $sets[] = 'name = ?'; $args[] = mb_substr(trim((string)$in['name']), 0, 120); }
    if (array_key_exists('password', $in)) {
        if (strlen((string)$in['password']) < 4) throw new HttpError('Mot de passe : 4 caractères minimum.', 422);
        $sets[] = 'password_hash = ?';
        $args[] = password_hash((string)$in['password'], PASSWORD_DEFAULT);
    }
    if ($sets) db_run('UPDATE members SET ' . implode(', ', $sets) . ' WHERE id = ?', [...$args, $id]);
    return member_out(db_one('SELECT * FROM members WHERE id = ?', [$id]));
}

function team_remove(string $id): array
{
    require_owner();
    db_run('DELETE FROM members WHERE id = ? AND owner = 0', [$id]);
    return ['ok' => true];
}

const ROLE_TABS = [
    'proprietaire' => ['dashboard', 'orders', 'reservations', 'menu', 'hours', 'subscribers', 'applications', 'catering', 'content', 'settings', 'team'],
    'gerant' => ['dashboard', 'orders', 'reservations', 'menu', 'hours', 'applications', 'catering', 'settings'],
    'marketing' => ['dashboard', 'subscribers', 'content'],
    'comptoir' => ['orders', 'reservations'],
    'serveur' => ['orders', 'reservations'],
    'cuisine' => ['orders'],
];

function clean_role(mixed $role): string
{
    return isset(ROLE_TABS[$role]) && $role !== 'proprietaire' ? (string)$role : 'comptoir';
}

function clean_tabs(mixed $tabs): array
{
    return array_values(array_intersect((array)$tabs, array_diff(ROLE_TABS['proprietaire'], ['team'])));
}

function member_tabs(array $m): array
{
    if ($m['owner']) return ROLE_TABS['proprietaire'];
    $tabs = $m['tabs'] !== null ? json_decode($m['tabs'], true) : (ROLE_TABS[$m['role']] ?? []);
    return array_values(array_diff($tabs, ['team']));
}

function member_can(string ...$tabs): bool
{
    $m = current_member();
    return $m !== null && count(array_intersect($tabs, member_tabs($m))) > 0;
}

function require_tab(string ...$tabs): void
{
    if (!current_member()) throw new HttpError('Connexion requise.', 401);
    if (!member_can(...$tabs)) throw new HttpError('Accès refusé.', 403);
}

function member_out(array $m): array
{
    return [
        'id' => $m['id'],
        'name' => $m['name'],
        'email' => $m['email'],
        'employeeNumber' => $m['employee_number'],
        'role' => $m['role'],
        'tabs' => member_tabs($m),
        'active' => (bool)$m['active'],
        'owner' => (bool)$m['owner'],
        'createdAt' => iso($m['created_at']),
        'lastLogin' => $m['last_login'] ? iso($m['last_login']) : null,
        'passwordHash' => '',
    ];
}

// Last, so the constants above are defined before any request is handled.
try {
    route();
} catch (HttpError $e) {
    reply(['error' => $e->getMessage()], $e->status);
} catch (Throwable $e) {
    error_log('patatheque api: ' . $e);
    reply(['error' => 'Erreur du serveur.'], 500);
}
