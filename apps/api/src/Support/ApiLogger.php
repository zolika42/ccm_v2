<?php

declare(strict_types=1);

/**
 * @fileoverview Small logging helper used by the API entrypoint and response layer.
 */

namespace ColumbiaGames\Api\Support;

use Throwable;

final class ApiLogger
{
    /** @param array<string, mixed> $context */
    public static function info(string $event, array $context = []): void
    {
        self::write('info', $event, $context);
    }

    /** @param array<string, mixed> $context */
    public static function error(string $event, array $context = []): void
    {
        self::write('error', $event, $context);
    }

    public static function exception(Throwable $throwable): void
    {
        self::write('error', 'uncaught_exception', [
            'exception' => $throwable::class,
            'message' => $throwable->getMessage(),
            'file' => $throwable->getFile(),
            'line' => $throwable->getLine(),
        ]);
    }

    /** @param array<string, mixed> $context */
    private static function write(string $level, string $event, array $context = []): void
    {
        $ctx = RequestContext::current();
        $payload = [
            'level' => $level,
            'event' => $event,
            'requestId' => $ctx->requestId,
            'method' => $ctx->method,
            'path' => $ctx->path,
            'context' => $context,
        ];

        error_log((string) json_encode($payload, JSON_UNESCAPED_SLASHES));
    }
}
