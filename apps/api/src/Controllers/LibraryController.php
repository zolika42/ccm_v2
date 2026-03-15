<?php

declare(strict_types=1);

/**
 * @fileoverview Controller for the authenticated digital library endpoint.
 */

namespace ColumbiaGames\Api\Controllers;

use ColumbiaGames\Api\Services\LibraryService;
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
}
