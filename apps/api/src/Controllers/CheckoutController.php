<?php

declare(strict_types=1);

/**
 * @fileoverview Controller for checkout summary, validation, and submit endpoints.
 */

namespace ColumbiaGames\Api\Controllers;

use ColumbiaGames\Api\Services\CheckoutService;
use ColumbiaGames\Api\Support\CookieBridge;
use ColumbiaGames\Api\Support\JsonResponse;
use ColumbiaGames\Api\Support\Request;

final class CheckoutController
{
    public function __construct(private readonly CheckoutService $checkout)
    {
    }

    public function summary(Request $request): void
    {
        $payload = $this->checkout->summary(CookieBridge::currentBrowserId());
        CookieBridge::persistBrowserId($payload['identity']['browserId']);

        JsonResponse::success($payload['checkout'], 200, [
            'identity' => $payload['identity'],
        ]);
    }

    public function validate(Request $request): void
    {
        $payload = $this->checkout->validate(CookieBridge::currentBrowserId(), $request->body);
        CookieBridge::persistBrowserId($payload['identity']['browserId']);

        JsonResponse::success($payload['checkout'], 200, [
            'identity' => $payload['identity'],
        ]);
    }

    public function submit(Request $request): void
    {
        $payload = $this->checkout->submit(CookieBridge::currentBrowserId(), $request->body);
        CookieBridge::persistBrowserId($payload['identity']['browserId']);

        if (!$payload['submitted']) {
            JsonResponse::error('validation_error', 'Checkout submit failed.', (int) ($payload['status'] ?? 422), [
                'identity' => $payload['identity'],
                'checkout' => $payload['checkout'],
                'submission' => null,
            ]);
        }

        JsonResponse::success([
            'checkout' => $payload['checkout'],
            'submission' => $payload['submission'],
        ], 200, [
            'identity' => $payload['identity'],
        ]);
    }
}
