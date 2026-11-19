<?php
/** @var array $c */
?>
<footer class="site-footer">
  <div class="container footer-inner">
    <div class="footer-brand">
      <a class="brand" href="/">
        <img src="<?= e(asset('assets/img/logo.svg')) ?>" width="24" height="24" alt="">
        <span><?= e(Site::NAME) ?></span>
      </a>
      <p>Write TypeScript, ship native binaries.</p>
    </div>
    <nav aria-label="Footer">
      <ul class="footer-links">
        <?php foreach ($c['footerLinks'] as [$href, $label]): ?>
        <li><a href="<?= e($href) ?>"><?= e($label) ?></a></li>
        <?php endforeach; ?>
      </ul>
    </nav>
    <p class="footer-meta">
      © <?= date('Y') ?> <?= e(Site::AUTHOR) ?> · Released under the MIT license · v<?= e(Site::VERSION) ?>
    </p>
  </div>
</footer>
