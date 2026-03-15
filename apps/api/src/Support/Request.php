<?php

declare(strict_types=1);

/**
 * @fileoverview HTTP request value object parsed from PHP globals.
 */

namespace ColumbiaGames\Api\Support;

final class Request
{
    /** @param array<string, string> $headers */
    public function __construct(
        public readonly string $method,
        public readonly string $path,
        public readonly array $query,
        public readonly array $headers,
        public readonly array $body,
    ) {
    }

    public static function fromGlobals(): self
    {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        $path = parse_url($uri, PHP_URL_PATH) ?: '/';
        $rawHeaders = function_exists('getallheaders') ? getallheaders() : [];
        $headers = [];
        foreach ($rawHeaders as $key => $value) {
            $headers[strtolower((string) $key)] = (string) $value;
        }
        $query = $_GET ?? [];

        $raw = file_get_contents('php://input') ?: '';
        $decoded = [];
        if ($raw !== '') {
            $json = json_decode($raw, true);
            if (is_array($json)) {
                $decoded = $json;
            } else {
                parse_str($raw, $decoded);
            }
        }

        return new self($method, $path, $query, $headers, $decoded);
    }

    public function header(string $name): ?string
    {
        return $this->headers[strtolower($name)] ?? null;
    }
}
