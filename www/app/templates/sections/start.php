<?php
/** @var array $c  step texts are trusted HTML from content.php */
?>
<section class="section section-alt" id="start" aria-labelledby="start-title">
  <div class="container">
    <header class="section-head">
      <p class="eyebrow">Get started</p>
      <h2 id="start-title">Your first binary in a minute</h2>
      <p class="section-lede"><?= e($c['requirements']) ?></p>
    </header>

    <ol class="start-steps">
      <?php foreach ($c['startSteps'] as $i => [$title, $text, $command]): ?>
      <li class="card start-step">
        <span class="step-num" aria-hidden="true"><?= $i + 1 ?></span>
        <h3><?= e($title) ?></h3>
        <p><?= $text ?></p>
        <?php view('partials/command', ['command' => $command]); ?>
      </li>
      <?php endforeach; ?>
    </ol>

    <h3 class="docs-title">Read the docs</h3>
    <ul class="docs-grid">
      <?php foreach ($c['docs'] as [$path, $title, $text]): ?>
      <li>
        <a class="doc-link" href="<?= e(Site::repo($path)) ?>">
          <?= icon('book') ?>
          <span><strong><?= e($title) ?></strong><span><?= e($text) ?></span></span>
        </a>
      </li>
      <?php endforeach; ?>
    </ul>
  </div>
</section>
