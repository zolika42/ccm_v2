<?php

declare(strict_types=1);

/**
 * @fileoverview Controller for backend-driven storefront theme selection and admin theme switching.
 */

namespace ColumbiaGames\Api\Controllers;

use ColumbiaGames\Api\Services\StorefrontService;
use ColumbiaGames\Api\Support\JsonResponse;
use ColumbiaGames\Api\Support\Request;
use RuntimeException;

final class StorefrontController
{
    public function __construct(private readonly StorefrontService $storefront)
    {
    }

    public function theme(Request $request): void
    {
        JsonResponse::success($this->storefront->theme(
            $request->query['merchantId'] ?? null,
            $request->query['configId'] ?? null,
        ));
    }

    public function updateTheme(Request $request): void
    {
        try {
            JsonResponse::success($this->storefront->updateTheme($request->body));
        } catch (RuntimeException $e) {
            $message = $e->getMessage();
            if ($message === 'Not authenticated.') {
                JsonResponse::error('unauthorized', $message, 401);
            }
            if (str_contains($message, 'not granted')) {
                JsonResponse::error('forbidden', $message, 403);
            }
            JsonResponse::error('validation_error', $message, 422);
        }
    }
}
