<?php

declare(strict_types=1);

/** Escape a value for HTML text and attribute context. */
function e(string|int|float|null $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5, 'UTF-8');
}

/**
 * URL of a file under the web root with a content-hash query string, so it can
 * be cached for a year (assets/.htaccess) and still change on every upload.
 */
function asset(string $path, bool $absolute = false): string
{
    static $versions = [];

    $path = '/' . ltrim($path, '/');
    $versions[$path] ??= is_file(WEB_ROOT . $path)
        ? substr(hash_file('xxh3', WEB_ROOT . $path), 0, 10)
        : Site::VERSION;

    return ($absolute ? Site::URL : '') . $path . '?v=' . $versions[$path];
}

/** Render a template from app/templates with the given variables in scope. */
function view(string $name, array $vars = []): void
{
    extract($vars, EXTR_SKIP);
    require __DIR__ . '/templates/' . $name . '.php';
}

/** Highlighted, escaped HTML for a code sample. */
function code(string $source, string $lang): string
{
    return Highlighter::render($source, $lang);
}

/** An inline 24px stroke icon; decorative unless a label is given. */
function icon(string $name, string $label = '', string $class = ''): string
{
    $paths = ICONS[$name] ?? throw new InvalidArgumentException("Unknown icon {$name}");
    $a11y = $label === ''
        ? 'aria-hidden="true" focusable="false"'
        : 'role="img" aria-label="' . e($label) . '"';
    $classes = trim('icon ' . $class);

    return '<svg class="' . e($classes) . '" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" '
        . 'stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" ' . $a11y . '>' . $paths . '</svg>';
}

const ICONS = [
    'file' => '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
    'bolt' => '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    'gauge' => '<path d="M3.5 18a9 9 0 1 1 17 0"/><path d="m12 14 4.5-4.5"/><circle cx="12" cy="14" r="1"/>',
    'braces' => '<path d="M8 3H7a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1"/><path d="M16 3h1a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-1"/>',
    'plug' => '<path d="M9 2v6M15 2v6"/><path d="M6 8h12v4a6 6 0 0 1-12 0z"/><path d="M12 18v4"/>',
    'shield' => '<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    'sun' => '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    'moon' => '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    'menu' => '<path d="M4 7h16M4 12h16M4 17h16"/>',
    'close' => '<path d="M6 6l12 12M18 6 6 18"/>',
    'copy' => '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    'check' => '<path d="m5 12 5 5 9-10"/>',
    'star' => '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
    'arrow' => '<path d="M5 12h14M13 6l6 6-6 6"/>',
    'book' => '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20"/>',
    'package' => '<path d="M21 8 12 3 3 8l9 5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
    'terminal' => '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3M13 15h4"/>',
    'window' => '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M6.5 6.5h.01M9 6.5h.01"/>',
    'cpu' => '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    'loop' => '<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>',
];
