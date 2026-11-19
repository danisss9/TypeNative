<?php
/** @var array $c */

foreach (['hero', 'stats', 'features', 'how', 'benchmarks', 'showcase', 'apis', 'start', 'faq', 'cta'] as $section) {
    view('sections/' . $section, ['c' => $c]);
}
