<?php

declare(strict_types=1);

/**
 * One row of the results table in examples/README.md.
 *
 * The ratio is stored exactly as published: it was computed from unrounded
 * medians, so dividing the rounded figures shown here can be off by 0.1.
 */
final class Benchmark
{
    public function __construct(
        public private(set) string $example,
        public private(set) string $measures,
        public private(set) string $node,
        public private(set) string $native,
        public private(set) float $ratio,
    ) {}

    /** The published ratio for display, e.g. "11.3×". */
    public string $label {
        get => number_format($this->ratio, 1) . '×';
    }

    /** The example's folder on GitHub, where its README has the methodology. */
    public string $url {
        get => Site::repo("examples/{$this->example}/");
    }

    /** Bar length as a percentage of a scale that runs from 0× to $max×. */
    public function percentOf(float $max): string
    {
        return number_format(100 * min($this->ratio, $max) / $max, 2, '.', '') . '%';
    }
}
