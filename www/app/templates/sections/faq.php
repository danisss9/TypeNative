<?php
/** @var array $c  answers are trusted HTML from content.php */
?>
<section class="section" id="faq" aria-labelledby="faq-title">
  <div class="container faq-wrap">
    <header class="section-head">
      <p class="eyebrow">FAQ</p>
      <h2 id="faq-title">Questions, answered</h2>
    </header>
    <div class="faq-list">
      <?php foreach ($c['faq'] as [$question, $answer]): ?>
      <details class="faq">
        <summary><?= e($question) ?></summary>
        <div class="faq-body"><p><?= $answer ?></p></div>
      </details>
      <?php endforeach; ?>
    </div>
  </div>
</section>
