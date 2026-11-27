<?php
/** @var array $c */

/** @var Benchmark[] $rows */
$rows = $c['benchmarks'];
$max = $c['benchmarkScaleMax'];
$x = static fn (float $ratio): string => number_format(100 * $ratio / $max, 2, '.', '') . '%';

// Bars are SVG rects sized in attributes (not inline styles) so the CSP can
// forbid style attributes. Each bar is a rounded rect plus a square cap over
// its first few pixels: rounded at the data end, square at the baseline.
?>
<section class="section" id="benchmarks" aria-labelledby="benchmarks-title">
  <div class="container">
    <header class="section-head">
      <p class="eyebrow">Benchmarks</p>
      <h2 id="benchmarks-title">Measured, not promised</h2>
      <p class="section-lede">
        Every example runs unchanged under Node.js and as a TypeNative binary, and ships the
        <code>bench.mjs</code> harness that produced its numbers.
      </p>
    </header>

    <figure class="card chart">
      <figcaption class="chart-head">
        <span class="chart-title">Times faster than Node.js</span>
        <span class="chart-sub">Median per example · higher is better · Node.js = 1×</span>
      </figcaption>

      <ol class="bench-list">
        <?php foreach ($rows as $row): ?>
        <li class="bench-row">
          <div class="bench-label">
            <a href="<?= e($row->url) ?>"><?= e($row->example) ?></a>
            <span class="bench-meta">
              <span class="sr-only"><?= e($row->label) ?> faster: </span><?= e($row->measures) ?> · <?= e($row->native) ?> vs <?= e($row->node) ?> in Node
            </span>
          </div>
          <div class="bench-plot">
            <svg class="bench-svg" aria-hidden="true" focusable="false">
              <line class="grid" x1="<?= $x(5) ?>" x2="<?= $x(5) ?>" y1="0" y2="100%"/>
              <line class="grid" x1="<?= $x(10) ?>" x2="<?= $x(10) ?>" y1="0" y2="100%"/>
              <rect class="bar" x="0" y="50%" width="<?= $row->percentOf($max) ?>" height="18" rx="4" transform="translate(0 -9)"/>
              <rect class="bar" x="0" y="50%" width="6" height="18" transform="translate(0 -9)"/>
              <line class="ref" x1="<?= $x(1) ?>" x2="<?= $x(1) ?>" y1="0" y2="100%"/>
              <text class="bench-value" x="<?= $row->percentOf($max) ?>" dx="8" y="50%" dy="0.35em"><?= e($row->label) ?></text>
            </svg>
          </div>
        </li>
        <?php endforeach; ?>
      </ol>

      <div class="bench-axis" aria-hidden="true">
        <span></span>
        <div class="bench-plot">
          <svg class="bench-svg">
            <text class="tick" x="0" y="16">0</text>
            <text class="tick tick-ref" x="<?= $x(1) ?>" y="16" text-anchor="middle">Node</text>
            <text class="tick" x="<?= $x(5) ?>" y="16" text-anchor="middle">5×</text>
            <text class="tick" x="<?= $x(10) ?>" y="16" text-anchor="middle">10×</text>
          </svg>
        </div>
      </div>
    </figure>

    <details class="bench-table">
      <summary>Show the numbers as a table</summary>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Example</th>
              <th scope="col">Measures</th>
              <th scope="col" class="num">Node.js</th>
              <th scope="col" class="num">TypeNative</th>
              <th scope="col" class="num">Result</th>
            </tr>
          </thead>
          <tbody>
            <?php foreach ($rows as $row): ?>
            <tr>
              <th scope="row"><a href="<?= e($row->url) ?>"><?= e($row->example) ?></a></th>
              <td><?= e($row->measures) ?></td>
              <td class="num"><?= e($row->node) ?></td>
              <td class="num"><?= e($row->native) ?></td>
              <td class="num"><?= e($row->label) ?></td>
            </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    </details>

    <p class="footnote">
      <?= e($c['benchmarkEnv']) ?>
      json-server compares requests per second, so higher is better there too.
      Float-heavy (mandelbrot-png) and network-bound (openai-chat) work runs close to Node’s speed;
      in tsc, cold startup is 12.9× faster while full type-checking is slower than V8 (warm incremental rebuilds are within 1.6×–1.8×).
      <a href="<?= e(Site::repo('examples/')) ?>">Methodology and harnesses</a>.
    </p>
  </div>
</section>
