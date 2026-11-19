<?php
/**
 * @var array  $c
 * @var string $base '' on the home page, '/' elsewhere so anchors lead home
 */
?>
<header class="site-header">
  <div class="container header-inner">
    <a class="brand" href="/" aria-label="<?= e(Site::NAME) ?> home">
      <img src="<?= e(asset('assets/img/logo.svg')) ?>" width="28" height="28" alt="">
      <span><?= e(Site::NAME) ?></span>
    </a>

    <nav class="site-nav" id="site-nav" aria-label="Main">
      <ul>
        <?php foreach ($c['nav'] as [$href, $label]): ?>
        <li><a href="<?= e($base . $href) ?>"><?= e($label) ?></a></li>
        <?php endforeach; ?>
      </ul>
    </nav>

    <div class="header-actions">
      <a class="btn btn-ghost btn-sm header-gh" href="<?= e(Site::REPO) ?>">
        <?= icon('star') ?><span>GitHub</span>
      </a>
      <button class="icon-btn theme-toggle" type="button" data-theme-toggle aria-label="Switch theme">
        <?= icon('sun', class: 'icon-sun') ?><?= icon('moon', class: 'icon-moon') ?>
      </button>
      <button class="icon-btn nav-toggle" type="button" aria-controls="site-nav" aria-expanded="false" aria-label="Open menu">
        <?= icon('menu', class: 'icon-menu') ?><?= icon('close', class: 'icon-close') ?>
      </button>
    </div>
  </div>
</header>
