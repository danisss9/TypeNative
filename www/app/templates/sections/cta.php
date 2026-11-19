<?php
/** @var array $c */
?>
<section class="cta-band" aria-labelledby="cta-title">
  <div class="container">
    <div class="cta-inner">
      <h2 id="cta-title">Write TypeScript. Ship one file.</h2>
      <p>Free and open source under the MIT license.</p>
      <div class="cta-row">
        <?php view('partials/command', ['command' => $c['hero']['command']]); ?>
        <a class="btn btn-ghost" href="<?= e(Site::REPO) ?>"><?= icon('star') ?><span>Star on GitHub</span></a>
        <a class="btn btn-ghost" href="<?= e(Site::NPM) ?>"><?= icon('package') ?><span>View on npm</span></a>
      </div>
      <p class="cta-contact">
        Questions or ideas? Write to <a href="mailto:<?= e(Site::EMAIL) ?>"><?= e(Site::EMAIL) ?></a>.
      </p>
    </div>
  </div>
</section>
