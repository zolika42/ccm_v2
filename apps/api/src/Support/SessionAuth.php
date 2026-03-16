<?php

declare(strict_types=1);

/**
 * @fileoverview Session helper for login state and current authenticated customer lookup.
 */

namespace ColumbiaGames\Api\Support;

final class SessionAuth
{
    public static function login(array $customer, bool $rememberMe = false, ?string $browserId = null): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_regenerate_id(true);
        }

        $_SESSION['customer'] = [
            'customerid' => (int) ($customer['customerid'] ?? 0),
            'ship_email' => (string) ($customer['ship_email'] ?? ''),
            'ship_name' => (string) ($customer['ship_name'] ?? ''),
            'points' => (int) ($customer['points'] ?? 0),
            'remember_me' => $rememberMe,
            'browser_id' => $browserId,
        ];

        self::syncSessionCookie($rememberMe);
    }

    public static function refreshProfile(array $customer): void
    {
        if (!isset($_SESSION['customer']) || !is_array($_SESSION['customer'])) {
            return;
        }

        $_SESSION['customer']['customerid'] = (int) ($customer['customerid'] ?? 0);
        $_SESSION['customer']['ship_email'] = (string) ($customer['ship_email'] ?? '');
        $_SESSION['customer']['ship_name'] = (string) ($customer['ship_name'] ?? '');
        $_SESSION['customer']['points'] = (int) ($customer['points'] ?? 0);
    }

    public static function logout(): void
    {
        unset($_SESSION['customer']);
        self::syncSessionCookie(false, true);
    }

    public static function user(): ?array
    {
        return isset($_SESSION['customer']) && is_array($_SESSION['customer'])
            ? $_SESSION['customer']
            : null;
    }

    public static function persistenceMode(): string
    {
        return !empty($_SESSION['customer']['remember_me']) ? 'remembered-session' : 'session';
    }

    public static function browserId(): ?string
    {
        $value = $_SESSION['customer']['browser_id'] ?? null;
        return is_string($value) && trim($value) !== '' ? trim($value) : null;
    }

    private static function syncSessionCookie(bool $rememberMe, bool $expire = false): void
    {
        if (headers_sent() || session_status() !== PHP_SESSION_ACTIVE) {
            return;
        }

        $params = session_get_cookie_params();
        $lifetime = $expire
            ? time() - 3600
            : ($rememberMe ? time() + max(86400, (int) (getenv('AUTH_REMEMBER_ME_LIFETIME') ?: (60 * 60 * 24 * 30))) : 0);

        setcookie(session_name(), session_id(), [
            'expires' => $lifetime,
            'path' => $params['path'] ?: '/',
            'domain' => $params['domain'] ?: '',
            'secure' => (bool) ($params['secure'] ?? false),
            'httponly' => (bool) ($params['httponly'] ?? true),
            'samesite' => $params['samesite'] ?? 'Lax',
        ]);
    }
}
