<?php

declare(strict_types=1);

/**
 * @fileoverview Streams downloadable files or issues safe redirects for legacy library delivery.
 */

namespace ColumbiaGames\Api\Support;

final class DownloadResponse
{
    /** @param array<string, string> $headers */
    public static function streamFile(string $absolutePath, string $downloadName, array $headers = []): never
    {
        if (!is_file($absolutePath) || !is_readable($absolutePath)) {
            JsonResponse::error('download_not_found', 'Download file is not available.', 404);
        }

        $mimeType = self::detectMimeType($absolutePath);
        $size = filesize($absolutePath) ?: 0;

        http_response_code(200);
        header('Content-Type: ' . $mimeType);
        header('Content-Length: ' . (string) $size);
        header('Content-Disposition: attachment; filename="' . addslashes($downloadName) . '"');
        header('X-Request-Id: ' . RequestContext::current()->requestIdHeader());
        header('X-Content-Type-Options: nosniff');
        header('Cache-Control: private, no-store, max-age=0');
        foreach ($headers as $name => $value) {
            header($name . ': ' . $value);
        }
        readfile($absolutePath);
        exit;
    }

    public static function redirect(string $targetUrl): never
    {
        http_response_code(302);
        header('Location: ' . $targetUrl);
        header('X-Request-Id: ' . RequestContext::current()->requestIdHeader());
        exit;
    }

    private static function detectMimeType(string $absolutePath): string
    {
        $type = function_exists('mime_content_type') ? mime_content_type($absolutePath) : false;
        return is_string($type) && $type !== '' ? $type : 'application/octet-stream';
    }
}
