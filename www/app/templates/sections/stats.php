<?php
/** @var array $c */
?>
<section class="stats" aria-label="Results at a glance">
  <div class="container">
    <dl class="stats-grid">
      <?php foreach ($c['stats'] as [$value, $label, $source]): ?>
      <div class="stat">
        <dt><?= e($label) ?></dt>
        <dd class="stat-value grad-text"><?= e($value) ?></dd>
        <dd class="stat-source"><?= e($source) ?></dd>
      </div>
      <?php endforeach; ?>
    </dl>
  </div>
</section>
