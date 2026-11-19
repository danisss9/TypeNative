<?php
/** @var string $command a shell command, shown with a prompt and a copy button */
?>
<div class="cmd">
  <code><span class="tok-prompt" aria-hidden="true">$ </span><?= e($command) ?></code>
  <button class="copy-btn" type="button" data-copy="<?= e($command) ?>" aria-label="Copy command: <?= e($command) ?>">
    <?= icon('copy', class: 'icon-copy') ?><?= icon('check', class: 'icon-check') ?>
  </button>
</div>
