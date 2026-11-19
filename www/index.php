<?php

// Front controller for typenative.dev.
//
// This file must stay free of PHP 8.4-only syntax: it is the one file an older
// engine can still parse, so it can explain the problem instead of failing with
// a blank 500 when the hosting runs the wrong PHP version.

declare(strict_types=1);

if (PHP_VERSION_ID < 80400) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo "This site needs PHP 8.4 or newer.\n"
        . "On OVH, set app.engine.version=8.4 and container.image=stable64 in .ovhconfig.\n";
    exit;
}

require __DIR__ . '/app/main.php';
