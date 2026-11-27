<?php
/** @var array $c  package texts are trusted HTML from content.php */
?>
<section class="section section-alt" id="showcase" aria-labelledby="showcase-title">
  <div class="container">
    <header class="section-head">
      <p class="eyebrow">Showcase</p>
      <h2 id="showcase-title">Real packages, native binaries</h2>
      <p class="section-lede">
        TypeNative resolves npm packages from <code>node_modules</code> and compiles them into your program.
        These six produce byte-for-byte the same output as Node on their own test suites.
      </p>
    </header>

    <ul class="showcase-grid">
      <?php foreach ($c['showcase'] as $pkg): ?>
      <li class="card pkg">
        <h3><code><?= e($pkg['name']) ?></code></h3>
        <p><?= $pkg['text'] ?></p>
        <dl class="pkg-stats">
          <div>
            <dt><?= e($pkg['parity'][1]) ?></dt>
            <dd><?= e($pkg['parity'][0]) ?></dd>
          </div>
          <div>
            <dt><?= e($pkg['speed'][1]) ?></dt>
            <dd><?= e($pkg['speed'][0]) ?></dd>
          </div>
        </dl>
        <a class="card-link" href="<?= e(Site::repo('examples/' . $pkg['example'] . '/')) ?>">
          examples/<?= e($pkg['example']) ?><?= icon('arrow') ?>
        </a>
      </li>
      <?php endforeach; ?>
    </ul>

    <div class="showcase-extra">
      <figure class="card mandel">
        <img src="<?= e(asset('assets/img/mandelbrot.png')) ?>" width="640" height="360" loading="lazy" decoding="async"
             alt="The black Mandelbrot set with glowing orange edges on a sky-blue gradient, rendered by the mandelbrot-png example">
        <figcaption>
          <strong>mandelbrot-png</strong> rendered this image and encoded the PNG by hand on
          <code>node:zlib</code>, with no image library.
          <a href="<?= e(Site::repo('examples/mandelbrot-png/')) ?>">See the source</a>.
        </figcaption>
      </figure>
      <div class="card selfhost">
        <span class="feature-icon"><?= icon('loop') ?></span>
        <h3>It compiles itself</h3>
        <p><?= $c['selfHost'] ?></p>
        <a class="card-link" href="<?= e(Site::repo('docs/architecture.md')) ?>">How self-hosting works<?= icon('arrow') ?></a>
      </div>
    </div>
  </div>
</section>
