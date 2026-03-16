<?php

declare(strict_types=1);

/**
 * @fileoverview Controller for authenticated wishlist summary and wishlist item mutations.
 */

namespace ColumbiaGames\Api\Controllers;

use ColumbiaGames\Api\Services\WishlistService;
use ColumbiaGames\Api\Support\JsonResponse;
use ColumbiaGames\Api\Support\Request;
use RuntimeException;

final class WishlistController
{
    public function __construct(private readonly WishlistService $wishlists)
    {
    }

    public function index(Request $request): void
    {
        try {
            JsonResponse::success($this->wishlists->summary());
        } catch (RuntimeException $e) {
            $status = str_contains($e->getMessage(), 'authenticated') || str_contains($e->getMessage(), 'Not authenticated') ? 401 : 422;
            JsonResponse::error($status === 401 ? 'unauthorized' : 'validation_error', $e->getMessage(), $status);
        }
    }

    public function addItem(Request $request): void
    {
        try {
            JsonResponse::success($this->wishlists->add($request->body));
        } catch (RuntimeException $e) {
            $status = str_contains($e->getMessage(), 'authenticated') || str_contains($e->getMessage(), 'Not authenticated') ? 401 : 422;
            JsonResponse::error($status === 401 ? 'unauthorized' : 'validation_error', $e->getMessage(), $status);
        }
    }

    /** @param array<string, string> $params */
    public function replaceItem(Request $request, array $params): void
    {
        try {
            JsonResponse::success($this->wishlists->replace((string) ($params['productId'] ?? ''), $request->body));
        } catch (RuntimeException $e) {
            $status = str_contains($e->getMessage(), 'authenticated') || str_contains($e->getMessage(), 'Not authenticated') ? 401 : 422;
            JsonResponse::error($status === 401 ? 'unauthorized' : 'validation_error', $e->getMessage(), $status);
        }
    }

    /** @param array<string, string> $params */
    public function removeItem(Request $request, array $params): void
    {
        try {
            JsonResponse::success($this->wishlists->remove((string) ($params['productId'] ?? '')));
        } catch (RuntimeException $e) {
            $status = str_contains($e->getMessage(), 'authenticated') || str_contains($e->getMessage(), 'Not authenticated') ? 401 : 422;
            JsonResponse::error($status === 401 ? 'unauthorized' : 'validation_error', $e->getMessage(), $status);
        }
    }
}
