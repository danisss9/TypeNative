<?php
/**
 * @var int    $status
 * @var string $errorTitle
 * @var string $errorText
 */
?>
<section class="error-page">
  <div class="container">
    <p class="error-code grad-text"><?= e($status) ?></p>
    <h1 class="error-title"><?= e($errorTitle) ?></h1>
    <p class="section-lede"><?= e($errorText) ?></p>
    <p class="error-actions">
      <a class="btn btn-primary" href="/"><?= icon('arrow') ?><span>Go to the home page</span></a>
    </p>
  </div>
</section>
