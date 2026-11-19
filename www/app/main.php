<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

// Apache hands its own 403/404s to this file (ErrorDocument) with
// REDIRECT_STATUS set; a front-controller rewrite arrives with 200.
$apacheError = (int) ($_SERVER['REDIRECT_STATUS'] ?? 200) >= 400;

[$template, $status] = match (true) {
    !in_array($method, ['GET', 'HEAD'], true) => ['error', 405],
    !$apacheError && in_array($path, ['/', '/index.php'], true) => ['home', 200],
    default => ['error', 404],
};

new Page($template, $status)->send();
