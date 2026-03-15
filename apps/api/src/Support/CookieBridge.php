<?php

declare(strict_types=1);

/**
 * @fileoverview Legacy cookie bridge for browser identity and cart/session continuity.
 */

namespace ColumbiaGames\Api\Support;

final class CookieBridge
{
    public static function cookieName(): string
    {
        return trim((string) (getenv('BID_CG_COOKIE_NAME') ?: 'bid-cg')) ?: 'bid-cg';
    }

    public static function currentBrowserId(): ?string
    {
        $value = $_COOKIE[self::cookieName()] ?? null;
        if (!is_string($value)) {
            return null;
        }

        $value = trim($value);
        return $value !== '' ? $value : null;
    }

    public static function persistBrowserId(string $browserId): void
    {
        $secure = filter_var(getenv('SESSION_SECURE') ?: 'false', FILTER_VALIDATE_BOOL);
        $domain = trim((string) (getenv('BID_CG_COOKIE_DOMAIN') ?: ''));
        $lifetimeSeconds = max(86400, (int) (getenv('BID_CG_COOKIE_LIFETIME') ?: (60 * 60 * 24 * 365)));
        $expires = time() + $lifetimeSeconds;

        $options = [
            'expires' => $expires,
            'path' => '/',
            'httponly' => false,
            'secure' => $secure,
            'samesite' => 'Lax',
        ];

        if ($domain !== '') {
            $options['domain'] = $domain;
        }

        setcookie(self::cookieName(), $browserId, $options);
        $_COOKIE[self::cookieName()] = $browserId;
    }
}
