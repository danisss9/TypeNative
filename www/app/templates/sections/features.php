<?php
/** @var array $c  feature texts are trusted HTML from content.php */
?>
<section class="section" id="features" aria-labelledby="features-title">
  <div class="container">
    <header class="section-head">
      <p class="eyebrow">Why TypeNative</p>
      <h2 id="features-title">The TypeScript you know, without the runtime</h2>
      <p class="section-lede">
        Write the TypeScript you already run under Node. TypeNative turns it into a native program
        that starts in milliseconds and ships as a single file.
      </p>
    </header>
    <ul class="feature-grid">
      <?php foreach ($c['features'] as [$iconName, $title, $html]): ?>
      <li class="card feature">
        <span class="feature-icon"><?= icon($iconName) ?></span>
        <h3><?= e($title) ?></h3>
        <p><?= $html ?></p>
      </li>
      <?php endforeach; ?>
    </ul>
  </div>
</section>
