<?php

declare(strict_types=1);

/**
 * @fileoverview Controller for authenticated digital-library listing and legacy download delivery.
 */

namespace ColumbiaGames\Api\Controllers;

use ColumbiaGames\Api\Services\LibraryService;
use ColumbiaGames\Api\Support\DownloadResponse;
use ColumbiaGames\Api\Support\JsonResponse;
use ColumbiaGames\Api\Support\Request;
use RuntimeException;

final class LibraryController
{
    public function __construct(private readonly LibraryService $library)
    {
    }

    public function index(Request $request): void
    {
        try {
            JsonResponse::success($this->library->ownedDownloads());
        } catch (RuntimeException $e) {
            JsonResponse::error('unauthorized', $e->getMessage(), 401);
        }
    }

    /** @param array<string, string> $params */
    public function download(Request $request, array $params): void
    {
        $productId = trim((string) ($params['productId'] ?? ''));
        if ($productId === '') {
            JsonResponse::error('validation_error', 'Product ID is required.', 422);
        }

        $resolution = $this->library->resolveDownload($productId);
        if (!($resolution['ok'] ?? false)) {
            JsonResponse::error(
                (string) ($resolution['code'] ?? 'download_error'),
                (string) ($resolution['message'] ?? 'Download failed.'),
                (int) ($resolution['status'] ?? 400),
                (array) ($resolution['details'] ?? []),
            );
        }

        if (($resolution['mode'] ?? '') === 'redirect') {
            DownloadResponse::redirect((string) $resolution['targetUrl']);
        }

        DownloadResponse::streamFile(
            (string) $resolution['filePath'],
            (string) ($resolution['downloadName'] ?? basename((string) $resolution['filePath'])),
            [
                'X-Legacy-Download-Bridge' => 'stream',
            ],
        );
    }
}
