<?php

declare(strict_types=1);

/** Renders a template inside the layout and sends it with the site's headers. */
final class Page
{
    /**
     * Runs in <head> before first paint: flags that JS is available and restores
     * a theme the visitor picked earlier. Allowed by its hash in the CSP, so it
     * must be printed byte for byte as written here.
     */
    public const string THEME_SCRIPT = "(()=>{const d=document.documentElement;d.classList.add('js');"
        . "try{const t=localStorage.getItem('tn-theme');if(t==='light'||t==='dark')d.dataset.theme=t}catch{}})();";

    private const array STATUS_TEXT = [
        404 => ['Page not found', 'There is nothing at this address. The whole site is one page.'],
        405 => ['Method not allowed', 'This site only answers GET and HEAD requests.'],
    ];

    public function __construct(
        private readonly string $template,
        private readonly int $status = 200,
    ) {}

    public function send(): void
    {
        $html = $this->render();

        http_response_code($this->status);
        header_remove('X-Powered-By');
        header('Content-Type: text/html; charset=utf-8');
        header('Cache-Control: no-cache');
        header('Content-Security-Policy: ' . self::contentSecurityPolicy());
        if ($this->status === 405) {
            header('Allow: GET, HEAD');
        }

        echo $html;
    }

    private function render(): string
    {
        $content = require __DIR__ . '/content.php';
        [$errorTitle, $errorText] = self::STATUS_TEXT[$this->status] ?? ['', ''];

        ob_start();
        try {
            view('layout', [
                'c' => $content,
                'template' => $this->template,
                'status' => $this->status,
                'errorTitle' => $errorTitle,
                'errorText' => $errorText,
                'isHome' => $this->template === 'home',
            ]);

            return (string) ob_get_contents();
        } finally {
            ob_end_clean();
        }
    }

    public static function contentSecurityPolicy(): string
    {
        $hash = base64_encode(hash('sha256', self::THEME_SCRIPT, true));

        return implode('; ', [
            "default-src 'self'",
            "script-src 'self' 'sha256-{$hash}'",
            "style-src 'self'",
            "img-src 'self' data:",
            "font-src 'self'",
            "connect-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'none'",
            "frame-ancestors 'none'",
            'upgrade-insecure-requests',
        ]);
    }
}
