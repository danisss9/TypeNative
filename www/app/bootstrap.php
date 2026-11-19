<?php

declare(strict_types=1);

// OVH displays PHP errors on the page for PHP >= 7.1 even with
// environment=production, so the site switches display off itself and logs
// instead (the logs are in the OVH control panel).
ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);
date_default_timezone_set('UTC');

/** Absolute path of the web root (the folder holding index.php). */
const WEB_ROOT = __DIR__ . '/..';

require __DIR__ . '/config.php';
require __DIR__ . '/helpers.php';
require __DIR__ . '/Highlighter.php';
require __DIR__ . '/Benchmark.php';
require __DIR__ . '/Page.php';
