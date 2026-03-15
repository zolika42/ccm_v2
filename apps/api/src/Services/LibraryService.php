<?php

declare(strict_types=1);

/**
 * @fileoverview Library application service for owned-download retrieval.
 */

namespace ColumbiaGames\Api\Services;

use ColumbiaGames\Api\Repositories\LibraryRepository;
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
}
