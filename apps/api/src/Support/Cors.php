<?php

declare(strict_types=1);

/**
 * @fileoverview Central CORS policy helper for API requests and preflight handling.
 */

namespace ColumbiaGames\Api\Support;

final class Cors
{
    public static function apply(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if ($origin === '') {
            return;
        }

        $allowedOrigins = array_values(array_filter(array_map(
            static fn (string $value): string => trim($value),
            explode(',', getenv('CORS_ALLOWED_ORIGINS') ?: 'http://localhost:5173,http://127.0.0.1:5173')
        )));

        $allowDdev = filter_var(getenv('CORS_ALLOW_DDEV') ?: 'true', FILTER_VALIDATE_BOOL);

        $isAllowed = in_array($origin, $allowedOrigins, true)
            || ($allowDdev && (bool) preg_match('#^https?://[A-Za-z0-9.-]+\.ddev\.site(?::\d+)?$#', $origin));

        if (!$isAllowed) {
            return;
        }

        header("Access-Control-Allow-Origin: {$origin}");
        header('Vary: Origin');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
        header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
    }

    public static function maybeHandlePreflight(): void
    {
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'OPTIONS') {
            return;
        }

        self::apply();
        http_response_code(204);
        exit;
    }
}
