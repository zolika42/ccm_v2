<?php

declare(strict_types=1);

/**
 * @fileoverview Per-request metadata holder: request ID, method/path, and response timing metadata.
 */

namespace ColumbiaGames\Api\Support;

final class RequestContext
{
    private static ?self $current = null;

    public function __construct(
        public readonly string $requestId,
        public readonly string $method,
        public readonly string $path,
        public readonly float $startedAt,
    ) {
    }

    public static function init(Request $request): self
    {
        $incoming = trim((string) ($request->header('x-request-id') ?? ''));
        $requestId = $incoming !== '' ? preg_replace('/[^A-Za-z0-9._-]/', '', $incoming) : null;
        if ($requestId === null || $requestId === '') {
            $requestId = bin2hex(random_bytes(8));
        }

        self::$current = new self($requestId, $request->method, $request->path, microtime(true));
        return self::$current;
    }

    public static function current(): self
    {
        if (self::$current === null) {
            self::$current = new self(bin2hex(random_bytes(8)), 'GET', '/', microtime(true));
        }

        return self::$current;
    }

    /** @param array<string, mixed> $extra */
    public function responseMeta(array $extra = []): array
    {
        return array_merge([
            'requestId' => $this->requestId,
            'method' => $this->method,
            'path' => $this->path,
            'durationMs' => (int) round((microtime(true) - $this->startedAt) * 1000),
        ], $extra);
    }

    public function requestIdHeader(): string
    {
        return $this->requestId;
    }
}
