<?php

declare(strict_types=1);

/**
 * @fileoverview Library application service for owned-download retrieval and legacy delivery bridging.
 */

namespace ColumbiaGames\Api\Services;

use ColumbiaGames\Api\Repositories\LibraryRepository;
use ColumbiaGames\Api\Support\ApiLogger;
use ColumbiaGames\Api\Support\SessionAuth;
use RuntimeException;

final class LibraryService
{
    public function __construct(private readonly LibraryRepository $library)
    {
    }

    public function ownedDownloads(): array
    {
        $user = SessionAuth::user();
        if ($user === null) {
            throw new RuntimeException('Not authenticated.');
        }

        $customerId = (int) ($user['customerid'] ?? 0);
        $items = $this->library->ownedDownloads($customerId);

        return [
            'customerId' => $customerId,
            'items' => $items,
            'meta' => [
                'count' => count($items),
                'hasItems' => count($items) > 0,
                'downloadableCount' => count(array_filter($items, static fn (array $item): bool => (bool) ($item['hasDownloadFile'] ?? false))),
            ],
        ];
    }

    public function resolveDownload(string $productId): array
    {
        $user = SessionAuth::user();
        if ($user === null) {
            return [
                'ok' => false,
                'status' => 401,
                'code' => 'unauthorized',
                'message' => 'Not authenticated.',
            ];
        }

        $customerId = (int) ($user['customerid'] ?? 0);
        $owned = $this->library->findOwnedDownload($customerId, $productId);
        if ($owned === null) {
            ApiLogger::info('library_download_denied', [
                'customerId' => $customerId,
                'productId' => $productId,
                'reason' => 'not_owned_or_not_downloadable',
            ]);
            return [
                'ok' => false,
                'status' => 404,
                'code' => 'download_not_owned',
                'message' => 'The requested download is not owned by the authenticated customer.',
            ];
        }

        $rawFilename = trim((string) ($owned['downloadableFilename'] ?? ''));
        if ($rawFilename === '') {
            ApiLogger::info('library_download_denied', [
                'customerId' => $customerId,
                'productId' => $productId,
                'reason' => 'filename_missing',
            ]);
            return [
                'ok' => false,
                'status' => 409,
                'code' => 'download_file_missing',
                'message' => 'This owned download has no mapped file in the legacy catalog.',
                'details' => [
                    'productId' => $owned['productId'],
                ],
            ];
        }

        $safeFilename = basename($rawFilename);
        if ($safeFilename !== $rawFilename) {
            ApiLogger::error('library_download_denied', [
                'customerId' => $customerId,
                'productId' => $productId,
                'reason' => 'unsafe_filename',
                'filename' => $rawFilename,
            ]);
            return [
                'ok' => false,
                'status' => 409,
                'code' => 'unsafe_download_filename',
                'message' => 'Legacy download filename failed the safety check.',
            ];
        }

        $downloadRoot = trim((string) getenv('LEGACY_DOWNLOAD_ROOT'));
        $downloadBaseUrl = trim((string) getenv('LEGACY_DOWNLOAD_BASE_URL'));

        if ($downloadRoot !== '') {
            $rootPath = realpath($downloadRoot);
            if ($rootPath === false || !is_dir($rootPath)) {
                return [
                    'ok' => false,
                    'status' => 500,
                    'code' => 'download_root_invalid',
                    'message' => 'LEGACY_DOWNLOAD_ROOT is configured but does not resolve to a readable directory.',
                ];
            }

            $candidate = $rootPath . DIRECTORY_SEPARATOR . $safeFilename;
            $resolvedFile = realpath($candidate);
            if ($resolvedFile === false || !is_file($resolvedFile) || !is_readable($resolvedFile) || !str_starts_with($resolvedFile, $rootPath . DIRECTORY_SEPARATOR)) {
                ApiLogger::info('library_download_denied', [
                    'customerId' => $customerId,
                    'productId' => $productId,
                    'reason' => 'file_not_found',
                    'filename' => $safeFilename,
                ]);
                return [
                    'ok' => false,
                    'status' => 404,
                    'code' => 'download_not_found',
                    'message' => 'The mapped download file is not present under LEGACY_DOWNLOAD_ROOT.',
                    'details' => [
                        'filename' => $safeFilename,
                    ],
                ];
            }

            ApiLogger::info('library_download_ready', [
                'customerId' => $customerId,
                'productId' => $productId,
                'mode' => 'stream',
                'filename' => $safeFilename,
            ]);

            return [
                'ok' => true,
                'mode' => 'stream',
                'downloadName' => $safeFilename,
                'filePath' => $resolvedFile,
                'customerId' => $customerId,
                'item' => $owned,
            ];
        }

        if ($downloadBaseUrl !== '') {
            $targetUrl = rtrim($downloadBaseUrl, '/') . '/' . rawurlencode($safeFilename);
            ApiLogger::info('library_download_ready', [
                'customerId' => $customerId,
                'productId' => $productId,
                'mode' => 'redirect',
                'targetUrl' => $targetUrl,
            ]);

            return [
                'ok' => true,
                'mode' => 'redirect',
                'targetUrl' => $targetUrl,
                'downloadName' => $safeFilename,
                'customerId' => $customerId,
                'item' => $owned,
            ];
        }

        return [
            'ok' => false,
            'status' => 500,
            'code' => 'download_bridge_unconfigured',
            'message' => 'No legacy download bridge is configured. Set LEGACY_DOWNLOAD_ROOT or LEGACY_DOWNLOAD_BASE_URL.',
        ];
    }
}
