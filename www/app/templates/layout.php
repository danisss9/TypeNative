<?php
/**
 * @var array  $c          content.php
 * @var string $template   'home' or 'error'
 * @var bool   $isHome
 * @var string $errorTitle
 */

$meta = $c['meta'];
$title = $isHome ? $meta['title'] : $errorTitle . ' · ' . Site::NAME;
$jsonLd = [
    '@context' => 'https://schema.org',
    '@type' => 'SoftwareApplication',
    'name' => Site::NAME,
    'description' => $meta['description'],
    'url' => Site::URL . '/',
    'applicationCategory' => 'DeveloperApplication',
    'operatingSystem' => 'Windows, macOS, Linux',
    'softwareVersion' => Site::VERSION,
    'license' => 'https://opensource.org/licenses/MIT',
    'downloadUrl' => Site::NPM,
    'sameAs' => [Site::REPO, Site::NPM],
    'author' => ['@type' => 'Person', 'name' => Site::AUTHOR],
    'offers' => ['@type' => 'Offer', 'price' => '0', 'priceCurrency' => 'USD'],
];
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e($title) ?></title>
<script><?= Page::THEME_SCRIPT ?></script>
<?php if ($isHome): ?>
<meta name="description" content="<?= e($meta['description']) ?>">
<link rel="canonical" href="<?= e(Site::URL) ?>/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="<?= e(Site::NAME) ?>">
<meta property="og:title" content="<?= e($meta['title']) ?>">
<meta property="og:description" content="<?= e($meta['description']) ?>">
<meta property="og:url" content="<?= e(Site::URL) ?>/">
<meta property="og:image" content="<?= e(asset('assets/img/og-image.png', absolute: true)) ?>">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="TypeNative: write TypeScript, ship native binaries">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json"><?= json_encode($jsonLd, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_THROW_ON_ERROR) ?></script>
<?php else: ?>
<meta name="robots" content="noindex">
<?php endif; ?>
<meta name="color-scheme" content="dark light">
<meta name="theme-color" content="#0b0e14" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#f6f7f9" media="(prefers-color-scheme: light)">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="<?= e(asset('assets/css/site.css')) ?>">
<script src="<?= e(asset('assets/js/site.js')) ?>" defer></script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<?php view('partials/header', ['c' => $c, 'base' => $isHome ? '' : '/']); ?>
<main id="main">
<?php view($template, get_defined_vars()); ?>
</main>
<?php view('partials/footer', ['c' => $c]); ?>
<p class="sr-only" aria-live="polite" data-live></p>
</body>
</html>
