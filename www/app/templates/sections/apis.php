<?php
/** @var array $c */
$go = $c['goSample'];
$gui = $c['guiSample'];
?>
<section class="section" id="apis" aria-labelledby="apis-title">
  <div class="container">
    <header class="section-head">
      <p class="eyebrow">Batteries included</p>
      <h2 id="apis-title">The APIs you already use</h2>
      <p class="section-lede">
        Node’s modules keep Node’s signatures, Web APIs behave like the browser’s,
        and Go’s whole ecosystem is an import away.
      </p>
    </header>

    <div class="api-grid">
      <div class="card api-group">
        <h3>Language</h3>
        <ul class="chips">
          <?php foreach ($c['language'] as $item): ?>
          <li class="chip"><?= e($item) ?></li>
          <?php endforeach; ?>
        </ul>
      </div>
      <div class="card api-group">
        <h3>Web APIs</h3>
        <ul class="chips">
          <?php foreach ($c['webApis'] as $item): ?>
          <li class="chip"><?= e($item) ?></li>
          <?php endforeach; ?>
        </ul>
      </div>
      <div class="card api-group api-node">
        <h3>Node.js modules <small>node:*</small></h3>
        <ul class="chips">
          <?php foreach ($c['nodeModules'] as $item): ?>
          <li class="chip"><?= e($item) ?></li>
          <?php endforeach; ?>
        </ul>
        <p class="api-note"><?= e($c['unsupported']) ?></p>
      </div>
    </div>

    <div class="sample-grid">
      <article class="card sample">
        <span class="feature-icon"><?= icon('plug') ?></span>
        <h3><?= e($go['title']) ?></h3>
        <p><?= e($go['text']) ?></p>
        <pre class="code-block"><code><?= code($go['code'], 'ts') ?></code></pre>
        <pre class="code-block code-out" aria-label="Output"><code><?= e($go['output']) ?></code></pre>
      </article>
      <article class="card sample">
        <span class="feature-icon"><?= icon('window') ?></span>
        <h3><?= e($gui['title']) ?></h3>
        <p><?= e($gui['text']) ?></p>
        <pre class="code-block"><code><?= code($gui['code'], 'ts') ?></code></pre>
        <pre class="code-block code-out"><code><?= code($gui['command'], 'sh') ?></code></pre>
      </article>
    </div>
  </div>
</section>
