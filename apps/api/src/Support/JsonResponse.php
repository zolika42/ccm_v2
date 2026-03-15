<?php

declare(strict_types=1);

namespace ColumbiaGames\Api\Support;

final class JsonResponse
{
    /** @param array<string, mixed> $meta */
    public static function success(mixed $data = null, int $status = 200, array $meta = []): never
    {
        self::send([
            'ok' => true,
            'data' => $data,
            'meta' => RequestContext::current()->responseMeta($meta),
        ], $status);
    }

    /** @param array<string, mixed> $details
     *  @param array<string, mixed> $meta
     */
    public static function error(string $code, string $message, int $status = 400, array $details = [], array $meta = []): never
    {
        ApiLogger::error('api_error', [
            'status' => $status,
            'code' => $code,
            'message' => $message,
            'details' => $details,
        ]);

        self::send([
            'ok' => false,
            'error' => [
                'code' => $code,
                'message' => $message,
                'details' => $details,
            ],
            'meta' => RequestContext::current()->responseMeta($meta),
        ], $status);
    }

    /** @param array<string, mixed> $payload */
    public static function send(array $payload, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('X-Request-Id: ' . RequestContext::current()->requestIdHeader());
        echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        exit;
    }
}
