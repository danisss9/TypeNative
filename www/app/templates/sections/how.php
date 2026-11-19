<?php
/** @var array $c */
?>
<section class="section section-alt" id="how" aria-labelledby="how-title">
  <div class="container">
    <header class="section-head">
      <p class="eyebrow">How it works</p>
      <h2 id="how-title">From <code class="h-code">.ts</code> to a binary in one command</h2>
      <p class="section-lede">
        TypeNative drives the TypeScript compiler and the Go toolchain for you.
        Add <code>--emit-go</code> to keep the generated Go and read every step.
      </p>
    </header>

    <ol class="pipeline">
      <?php foreach ($c['steps'] as [$tag, $title, $text]): ?>
      <li class="card step">
        <span class="step-tag"><?= e($tag) ?></span>
        <h3><?= e($title) ?></h3>
        <p><?= e($text) ?></p>
      </li>
      <?php endforeach; ?>
    </ol>

    <div class="card targets">
      <div>
        <h3>Cross-compile from any OS</h3>
        <p>No C toolchain and no target machine needed: pick an OS and CPU and build.</p>
      </div>
      <ul class="chips" aria-label="Example targets">
        <?php foreach ($c['targets'] as $target): ?>
        <li class="chip"><?= e($target) ?></li>
        <?php endforeach; ?>
      </ul>
      <pre class="cmd-block"><code><?= code($c['crossCompile'], 'sh') ?></code></pre>
    </div>
  </div>
</section>
