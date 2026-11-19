<?php
/** @var array $c */
$hero = $c['hero'];
?>
<section class="hero" aria-labelledby="hero-title">
  <div class="container hero-grid">
    <div class="hero-copy">
      <a class="pill" href="<?= e(Site::repo('CHANGELOG.md')) ?>">
        <span class="pill-dot" aria-hidden="true"></span>
        v<?= e(Site::VERSION) ?> · MIT licensed · open source
      </a>
      <h1 id="hero-title">
        <span><?= e($hero['title'][0]) ?></span>
        <span class="grad-text"><?= e($hero['title'][1]) ?></span>
      </h1>
      <p class="lede"><?= e($hero['lede']) ?></p>

      <div class="cta-row">
        <?php view('partials/command', ['command' => $hero['command']]); ?>
        <a class="btn btn-primary" href="#start"><span>Get started</span><?= icon('arrow') ?></a>
        <a class="btn btn-ghost" href="<?= e(Site::REPO) ?>"><?= icon('star') ?><span>Star on GitHub</span></a>
      </div>

      <p class="hero-note">
        <?= e($hero['note']) ?>
        <a href="<?= e(Site::repo('conformance.md')) ?>">See what compiles today</a>.
      </p>
    </div>

    <div class="hero-demo">
      <div class="window">
        <div class="window-bar">
          <span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>
          <div class="tabs" role="tablist" aria-label="From TypeScript to a native binary">
            <?php foreach ($hero['tabs'] as $i => $tab): ?>
            <button class="tab" type="button" role="tab" id="tab-<?= e($tab['id']) ?>"
                    aria-controls="panel-<?= e($tab['id']) ?>" aria-selected="<?= $i === 0 ? 'true' : 'false' ?>"
                    tabindex="<?= $i === 0 ? '0' : '-1' ?>"><?= e($tab['label']) ?></button>
            <?php endforeach; ?>
          </div>
        </div>
        <?php foreach ($hero['tabs'] as $tab): ?>
        <div class="tabpanel" role="tabpanel" id="panel-<?= e($tab['id']) ?>" aria-labelledby="tab-<?= e($tab['id']) ?>" tabindex="0">
          <p class="panel-label"><?= e($tab['label']) ?></p>
          <pre><code><?= code($tab['code'], $tab['lang']) ?></code></pre>
        </div>
        <?php endforeach; ?>
      </div>
      <p class="caption"><?= e($hero['caption']) ?></p>
    </div>
  </div>
</section>
