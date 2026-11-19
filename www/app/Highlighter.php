<?php

declare(strict_types=1);

/**
 * A small syntax highlighter for the page's own code samples (TypeScript, Go
 * and shell transcripts). Output is escaped HTML with <span class="tok-*">
 * wrappers; anything it doesn't recognise is passed through as plain text.
 */
final class Highlighter
{
    private const array KEYWORDS = [
        'ts' => [
            'as', 'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'default',
            'else', 'export', 'extends', 'false', 'for', 'from', 'function', 'if', 'implements',
            'import', 'in', 'interface', 'let', 'new', 'null', 'of', 'return', 'switch', 'this',
            'throw', 'true', 'try', 'type', 'undefined', 'while',
        ],
        'go' => [
            'break', 'case', 'chan', 'const', 'continue', 'default', 'defer', 'else', 'false', 'for',
            'func', 'go', 'if', 'import', 'interface', 'map', 'nil', 'package', 'range', 'return',
            'select', 'struct', 'switch', 'true', 'type', 'var',
        ],
    ];

    /** Go's predeclared types read as types even though they're lower-case. */
    private const array GO_TYPES = ['any', 'bool', 'byte', 'error', 'float64', 'int', 'int64', 'rune', 'string', 'uint8'];

    private const string SOURCE_PATTERN = <<<'RE'
        ~(?<comment>//[^\n]*|/\*.*?\*/)
        |(?<string>'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`)
        |(?<number>\b\d[\d_]*(?:\.\d+)?\b)
        |(?<word>[A-Za-z_$][\w$]*)(?<call>(?=\())?
        |(?<other>[^A-Za-z_$\d'"`/]+|.)
        ~sx
        RE;

    public static function render(string $code, string $lang): string
    {
        return match ($lang) {
            'ts', 'go' => self::source(rtrim($code), $lang),
            'sh' => self::shell(rtrim($code)),
            default => e($code),
        };
    }

    private static function source(string $code, string $lang): string
    {
        $keywords = self::KEYWORDS[$lang];

        return preg_replace_callback(
            self::SOURCE_PATTERN,
            static function (array $m) use ($keywords, $lang): string {
                if ($m['word'] !== null) {
                    $word = $m['word'];
                    $class = match (true) {
                        in_array($word, $keywords, true) => 'key',
                        $lang === 'go' && in_array($word, self::GO_TYPES, true) => 'type',
                        $m['call'] !== null => 'fn',
                        ctype_upper($word[0]) => 'type',
                        default => null,
                    };

                    return $class === null ? e($word) : self::wrap($class, $word);
                }

                return match (true) {
                    $m['comment'] !== null => self::wrap('com', $m['comment']),
                    $m['string'] !== null => self::wrap('str', $m['string']),
                    $m['number'] !== null => self::wrap('num', $m['number']),
                    default => e($m['other'] ?? ''),
                };
            },
            $code,
            flags: PREG_UNMATCHED_AS_NULL,
        ) ?? e($code);
    }

    /** "$ command --flag value" lines are commands; every other line is output. */
    private static function shell(string $code): string
    {
        $lines = array_map(static function (string $line): string {
            if (!str_starts_with($line, '$ ')) {
                return $line === '' ? '' : self::wrap('out', $line);
            }

            $command = substr($line, 2);
            $comment = '';
            if (preg_match('/\s#.*$/', $command, $m, PREG_OFFSET_CAPTURE)) {
                $comment = self::wrap('com', $m[0][0]);
                $command = substr($command, 0, $m[0][1]);
            }

            $html = '';
            $first = true;
            foreach (preg_split('/(\s+)/', $command, -1, PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY) as $part) {
                if (ctype_space($part)) {
                    $html .= $part;
                    continue;
                }
                $html .= match (true) {
                    $first => self::wrap('fn', $part),
                    str_starts_with($part, '-') => self::wrap('key', $part),
                    str_starts_with($part, "'") || str_starts_with($part, '"') => self::wrap('str', $part),
                    default => e($part),
                };
                $first = false;
            }

            return self::wrap('prompt', '$') . ' ' . $html . $comment;
        }, explode("\n", $code));

        return implode("\n", $lines);
    }

    private static function wrap(string $class, string $text): string
    {
        return '<span class="tok-' . $class . '">' . e($text) . '</span>';
    }
}
