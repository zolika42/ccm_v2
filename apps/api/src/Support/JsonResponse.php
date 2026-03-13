<?php

declare(strict_types=1);

namespace ColumbiaGames\Api\Support;

final class JsonResponse
{
    public static function send(array $payload, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function error(string $message, int $status = 400, array $extra = []): never
    {
        self::send([
            'ok' => false,
            'error' => $message,
            'meta' => $extra,
        ], $status);
    }
}
