<?php

declare(strict_types=1);

/** Site-wide settings. Bump VERSION on each TypeNative release. */
final class Site
{
    public const string URL = 'https://typenative.dev';
    public const string NAME = 'TypeNative';
    public const string VERSION = '0.7.2';
    public const string AUTHOR = 'Dani Santos';
    public const string EMAIL = 'info@typenative.dev';

    public const string REPO = 'https://github.com/danisss9/TypeNative';
    public const string NPM = 'https://www.npmjs.com/package/typenative';

    /** A file or folder in the repository on GitHub, e.g. repo('docs/cli.md'). */
    public static function repo(string $path = ''): string
    {
        if ($path === '') {
            return self::REPO;
        }
        $kind = str_ends_with($path, '/') ? 'tree' : 'blob';

        return self::REPO . "/{$kind}/main/" . rtrim($path, '/');
    }
}
